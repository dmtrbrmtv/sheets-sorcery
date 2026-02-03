// ===== Sheets & Sorcery: Actions =====
// Combat is a MODE: turn-based, 1 click = 1 turn. Same-tile only.
// TODO (placeholders): Hammer knock out, Trident/Bow pre-battle hit, Bow weapon switching — see GAME_RULES.md

import { CFG } from "./config.js";
import {
	buildVisibleSet,
	getTileAt,
	isInVillage,
	moveAnimals,
	moveHunters,
	moveNpcs,
	setTileAt,
	spawnNewEnemies,
} from "./gameState.js";
import { logSpend, processHomeDay } from "./home.js";
import { a1ToXY, dirToDelta, randInt } from "./utils.js";

const TOTAL_STEPS = 50;

// stepIndex 0..49 internally. stepInDay = stepIndex + 1 for display.
// Phase: 0..19 Day, 20..29 Dusk, 30..39 Night, 40..49 Dawn
export function getPhaseFromStepIndex(stepIndex) {
	const s = Math.max(0, Math.min(49, stepIndex ?? 0));
	if (s < 20) return "day";
	if (s < 30) return "dusk";
	if (s < 40) return "night";
	return "dawn";
}

export function getTimeState(state) {
	const stepIndex = Math.max(0, Math.min(49, state.dayStep ?? 0));
	const dayNumber = state.dayNumber ?? state.day ?? 1;
	const stepInDay = stepIndex + 1;
	const dayStepsLeft = Math.max(0, TOTAL_STEPS - (stepIndex + 1));
	return {
		dayNumber,
		stepIndex,
		stepInDay,
		phase: getPhaseFromStepIndex(stepIndex),
		dayStepsLeft,
		totalSteps: TOTAL_STEPS,
	};
}

/** Single source of truth: advances time. NEVER blocks.
 *  stepIndex 0..49. When >= 50: day++, stepIndex=0, new day effects. */
export function advanceTurn(state) {
	let stepIndex = (state.dayStep ?? 0) + 1;
	if (stepIndex >= TOTAL_STEPS) {
		newDay(state);
		stepIndex = 0;
	}
	state.dayStep = stepIndex;
	tickStatusEffects(state);
}

function addHistory(state, who, got, what, mapInfo, timerInfo, opts = {}) {
	const moveInDay = opts.moveInDay ?? state.dayStep ?? 0;
	state.history.unshift({
		day: state.dayNumber ?? state.day ?? 1,
		moveInDay,
		who,
		got: got || "",
		what: what || "",
		mapInfo: mapInfo || "",
		timerInfo: timerInfo || "",
		when: new Date().toISOString(),
	});
	if (state.history.length > 200) state.history.pop();
}

function hasTimerAt(state, x, y) {
	return (state.timers || []).some((t) => t.x === x && t.y === y && t.daysLeft > 0);
}

export function canChopWood(state) {
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (!tile || !CFG.RESOURCES.WOOD_TILES.has(tile)) return false;
	if (tile === CFG.RESOURCES.WOOD_DEPLETED && hasTimerAt(state, p.x, p.y)) return false;
	return true;
}

export function canQuarry(state) {
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (!tile || !CFG.RESOURCES.STONE_TILES.has(tile)) return false;
	if (tile === CFG.RESOURCES.STONE_DEPLETED && hasTimerAt(state, p.x, p.y)) return false;
	return true;
}

export function canHunt(state) {
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	const animal = (state.animals || []).find((a) => a.x === p.x && a.y === p.y);
	const huntable = animal ? animal.emoji || "🐇" : tile;
	return !!(huntable && CFG.RESOURCES.HUNT_TILES.has(huntable));
}

export function canFish(state) {
	const p = state.player;
	const near = [
		getTileAt(state.world, p.x + 1, p.y, state),
		getTileAt(state.world, p.x - 1, p.y, state),
		getTileAt(state.world, p.x, p.y + 1, state),
		getTileAt(state.world, p.x, p.y - 1, state),
	].filter(Boolean);
	return near.some((t) => t === "🌊");
}

function addTimer(state, x, y, restoreTile, days, reason) {
	state.timers.push({ x, y, restoreTile, daysLeft: days, reason: reason || "regen" });
}

function tickTimers(state) {
	const timers = state.timers || [];
	const keep = [];
	for (const t of timers) {
		t.daysLeft = (t.daysLeft ?? 0) - 1;
		if (t.daysLeft <= 0) {
			if (t.x > 0 && t.y > 0 && t.restoreTile) {
				setTileAt(state.world, t.x, t.y, t.restoreTile, state);
			}
		} else {
			keep.push(t);
		}
	}
	state.timers = keep;
}

function hasItem(state, itemEmoji) {
	return (state.player.items || []).includes(itemEmoji);
}

export function countItem(state, itemEmoji) {
	return (state.player.items || []).filter((i) => i === itemEmoji).length;
}

function getWoodBonus(state) {
	return (state.player.items || []).includes("🪓") ? 1 : 0;
}

function getStoneBonus(state) {
	return (state.player.items || []).includes("⛏️") ? 1 : 0;
}

const NO_SHIELD_WEAPONS = new Set(["⚔️", "⚒️", "🔱"]);

export function getEffectiveAtk(state) {
	const base = state.player.atk ?? 2;
	const items = state.player.items || [];
	const weaponBonus = Math.max(
		0,
		...items.map((i) => {
			const s = CRAFT_SPECS.find((spec) => spec.item === i);
			return s?.stat?.atk || 0;
		}),
	);
	return base + weaponBonus;
}

export function getEffectiveArmor(state) {
	const base = state.player.armor ?? 1;
	const items = state.player.items || [];
	const hasNoShieldWeapon = items.some((i) => NO_SHIELD_WEAPONS.has(i));
	let armorBonus = 0;
	for (const i of items) {
		const s = CRAFT_SPECS.find((spec) => spec.item === i);
		const a = s?.stat?.armor || 0;
		if (a > 0 && s?.isShield && hasNoShieldWeapon) continue;
		armorBonus = Math.max(armorBonus, a);
	}
	return base + armorBonus;
}

function addResource(state, key, delta) {
	state.player[key] = (state.player[key] || 0) + delta;
	if (delta > 0) advanceQuestProgress(state, key, delta);
}

function advanceQuestProgress(state, resource, amount) {
	const quests = [...(state.activeQuests || [])];
	for (const q of quests) {
		const def = CFG.QUESTS?.[q.id];
		if (!def?.objectives || !(resource in def.objectives)) continue;
		q.progress = q.progress || {};
		q.progress[resource] = (q.progress[resource] || 0) + amount;
		const allMet = Object.entries(def.objectives).every(([k, need]) => (q.progress[k] || 0) >= need);
		if (allMet) completeQuest(state, q);
	}
}

function completeQuest(state, quest) {
	const def = CFG.QUESTS?.[quest.id];
	if (!def) return;
	state.activeQuests = (state.activeQuests || []).filter((q) => q.id !== quest.id);
	state.completedQuests = (state.completedQuests || []).concat(quest.id);
	const reward = def.reward || {};
	if (reward.gold) addResource(state, "gold", reward.gold);
	addHistory(state, "📜", `✅ ${def.name}`, `Квест выполнен! +${reward.gold || 0}💰`, "", "", { moveInDay: 0 });
}

function addStatusEffect(state, type, duration) {
	const p = state.player;
	p.statusEffects = p.statusEffects || [];
	const existing = p.statusEffects.find((e) => e.type === type);
	if (existing) existing.duration = Math.max(existing.duration, duration);
	else p.statusEffects.push({ type, duration });
}

function tickStatusEffects(state) {
	const p = state.player;
	p.statusEffects = p.statusEffects || [];
	const specs = CFG.STATUS_EFFECTS || {};
	p.statusEffects = p.statusEffects.flatMap((e) => {
		const spec = specs[e.type];
		if (!spec) return [];
		if (spec.dmg) {
			const newHp = Math.max(0, (p.hp || 1) - spec.dmg);
			p.hp = newHp;
			addHistory(state, p.name, `❤️-${spec.dmg}`, `${spec.icon} ${spec.name}`, `HP:${newHp}/${p.maxhp}`, "");
			if (newHp <= 0) handleDeath(state);
		}
		e.duration--;
		return e.duration > 0 ? [e] : [];
	});
}

function hasStatusEffect(state, type) {
	return (state.player.statusEffects || []).some((e) => e.type === type);
}

function isNight(state) {
	const phase = getPhaseFromStepIndex(state.dayStep ?? 0);
	return phase === "night" || phase === "dusk";
}

function handleDeath(state) {
	const p = state.player;
	const hosp = a1ToXY(CFG.RESPAWN.hospitalA1) || { x: 4, y: 7 };
	p.hp = p.maxhp || 10;
	p.x = hosp.x;
	p.y = hosp.y;
	p.statusEffects = [];
	state.combat = null;
	addHistory(state, p.name, "☠️", `Погиб → 🏥 (полное воскрешение)`, "", "");
}

// --- Enemy on same tile (village = safe zone, no combat) ---
export function getEnemyOnTile(state) {
	const p = state.player;
	if (isInVillage(p.x, p.y)) return null;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (tile === CFG.ZOMBIE?.aliveTile) return { type: "zombie", x: p.x, y: p.y };
	const npc = (state.npcs || []).find((n) => n.x === p.x && n.y === p.y);
	if (npc) return { type: "npc", target: npc };
	const animal = (state.animals || []).find((a) => a.x === p.x && a.y === p.y);
	if (animal) return { type: "animal", target: animal };
	return null;
}

export function getVillagerOnTile(state) {
	const p = state.player;
	return (state.villagers || []).find((v) => v.x === p.x && v.y === p.y) || null;
}

export function doTalk(state) {
	const villager = getVillagerOnTile(state);
	if (!villager) {
		addHistory(state, state.player.name, "", "Некого слушать", "", "");
		return false;
	}
	const spec = CFG.VILLAGERS?.[villager.emoji];
	const dialog = spec?.dialog || villager.dialog || "…";
	addHistory(state, villager.emoji, "", `${villager.name}: «${dialog}»`, "", "");
	const isQuestGiver = villager.role === "quest" || villager.emoji === "🧙‍♂️";
	if (isQuestGiver && CFG.QUESTS) {
		const available = Object.entries(CFG.QUESTS).filter(([id]) => {
			const active = (state.activeQuests || []).some((q) => q.id === id);
			return !active;
		});
		if (available.length) {
			const [id, def] = available[Math.floor(Math.random() * available.length)];
			state.activeQuests = (state.activeQuests || []).concat([{ id, progress: {} }]);
			addHistory(state, "📜", "", `Получен квест: ${def.name}`, "", "");
		} else {
			addHistory(state, "📜", "", "Все квесты уже взяты. Выполните один, чтобы получить новый.", "", "");
		}
	}
	return true;
}

export function isInCombat(state) {
	return !!state.combat;
}

function startCombat(state) {
	const enemy = getEnemyOnTile(state);
	if (!enemy) return false;
	if (state.combat) return true;

	const c = { ...enemy };
	if (enemy.type === "zombie") {
		c.hp = CFG.ZOMBIE.hp ?? 6;
	} else if (enemy.target) {
		const spec = enemy.type === "npc" ? CFG.NPCS?.[enemy.target.emoji] : CFG.ANIMALS?.[enemy.target.type];
		enemy.target.hp = enemy.target.hp ?? spec?.hp ?? 4;
	}

	state.combat = c;
	state.combatLog = [];
	const enemyName =
		c.type === "zombie"
			? "Зомби"
			: c.type === "npc"
				? CFG.NPCS?.[c.target.emoji]?.name || c.target.emoji
				: CFG.ANIMALS?.[c.target.type]?.name || c.target.emoji;
	addCombatLog(state, `⚔️ Бой с ${enemyName}!`);

	const spec =
		enemy.type === "npc"
			? CFG.NPCS?.[enemy.target.emoji]
			: enemy.type === "animal"
				? CFG.ANIMALS?.[enemy.target.type]
				: null;
	if (spec?.attacksFirst) {
		doEnemyHit(state, true);
		if (state.player.hp <= 0) return true;
	}
	return true;
}

function endCombat(state) {
	state.combat = null;
	state.combatLog = state.combatLog || [];
}

function addCombatLog(state, text) {
	state.combatLog = state.combatLog || [];
	state.combatLog.unshift(text);
	if (state.combatLog.length > 20) state.combatLog.pop();
}

function rollLoot(spec, _emoji) {
	const loot = spec?.loot || {};
	const got = [];
	if (loot.gold) {
		const [min, max] = loot.gold;
		const g = randInt(min || 0, max || 0);
		if (g > 0) got.push({ type: "gold", val: g });
	}
	if (loot.food) {
		const [min, max] = loot.food;
		const f = randInt(min || 0, max || 0);
		if (f > 0) got.push({ type: "food", val: f });
	}
	if (loot.special && Math.random() < loot.special) {
		const items = CFG.LOOT_SPECIAL || ["💉", "🧪", "🌿"];
		got.push({ type: "item", val: items[randInt(0, items.length - 1)] });
	}
	return got;
}

function doEnemyHit(state, defending) {
	const p = state.player;
	const c = state.combat;
	if (!c) return;

	if (hasItem(state, "💍") && Math.random() < 0.2) {
		addHistory(state, p.name, "", "💍 Увернулся!", "", "");
		addCombatLog(state, "💍 Увернулся!");
		return;
	}

	let dmg = 0;
	let emoji = "?";
	let effectChance = {};

	if (c.type === "zombie") {
		if (Math.random() >= (CFG.ZOMBIE.accuracy ?? 0.7)) return;
		dmg = randInt(CFG.ZOMBIE.atk ?? 1, CFG.ZOMBIE.atkMax ?? 2);
		if (isNight(state)) dmg += 1;
		emoji = "🧟";
	} else if (c.type === "npc") {
		const spec = CFG.NPCS?.[c.target.emoji];
		dmg = Math.max(1, (spec?.atk ?? 1) - getEffectiveArmor(state));
		emoji = c.target.emoji;
		effectChance = spec?.effectOnHit || {};
	} else if (c.type === "animal") {
		const spec = CFG.ANIMALS?.[c.target.type];
		dmg = Math.max(1, (spec?.atk ?? 1) - getEffectiveArmor(state));
		emoji = c.target.emoji;
		effectChance = spec?.effectOnHit || {};
	}

	if (defending) dmg = Math.max(1, Math.floor(dmg * 0.5));
	const newHp = Math.max(0, (p.hp || 1) - dmg);
	p.hp = newHp;
	const effText = defending ? " (защита -50%)" : "";
	addHistory(state, p.name, `❤️-${dmg} (HP:${newHp}/${p.maxhp})`, `${emoji} ударил${effText}`, "", "");
	addCombatLog(state, `${emoji} ударил на ${dmg} (HP: ${newHp}/${p.maxhp})${effText}`);

	for (const [eff, chance] of Object.entries(effectChance)) {
		if (Math.random() < chance) {
			addStatusEffect(state, eff, CFG.STATUS_EFFECTS?.[eff]?.duration ?? 2);
			const spec = CFG.STATUS_EFFECTS?.[eff];
			if (spec) addCombatLog(state, `${spec.icon} ${spec.name} применён`);
		}
	}
	if (newHp <= 0) handleDeath(state);
}

function killZombie(state) {
	const c = state.combat;
	if (c.type !== "zombie") return;
	const p = state.player;
	setTileAt(state.world, c.x, c.y, CFG.ZOMBIE.graveTile, state);
	addTimer(state, c.x, c.y, CFG.ZOMBIE.aliveTile, CFG.ZOMBIE.respawnDays, "zombie");
	const gold = randInt(CFG.ZOMBIE.goldMin, CFG.ZOMBIE.goldMax);
	addResource(state, "gold", gold);
	let item = "";
	if (Math.random() < CFG.ZOMBIE.itemChance) {
		item = CFG.ZOMBIE.lootItems[randInt(0, CFG.ZOMBIE.lootItems.length - 1)];
		(p.items = p.items || []).push(item);
	}
	const got = item ? `💰+${gold} 🎁${item}` : `💰+${gold}`;
	addHistory(
		state,
		p.name,
		got,
		`⚔️ Убил 🧟 → ${CFG.ZOMBIE.graveTile}`,
		`❤️ ${p.hp}/${p.maxhp}`,
		`⏱️${CFG.ZOMBIE.respawnDays}`,
	);
	addCombatLog(state, `⚔️ Зомби побеждён! ${got}`);
	endCombat(state);
}

function killNpc(state) {
	const c = state.combat;
	if (c.type !== "npc") return;
	const p = state.player;
	const spec = CFG.NPCS?.[c.target.emoji];
	state.npcs = (state.npcs || []).filter((n) => !(n.x === c.target.x && n.y === c.target.y));
	const loot = rollLoot(spec, c.target.emoji);
	loot.forEach((l) => {
		if (l.type === "gold") {
			addResource(state, "gold", l.val);
		}
		if (l.type === "food") {
			addResource(state, "food", l.val);
		}
		if (l.type === "item") {
			(p.items = p.items || []).push(l.val);
		}
	});
	const parts = loot.map((l) => (l.type === "gold" ? `💰+${l.val}` : l.type === "food" ? `🍖+${l.val}` : `🎁${l.val}`));
	addHistory(state, p.name, parts.join(" ") || "—", `⚔️ Убил ${c.target.emoji}`, `❤️ ${p.hp}/${p.maxhp}`, "");
	addCombatLog(state, `⚔️ ${c.target.emoji} побеждён! ${parts.join(" ") || ""}`);
	endCombat(state);
}

function killAnimal(state) {
	const c = state.combat;
	if (c.type !== "animal") return;
	const p = state.player;
	const spec = CFG.ANIMALS?.[c.target.type];
	state.animals = (state.animals || []).filter((a) => !(a.x === c.target.x && a.y === c.target.y));
	const loot = rollLoot(spec, c.target.emoji);
	loot.forEach((l) => {
		if (l.type === "gold") {
			addResource(state, "gold", l.val);
		}
		if (l.type === "food") {
			addResource(state, "food", l.val);
		}
		if (l.type === "item") {
			(p.items = p.items || []).push(l.val);
		}
	});
	const parts = loot.map((l) => (l.type === "gold" ? `💰+${l.val}` : l.type === "food" ? `🍖+${l.val}` : `🎁${l.val}`));
	addHistory(state, p.name, parts.join(" ") || "—", `⚔️ Убил ${c.target.emoji}`, `❤️ ${p.hp}/${p.maxhp}`, "");
	addCombatLog(state, `⚔️ ${c.target.emoji} побеждён! ${parts.join(" ") || ""}`);
	endCombat(state);
}

export function combatTurn(state, action) {
	if (!state.combat) return false;
	const p = state.player;
	const c = state.combat;

	if (action === "run") {
		const escaped = Math.random() < 0.5;
		if (escaped) {
			addHistory(state, p.name, "", "🏃 Сбежал!", "", "");
			addCombatLog(state, "🏃 Сбежал!");
			endCombat(state);
			return true;
		}
		addHistory(state, p.name, "", "🏃 Не удалось сбежать", "", "");
		addCombatLog(state, "🏃 Не удалось сбежать!");
		doEnemyHit(state, false);
		return true;
	}

	const defending = action === "defend";

	let pDmg = getEffectiveAtk(state);
	if (hasStatusEffect(state, "fear") && Math.random() < 0.5) pDmg = 0;

	if (c.type === "zombie") {
		if (pDmg > 0) {
			c.hp -= pDmg;
			addHistory(state, p.name, `⚔️ -${pDmg}`, `Удар по 🧟 (HP:${c.hp}/${CFG.ZOMBIE.hp})`, "", "");
			addCombatLog(state, `⚔️ Вы ударили 🧟 на ${pDmg} (HP зомби: ${c.hp}/${CFG.ZOMBIE.hp})`);
		}
		if (c.hp <= 0) {
			killZombie(state);
			return true;
		}
	} else if (c.type === "npc") {
		const spec = CFG.NPCS?.[c.target.emoji];
		const dodge = (spec?.dodgeChance ?? 0) > 0 && Math.random() < spec.dodgeChance;
		if (pDmg > 0 && !dodge) {
			c.target.hp -= pDmg;
			const maxHp = spec?.hp ?? 4;
			addHistory(state, p.name, `⚔️ -${pDmg}`, `Удар по ${c.target.emoji} (HP:${c.target.hp}/${maxHp})`, "", "");
			addCombatLog(state, `⚔️ Вы ударили ${c.target.emoji} на ${pDmg} (HP: ${c.target.hp}/${maxHp})`);
		} else if (dodge) {
			addHistory(state, p.name, "", `${c.target.emoji} увернулся!`, "", "");
			addCombatLog(state, `${c.target.emoji} увернулся!`);
		}
		if (c.target.hp <= 0) {
			killNpc(state);
			return true;
		}
	} else if (c.type === "animal") {
		const spec = CFG.ANIMALS?.[c.target.type];
		const maxHp = spec?.hp ?? 3;
		if (pDmg > 0) {
			c.target.hp -= pDmg;
			addHistory(state, p.name, `⚔️ -${pDmg}`, `Удар по ${c.target.emoji} (HP:${c.target.hp}/${maxHp})`, "", "");
			addCombatLog(state, `⚔️ Вы ударили ${c.target.emoji} на ${pDmg} (HP: ${c.target.hp}/${maxHp})`);
		}
		if (c.target.hp <= 0) {
			killAnimal(state);
			return true;
		}
	}

	doEnemyHit(state, defending);
	return true;
}

export function move(state, dir) {
	const delta = dirToDelta(dir);
	if (!delta) return false;

	const p = state.player;
	if (state.combat) return false;

	const nx = p.x + delta.dx;
	const ny = p.y + delta.dy;
	const tile = getTileAt(state.world, nx, ny, state);

	if (tile === null) {
		addHistory(state, p.name, "🧱", `Граница (${nx},${ny})`, "", "");
		return true;
	}
	const hasBoat = (p.items || []).includes("⛵");
	const hasRope = (p.items || []).includes("🪢");
	const isRocky = CFG.ROCKY_TILES?.has(tile);
	const blocked = (CFG.BLOCKED.has(tile) && !(isRocky && hasRope)) || (tile === "🌊" && !hasBoat);
	if (blocked) {
		addHistory(state, p.name, tile, `Непроходимо (${nx},${ny})`, "", "");
		return true;
	}

	p.x = nx;
	p.y = ny;
	const visible = buildVisibleSet(p);
	visible.forEach((k) => state.revealed.add(k));
	addHistory(state, p.name, `👣 ${tile}`, `→ (${nx},${ny})`, "", "");

	const npc = (state.npcs || []).find((n) => n.x === nx && n.y === ny);
	const animal = (state.animals || []).find((a) => a.x === nx && a.y === ny);
	const hasEnemy = tile === CFG.ZOMBIE?.aliveTile || npc || animal;

	if (hasEnemy) {
		startCombat(state);
	}

	return true;
}

export function doChopWood(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (!tile || !CFG.RESOURCES.WOOD_TILES.has(tile)) {
		addHistory(state, p.name, "🪵0", "Рубка только на 🌳/🌲/🌿/🌱", "", "");
		return false;
	}
	if (tile === CFG.RESOURCES.WOOD_DEPLETED && hasTimerAt(state, p.x, p.y)) {
		addHistory(state, p.name, "⏳", "Пень отдыхает", "", "");
		return false;
	}
	const bonus = getWoodBonus(state);
	const gained = 1 + bonus;
	addResource(state, "wood", gained);
	if (Math.random() < 0.4) addResource(state, "herb", 1);
	const nextTile = tile === "🌳" || tile === "🌲" ? "🌿" : tile === "🌿" ? "🌱" : "🌱";
	setTileAt(state.world, p.x, p.y, nextTile, state);
	if (!hasTimerAt(state, p.x, p.y)) addTimer(state, p.x, p.y, CFG.RESOURCES.WOOD_REGEN_TO, CFG.REGEN_DAYS.wood, "wood");
	const toolIcon = bonus ? "🪓" : "";
	addHistory(
		state,
		p.name,
		`🪵+${gained}${toolIcon ? ` (${toolIcon})` : ""}`,
		`${tile}→${nextTile}`,
		"",
		`⏱️${CFG.REGEN_DAYS.wood}`,
	);
	return true;
}

export function doQuarry(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (!tile || !CFG.RESOURCES.STONE_TILES.has(tile)) {
		addHistory(state, p.name, "🪨0", "Каменоломня только на 🗻/🪨/🧱", "", "");
		return false;
	}
	if (tile === CFG.RESOURCES.STONE_DEPLETED && hasTimerAt(state, p.x, p.y)) {
		addHistory(state, p.name, "⏳", "Шахта отдыхает", "", "");
		return false;
	}
	const bonus = getStoneBonus(state);
	const gained = 1 + bonus;
	addResource(state, "stone", gained);
	const nextTile = tile === "🗻" ? "🪨" : tile === "🪨" ? "🧱" : tile === "🧱" ? "🕳️" : "🕳️";
	setTileAt(state.world, p.x, p.y, nextTile, state);
	if (!hasTimerAt(state, p.x, p.y))
		addTimer(state, p.x, p.y, CFG.RESOURCES.STONE_REGEN_TO, CFG.REGEN_DAYS.stone, "stone");
	const toolIcon = bonus ? "⛏️" : "";
	addHistory(
		state,
		p.name,
		`🪨+${gained}${toolIcon ? ` (${toolIcon})` : ""}`,
		`${tile}→${nextTile}`,
		"",
		`⏱️${CFG.REGEN_DAYS.stone}`,
	);
	return true;
}

export function doHunt(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	const animal = (state.animals || []).find((a) => a.x === p.x && a.y === p.y);
	const huntable = animal ? animal.emoji || "🐇" : tile;
	if (!huntable || !CFG.RESOURCES.HUNT_TILES.has(huntable)) {
		addHistory(state, p.name, "🍖0", "Охота только на 🦌/🐗/🐇", "", "");
		return false;
	}
	const gained = randInt(1, 2);
	addResource(state, "food", gained);
	if (animal) state.animals = state.animals.filter((a) => !(a.x === p.x && a.y === p.y));
	else {
		setTileAt(state.world, p.x, p.y, "⬜️", state);
		addTimer(state, p.x, p.y, huntable, CFG.REGEN_DAYS.hunt, "hunt");
	}
	addHistory(state, p.name, `🍖+${gained}`, `${huntable}→⬜️`, "", animal ? "" : `⏱️${CFG.REGEN_DAYS.hunt}`);
	return true;
}

export function doFish(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const near = [
		getTileAt(state.world, p.x + 1, p.y),
		getTileAt(state.world, p.x - 1, p.y),
		getTileAt(state.world, p.x, p.y + 1),
		getTileAt(state.world, p.x, p.y - 1),
	].filter(Boolean);
	if (!near.some((t) => t === "🌊")) {
		addHistory(state, p.name, "🐟0", "Рыбалка только рядом с 🌊", "", "");
		return false;
	}
	const gained = randInt(0, 2);
	addResource(state, "fish", gained);
	addHistory(state, p.name, `🐟+${gained}`, "🎣", "", "");
	return true;
}

export function portalHome(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const home = CFG.BUILD?.HOME_POSITION || { x: 3, y: 9 };
	if (p.x === home.x && p.y === home.y) return false;
	p.x = home.x;
	p.y = home.y;
	buildVisibleSet(p).forEach((k) => state.revealed.add(k));
	addHistory(state, p.name, "🌀", `Портал → дом (${home.x},${home.y})`, "", "");
	return true;
}

export function useConsumable(state, itemEmoji) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const spec = CRAFT_SPECS.find((s) => s.item === itemEmoji);
	if (!spec?.consumable || !spec.heal) return false;
	const idx = (p.items || []).indexOf(itemEmoji);
	if (idx < 0) return false;
	p.items.splice(idx, 1);
	const newHp = Math.min(p.maxhp || 10, (p.hp || 1) + spec.heal);
	p.hp = newHp;
	addHistory(state, p.name, `❤️+${spec.heal}`, `${itemEmoji} использован`, `HP:${newHp}/${p.maxhp}`, "");
	return true;
}

export function buildHouse(state) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const tile = getTileAt(state.world, p.x, p.y, state);
	if (!tile || !CFG.BUILD.HOUSE_ALLOWED_TILES.has(tile)) {
		addHistory(state, p.name, "🏡0", "Дом только на 🪧", "", "");
		return false;
	}
	const cost = CFG.BUILD.HOUSE_COST;
	for (const k in cost) {
		if ((p[k] || 0) < cost[k]) {
			addHistory(state, p.name, "❌", "Не хватает ресурсов на 🏡", "", "");
			return false;
		}
	}
	const spent = {};
	for (const k in cost) {
		addResource(state, k, -cost[k]);
		spent[k] = -cost[k];
	}
	logSpend(state, "Построить дом", spent);
	setTileAt(state.world, p.x, p.y, CFG.BUILD.HOUSE_TILE, state);
	addHistory(state, p.name, "🏡", `${tile}→🏡`, "", "");
	return true;
}

export function moveEntitiesOnAction(state) {
	if (state.combat) return;
	moveAnimals(state, { onAction: true });
	moveNpcs(state, { onAction: true });
	moveHunters(state, { onAction: true });
	state._animalAttacks = [];
	state._npcAttacks = [];
	const enemy = getEnemyOnTile(state);
	if (enemy) startCombat(state);
}

function handleNpcAttack(state, npc) {
	const p = state.player;
	const spec = CFG.NPCS?.[npc.emoji];
	if (!spec) return;
	const dmg = Math.max(1, (spec.atk || 1) - (p.armor || 0));
	const newHp = Math.max(0, (p.hp || 1) - dmg);
	p.hp = newHp;
	addHistory(state, p.name, `❤️-${dmg} (HP:${newHp}/${p.maxhp})`, `${npc.emoji} атаковал!`, "", "");
	if (newHp <= 0) handleDeath(state);
}

function rollRandomEvent(state) {
	const events = CFG.EVENTS || [];
	if (!events.length) return;
	const totalWeight = events.reduce((s, e) => s + (e.weight || 1), 0);
	let r = Math.random() * totalWeight;
	for (const ev of events) {
		r -= ev.weight || 1;
		if (r <= 0) {
			addHistory(state, "🌍", "", ev.text, "", "", { moveInDay: 0 });
			if (ev.loot?.gold) addResource(state, "gold", randInt(ev.loot.gold[0] || 0, ev.loot.gold[1] || 0));
			if (ev.quest) {
				const def = CFG.QUESTS?.[ev.quest];
				const active = (state.activeQuests || []).some((q) => q.id === ev.quest);
				const completed = (state.completedQuests || []).includes(ev.quest);
				if (def && !active && !completed)
					state.activeQuests = (state.activeQuests || []).concat([{ id: ev.quest, progress: {} }]);
			}
			return;
		}
	}
}

export function newDay(state) {
	tickTimers(state);
	processHomeDay(state);
	moveAnimals(state);
	moveNpcs(state);
	moveHunters(state);
	spawnNewEnemies(state);
	rollRandomEvent(state);
	(state._npcAttacks || []).forEach((npc) => handleNpcAttack(state, npc));
	state._npcAttacks = [];
	state.dayNumber = (state.dayNumber ?? state.day ?? 1) + 1;
	state.dayStep = 0;
	if (state.day !== undefined) state.day = state.dayNumber;
	const p = state.player;
	const newHp = Math.min(p.maxhp || 10, (p.hp || 1) + 1);
	if (newHp > (p.hp || 1)) p.hp = newHp;
	addHistory(state, "🧙‍♂️Мастер", "🎆", `Новый день ${state.dayNumber} (+1 HP)`, "", "", { moveInDay: 0 });
	return true;
}

const CRAFT_SPECS = [
	{
		item: "🪓",
		name: "Топор",
		category: "item",
		cost: { wood: 2, stone: 1 },
		woodBonus: 1,
		effect: "🪵 +1 дерево",
		tag: "common",
	},
	{
		item: "⛏️",
		name: "Кирка",
		category: "item",
		cost: { wood: 1, stone: 2 },
		stoneBonus: 1,
		effect: "🪨 +1 камень",
		tag: "common",
	},
	{
		item: "🗡️",
		name: "Меч",
		category: "weapon",
		cost: { wood: 2, stone: 2, gold: 1 },
		stat: { atk: 2 },
		effect: "⚔️ +2 атака",
		tag: "common",
	},
	{
		item: "⚔️",
		name: "Двойные клинки",
		category: "weapon",
		cost: { wood: 4, stone: 3, gold: 2 },
		stat: { atk: 4 },
		effect: "⚔️ +4 атака · без щита",
		isNoShield: true,
		tag: "rare",
	},
	{
		item: "⚒️",
		name: "Молот и булава",
		category: "weapon",
		cost: { wood: 3, stone: 3, gold: 2 },
		stat: { atk: 3 },
		effect: "⚔️ +3 атака · оглушение · без щита",
		isNoShield: true,
		tag: "rare",
	},
	{
		item: "🔱",
		name: "Трезубец",
		category: "weapon",
		cost: { wood: 3, stone: 2, gold: 3 },
		stat: { atk: 4 },
		effect: "⚔️ +4 атака · дальний · без щита",
		isNoShield: true,
		tag: "rare",
	},
	{
		item: "🏹",
		name: "Лук",
		category: "weapon",
		cost: { wood: 2, stone: 1, gold: 1 },
		costItems: { "🪢": 1 },
		stat: { atk: 2 },
		effect: "⚔️ +2 атака · удар на 1 клетку",
		tag: "common",
	},
	{
		item: "🛡️",
		name: "Щит",
		category: "item",
		cost: { wood: 2, stone: 2 },
		stat: { armor: 2 },
		isShield: true,
		effect: "🛡️ +2 защита",
		tag: "common",
	},
	{
		item: "🔰",
		name: "Крепкий щит",
		category: "item",
		cost: { wood: 4, stone: 4, gold: 2 },
		stat: { armor: 4 },
		isShield: true,
		effect: "🛡️ +4 защита",
		tag: "rare",
	},
	{
		item: "🧥",
		name: "Броня",
		category: "item",
		cost: { wood: 4, stone: 3, gold: 3 },
		stat: { armor: 5 },
		effect: "🛡️ +5 защита",
		tag: "rare",
	},
	{
		item: "🪖",
		name: "Шлем",
		category: "item",
		cost: { wood: 2, stone: 2, gold: 1 },
		stat: { armor: 3 },
		effect: "🛡️ +3 защита",
		tag: "common",
	},
	{
		item: "⛵",
		name: "Лодка",
		category: "item",
		cost: CFG.BOAT?.cost || { wood: 4, stone: 2 },
		effect: "🌊 плавание по воде",
		tag: "common",
	},
	{
		item: "🧪",
		name: "Зелье",
		category: "item",
		cost: { herb: 2, fish: 1, gold: 1 },
		consumable: true,
		heal: 2,
		effect: "❤️ +2 здоровье",
		tag: "common",
	},
	{
		item: "🍱",
		name: "Рационы",
		category: "item",
		cost: { food: 2, wood: 1 },
		consumable: true,
		heal: 2,
		effect: "❤️ +2 здоровье",
		tag: "common",
	},
	{ item: "🪢", name: "Верёвка", category: "item", cost: { wood: 2 }, effect: "⛰️ скалы · для лука", tag: "common" },
	{
		item: "💍",
		name: "Кольцо",
		category: "item",
		cost: { stone: 1, gold: 2 },
		stat: { luck: 2 },
		effect: "🍀 +2 удача · уворот",
		tag: "rare",
	},
];

export function craft(state, spec) {
	const enemy = getEnemyOnTile(state);
	if (enemy) {
		startCombat(state);
		return false;
	}
	const p = state.player;
	const cost = spec.cost || {};
	for (const k in cost) {
		if ((p[k] || 0) < cost[k]) {
			addHistory(state, p.name, "❌", `Не хватает для ${spec.item}`, "", "");
			return false;
		}
	}
	const costItems = spec.costItems || {};
	for (const [item, need] of Object.entries(costItems)) {
		if (countItem(state, item) < need) {
			addHistory(state, p.name, "❌", `Нужно ${need}×${item} для ${spec.item}`, "", "");
			return false;
		}
	}
	const spent = {};
	for (const k in cost) {
		addResource(state, k, -cost[k]);
		spent[k] = -cost[k];
	}
	logSpend(state, `Крафт ${spec.item}`, spent);
	for (const [item, need] of Object.entries(costItems)) {
		for (let i = 0; i < need; i++) {
			const idx = p.items.indexOf(item);
			if (idx >= 0) p.items.splice(idx, 1);
		}
	}
	(p.items = p.items || []).push(spec.item);
	if (spec.consumable && spec.heal) {
		addHistory(state, p.name, "✅", `${spec.item} → инвентарь`, "", "");
	} else {
		addHistory(state, p.name, "✅", spec.item, "", "");
	}
	return true;
}

export { CRAFT_SPECS };

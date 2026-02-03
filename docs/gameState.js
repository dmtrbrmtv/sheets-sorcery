// ===== Sheets & Sorcery: Game State =====

import { CFG, GRID_H, GRID_W } from "./config.js";
import { proceduralTile } from "./procedural.js";
import { baseTile, randInt } from "./utils.js";
import { WORLD } from "./world_base.js";

function logHistory(state, who, what, opts = {}) {
	state.history.unshift({
		day: state.dayNumber ?? state.day ?? 1,
		moveInDay: opts.moveInDay ?? state.dayStep ?? 0,
		who: who || "",
		got: opts.got || "",
		what: what || "",
		mapInfo: opts.mapInfo || "",
		timerInfo: opts.timerInfo || "",
		when: new Date().toISOString(),
	});
	if (state.history.length > 200) state.history.pop();
}

export function createInitialState() {
	const worldSeed = Math.floor(Math.random() * 1000000);
	const world = WORLD.map((row) => [...row.map((c) => baseTile(c))]);
	const pos = findFirstWalkable(world);

	const playerCell = new Set([`${pos.x},${pos.y}`]);
	const animals = spawnAnimals(world, playerCell);
	const animalCells = new Set(animals.map((a) => `${a.x},${a.y}`));
	animalCells.add(`${pos.x},${pos.y}`);
	const npcs = spawnNpcs(world, animalCells);
	npcs.forEach((n) => animalCells.add(`${n.x},${n.y}`));
	const villagers = spawnVillagers(world, animalCells);
	const hunters = spawnHunters(world, animalCells);

	const state = {
		world,
		worldSeed,
		worldChanges: {},
		dayNumber: 1,
		dayStep: 0,
		activeQuests: [],
		completedQuests: [],
		combat: null,
		player: {
			icon: "🧙🏻‍♂️",
			name: "Hero",
			x: pos.x,
			y: pos.y,
			hp: 10,
			maxhp: 10,
			atk: 2,
			armor: 1,
			gold: 0,
			herb: 0,
			food: 0,
			water: 0,
			fish: 0,
			wood: 0,
			stone: 0,
			items: [],
			statusEffects: [],
		},
		revealed: new Set([`${pos.x},${pos.y}`]),
		timers: [],
		history: [],
		home: null,
		animals,
		npcs,
		villagers,
		hunters,
	};

	animals.forEach((a) => logHistory(state, "🌍", `${a.emoji} появился на (${a.x},${a.y})`, { moveInDay: 0 }));
	hunters.forEach((h) =>
		logHistory(state, "🌍", `${h.emoji} ${h.name} вышел на охоту (${h.x},${h.y})`, { moveInDay: 0 }),
	);
	npcs.forEach((n) => logHistory(state, "🌍", `${n.emoji} появился на (${n.x},${n.y})`, { moveInDay: 0 }));
	villagers.forEach((v) => logHistory(state, "🌍", `${v.emoji} ${v.name} в деревне (${v.x},${v.y})`, { moveInDay: 0 }));

	return state;
}

function spawnAnimals(world, occupied = new Set()) {
	const animals = [];
	const types = ["small", "big", "boar", "wolf", "eagle"].filter((t) => CFG.ANIMALS?.[t]);
	const maxCount = CFG.ANIMALS?.maxCount || 8;

	for (let i = 0; i < maxCount; i++) {
		const type = types[Math.floor(Math.random() * types.length)];
		const spec = CFG.ANIMALS[type];
		if (!spec || !spec.tiles) continue;
		for (let tries = 0; tries < 25; tries++) {
			const x = randInt(1, GRID_W);
			const y = randInt(1, GRID_H);
			if (isInVillage(x, y)) continue;
			const key = `${x},${y}`;
			if (occupied.has(key)) continue;
			const tile = getTileAt(world, x, y);
			if (tile && spec.tiles.has(tile) && !CFG.BLOCKED_NO_BOAT?.has(tile) && tile !== "🌊") {
				animals.push({
					x,
					y,
					type,
					emoji: spec.emoji,
					passive: spec.passive !== false,
					hp: spec.hp,
					atk: spec.atk,
				});
				occupied.add(key);
				break;
			}
		}
	}
	return animals;
}

const VILLAGE_TILES = new Set(["⬜️", "🏠", "🏥"]);

function spawnVillagers(world, occupied = new Set()) {
	const villagers = [];
	const v = CFG.VILLAGE;
	if (!v || !CFG.VILLAGERS) return villagers;
	const entries = Object.entries(CFG.VILLAGERS);
	for (const [emoji, spec] of entries) {
		for (let tries = 0; tries < 20; tries++) {
			const x = randInt(v.xMin, v.xMax);
			const y = randInt(v.yMin, v.yMax);
			const key = `${x},${y}`;
			if (occupied.has(key)) continue;
			const tile = getTileAt(world, x, y);
			if (!tile || !VILLAGE_TILES.has(tile)) continue;
			villagers.push({
				x,
				y,
				emoji,
				name: spec.name || emoji,
				role: spec.role || "resident",
				dialog: spec.dialog || "...",
			});
			occupied.add(key);
			break;
		}
	}
	return villagers;
}

function spawnNpcs(world, occupied = new Set()) {
	const npcs = [];
	const v = CFG.VILLAGE;
	for (const [emoji, spec] of Object.entries(CFG.NPCS || {})) {
		if (!spec?.tiles) continue;
		const count = emoji === "🧑🏾‍🌾" ? (Math.random() < (spec.spawnChance || 0.2) ? 1 : 0) : 1;
		for (let c = 0; c < count; c++) {
			for (let tries = 0; tries < 30; tries++) {
				const x = randInt(1, GRID_W);
				const y = randInt(1, GRID_H);
				if (v && isInVillage(x, y)) continue;
				const key = `${x},${y}`;
				if (occupied.has(key)) continue;
				const tile = getTileAt(world, x, y);
				if (tile && spec.tiles.has(tile) && !CFG.BLOCKED_NO_BOAT?.has(tile) && tile !== "🌊") {
					npcs.push({ x, y, emoji, hp: spec.hp || 4, atk: spec.atk || 1, maxHp: spec.hp || 4 });
					occupied.add(key);
					break;
				}
			}
		}
	}
	return npcs;
}

export function spawnHunters(world, occupied = new Set()) {
	const hunters = [];
	const entries = Object.entries(CFG.HUNTERS || {});
	if (!entries.length) return hunters;
	const count = Math.min(2 + Math.floor(Math.random() * 2), entries.length);
	const shuffled = [...entries].sort(() => Math.random() - 0.5);
	for (let i = 0; i < count; i++) {
		const [emoji, spec] = shuffled[i];
		if (!spec?.tiles) continue;
		for (let tries = 0; tries < 30; tries++) {
			const x = randInt(1, GRID_W);
			const y = randInt(1, GRID_H);
			if (isInVillage(x, y)) continue;
			const key = `${x},${y}`;
			if (occupied.has(key)) continue;
			const tile = getTileAt(world, x, y);
			if (tile && spec.tiles.has(tile) && !CFG.BLOCKED_NO_BOAT?.has(tile) && tile !== "🌊") {
				hunters.push({ x, y, emoji, name: spec.name || emoji });
				occupied.add(key);
				break;
			}
		}
	}
	return hunters;
}

function findFirstWalkable(world) {
	const blocked = CFG.BLOCKED_NO_BOAT || CFG.BLOCKED;
	for (let y = 1; y <= GRID_H; y++) {
		for (let x = 1; x <= GRID_W; x++) {
			const t = getTileAt(world, x, y);
			if (t && !blocked.has(t)) return { x, y };
		}
	}
	return { x: 1, y: 1 };
}

/** Get tile at (x,y). For y > GRID_H uses procedural + worldChanges when state provided. */
export function getTileAt(world, x, y, state = null) {
	const key = `${x},${y}`;
	if (state?.worldChanges && state.worldChanges[key] !== undefined) {
		return state.worldChanges[key];
	}
	if (x >= 1 && x <= GRID_W && y >= 1 && y <= GRID_H) {
		return baseTile(world[y - 1][x - 1]);
	}
	if (y > GRID_H && x >= 1 && x <= GRID_W) {
		return proceduralTile(x, y, state);
	}
	return null;
}

export function isInVillage(x, y) {
	const v = CFG.VILLAGE;
	if (!v) return false;
	return x >= v.xMin && x <= v.xMax && y >= v.yMin && y <= v.yMax;
}

export function setTileAt(world, x, y, tile, state = null) {
	if (x >= 1 && x <= GRID_W && y >= 1 && y <= GRID_H) {
		world[y - 1][x - 1] = tile;
		return;
	}
	if (state && y > GRID_H && x >= 1 && x <= GRID_W) {
		state.worldChanges = state.worldChanges || {};
		state.worldChanges[`${x},${y}`] = tile;
	}
}

export function buildVisibleSet(player, radius = CFG.FOG.radius) {
	const visible = new Set();
	for (let dy = -radius; dy <= radius; dy++) {
		for (let dx = -radius; dx <= radius; dx++) {
			const x = player.x + dx;
			const y = player.y + dy;
			if (x >= 1 && x <= GRID_W && y >= 1) {
				visible.add(`${x},${y}`);
			}
		}
	}
	return visible;
}

export function moveAnimals(state, opts = {}) {
	const animals = state.animals || [];
	if (!animals.length) return;

	const onAction = opts.onAction ?? false;
	const moveChance = onAction ? 0.5 : 1;
	const visible = onAction ? buildVisibleSet(state.player) : null;

	const p = state.player;
	const playerCells = new Set([`${p.x},${p.y}`]);
	const occupied = new Set([
		...animals.map((a) => `${a.x},${a.y}`),
		...(state.npcs || []).map((n) => `${n.x},${n.y}`),
		`${p.x},${p.y}`,
	]);
	const dirs = [
		{ dx: 0, dy: -1 },
		{ dx: 0, dy: 1 },
		{ dx: 1, dy: 0 },
		{ dx: -1, dy: 0 },
	];

	state.animals = animals.map((a) => {
		if (onAction && Math.random() >= moveChance) return a;

		let candidates = [...dirs];
		const spec = CFG.ANIMALS?.[a.type];
		const isRabbit = a.emoji === "🐇";
		const isHostile = !a.passive;

		if (isRabbit && spec?.passive) {
			const dist = Math.abs(a.x - p.x) + Math.abs(a.y - p.y);
			if (dist <= 3) {
				const awayDirs = dirs.filter((d) => {
					const nx = a.x + d.dx;
					const ny = a.y + d.dy;
					const tile = getTileAt(state.world, nx, ny);
					if (!tile || CFG.BLOCKED_NO_BOAT?.has(tile) || tile === "🌊") return false;
					if (spec.tiles && !spec.tiles.has(tile)) return false;
					if (occupied.has(`${nx},${ny}`)) return false;
					const newDist = Math.abs(nx - p.x) + Math.abs(ny - p.y);
					return newDist > dist;
				});
				if (awayDirs.length) candidates = awayDirs;
			}
		}

		const shuffled = [...candidates].sort(() => Math.random() - 0.5);
		for (const d of shuffled) {
			const nx = a.x + d.dx;
			const ny = a.y + d.dy;
			if (nx < 1 || ny < 1 || nx > GRID_W || ny > GRID_H) continue;
			const tile = getTileAt(state.world, nx, ny);
			const blocked = CFG.BLOCKED_NO_BOAT || CFG.BLOCKED;
			if (tile && blocked.has(tile)) continue;
			if (CFG.ZOMBIE && tile === CFG.ZOMBIE.aliveTile) continue;
			if (playerCells.has(`${nx},${ny}`)) {
				if (isHostile && !isInVillage(nx, ny)) {
					occupied.delete(`${a.x},${a.y}`);
					occupied.add(`${nx},${ny}`);
					state._animalAttacks = (state._animalAttacks || []).concat([{ ...a, x: nx, y: ny }]);
					return { ...a, x: nx, y: ny };
				}
				continue;
			}
			if (isInVillage(nx, ny)) continue;
			if (occupied.has(`${nx},${ny}`)) continue;

			if (spec?.tiles && !spec.tiles.has(tile)) continue;

			occupied.delete(`${a.x},${a.y}`);
			occupied.add(`${nx},${ny}`);
			if (!onAction || visible.has(`${a.x},${a.y}`) || visible.has(`${nx},${ny}`)) {
				logHistory(state, "🌍", `${a.emoji} перешёл (${a.x},${a.y}) → (${nx},${ny})`, { moveInDay: 0 });
			}
			return { ...a, x: nx, y: ny };
		}
		return a;
	});
}

export function spawnNewEnemies(state) {
	const occupied = new Set([
		...(state.animals || []).map((a) => `${a.x},${a.y}`),
		...(state.npcs || []).map((n) => `${n.x},${n.y}`),
		`${state.player.x},${state.player.y}`,
	]);
	const world = state.world;

	const animalTypes = ["small", "big", "boar", "wolf", "eagle"].filter((t) => CFG.ANIMALS?.[t]);
	const toSpawn = randInt(1, 2);
	for (let i = 0; i < toSpawn; i++) {
		const type = animalTypes[Math.floor(Math.random() * animalTypes.length)];
		const spec = CFG.ANIMALS[type];
		if (!spec?.tiles) continue;
		for (let tries = 0; tries < 25; tries++) {
			const x = randInt(1, GRID_W);
			const y = randInt(1, GRID_H);
			if (isInVillage(x, y)) continue;
			const key = `${x},${y}`;
			if (occupied.has(key)) continue;
			const tile = getTileAt(world, x, y);
			if (!tile || !spec.tiles.has(tile)) continue;
			if (CFG.BLOCKED_NO_BOAT?.has(tile) || tile === "🌊") continue;
			const animal = { x, y, type, emoji: spec.emoji, passive: spec.passive !== false, hp: spec.hp, atk: spec.atk };
			state.animals = (state.animals || []).concat([animal]);
			occupied.add(key);
			logHistory(state, "🌍", `${spec.emoji} появился на (${x},${y})`, { moveInDay: 0 });
			break;
		}
	}

	for (const [emoji, spec] of Object.entries(CFG.NPCS || {})) {
		if (!spec?.tiles) continue;
		const roll = Math.random();
		const chance = emoji === "🧑🏾‍🌾" ? (spec.spawnChance ?? 0.2) : 0.25;
		if (roll >= chance) continue;
		for (let tries = 0; tries < 30; tries++) {
			const x = randInt(1, GRID_W);
			const y = randInt(1, GRID_H);
			if (isInVillage(x, y)) continue;
			const key = `${x},${y}`;
			if (occupied.has(key)) continue;
			const tile = getTileAt(world, x, y);
			if (!tile || !spec.tiles.has(tile)) continue;
			if (CFG.BLOCKED_NO_BOAT?.has(tile) || tile === "🌊") continue;
			const npc = { x, y, emoji, hp: spec.hp || 4, atk: spec.atk || 1, maxHp: spec.hp || 4 };
			state.npcs = (state.npcs || []).concat([npc]);
			occupied.add(key);
			logHistory(state, "🌍", `${emoji} ${spec.name || emoji} появился на (${x},${y})`, { moveInDay: 0 });
			break;
		}
	}
}

export function moveNpcs(state, opts = {}) {
	const npcs = state.npcs || [];
	if (!npcs.length) return;

	const onAction = opts.onAction ?? false;
	const moveChance = onAction ? 0.25 : 1;
	const visible = onAction ? buildVisibleSet(state.player) : null;

	const playerCells = new Set([`${state.player.x},${state.player.y}`]);
	const occupied = new Set([
		...(state.animals || []).map((a) => `${a.x},${a.y}`),
		...npcs.map((n) => `${n.x},${n.y}`),
		`${state.player.x},${state.player.y}`,
	]);
	const dirs = [
		{ dx: 0, dy: -1 },
		{ dx: 0, dy: 1 },
		{ dx: 1, dy: 0 },
		{ dx: -1, dy: 0 },
	];

	state.npcs = npcs.map((npc) => {
		const spec = CFG.NPCS?.[npc.emoji];
		if (!spec?.tiles) return npc;
		if (onAction && spec.boss) return npc;
		if (onAction && Math.random() >= moveChance) return npc;

		const shuffled = [...dirs].sort(() => Math.random() - 0.5);
		for (const d of shuffled) {
			const nx = npc.x + d.dx;
			const ny = npc.y + d.dy;
			if (nx < 1 || ny < 1 || nx > GRID_W || ny > GRID_H) continue;
			const tile = getTileAt(state.world, nx, ny);
			if (!tile || CFG.BLOCKED_NO_BOAT?.has(tile) || tile === "🌊") continue;
			if (!spec.tiles.has(tile)) continue;

			if (playerCells.has(`${nx},${ny}`)) {
				if (!isInVillage(nx, ny)) {
					occupied.delete(`${npc.x},${npc.y}`);
					occupied.add(`${nx},${ny}`);
					state._npcAttacks = (state._npcAttacks || []).concat([{ ...npc, x: nx, y: ny }]);
					return { ...npc, x: nx, y: ny };
				}
				continue;
			}
			if (isInVillage(nx, ny)) continue;

			if (occupied.has(`${nx},${ny}`)) continue;

			occupied.delete(`${npc.x},${npc.y}`);
			occupied.add(`${nx},${ny}`);
			const name = spec.name || npc.emoji;
			if (!onAction || visible.has(`${npc.x},${npc.y}`) || visible.has(`${nx},${ny}`)) {
				logHistory(state, "🌍", `${npc.emoji} ${name} перешёл (${npc.x},${npc.y}) → (${nx},${ny})`, { moveInDay: 0 });
			}
			return { ...npc, x: nx, y: ny };
		}
		return npc;
	});
}

const HUNTABLE_ANIMALS = new Set(["🦌", "🐗", "🐇"]);

export function moveHunters(state, opts = {}) {
	const hunters = state.hunters || [];
	if (!hunters.length) return;

	const onAction = opts.onAction ?? false;
	const moveChance = onAction ? 0.4 : 1;
	const visible = onAction ? buildVisibleSet(state.player) : null;

	const p = state.player;
	const playerCell = `${p.x},${p.y}`;
	const hostileAnimals = (state.animals || []).filter((a) => !a.passive).map((a) => `${a.x},${a.y}`);
	const npcCells = new Set((state.npcs || []).map((n) => `${n.x},${n.y}`));
	const zombieCells = new Set();
	for (let y = 1; y <= GRID_H; y++) {
		for (let x = 1; x <= GRID_W; x++) {
			const t = getTileAt(state.world, x, y, state);
			if (t === CFG.ZOMBIE?.aliveTile) zombieCells.add(`${x},${y}`);
		}
	}
	const dangerous = new Set([playerCell, ...npcCells, ...zombieCells, ...hostileAnimals]);

	const dirs = [
		{ dx: 0, dy: -1 },
		{ dx: 0, dy: 1 },
		{ dx: 1, dy: 0 },
		{ dx: -1, dy: 0 },
	];
	const occupied = new Set(hunters.map((h) => `${h.x},${h.y}`));
	const animalCells = new Map((state.animals || []).map((a) => [`${a.x},${a.y}`, a]));

	const result = [];
	for (const hunter of hunters) {
		let moved = hunter;
		if (onAction && Math.random() >= moveChance) {
			result.push(moved);
			continue;
		}
		const spec = CFG.HUNTERS?.[hunter.emoji];
		if (!spec?.tiles) {
			result.push(moved);
			continue;
		}

		const shuffled = [...dirs].sort(() => Math.random() - 0.5);
		for (const d of shuffled) {
			const nx = hunter.x + d.dx;
			const ny = hunter.y + d.dy;
			if (nx < 1 || ny < 1 || nx > GRID_W || ny > GRID_H) continue;
			const tile = getTileAt(state.world, nx, ny, state);
			if (!tile || !spec.tiles.has(tile) || CFG.BLOCKED_NO_BOAT?.has(tile) || tile === "🌊") continue;
			if (isInVillage(nx, ny)) continue;

			const key = `${nx},${ny}`;
			if (dangerous.has(key)) continue;
			if (occupied.has(key)) continue;

			const animal = animalCells.get(key);
			if (animal) {
				if (!HUNTABLE_ANIMALS.has(animal.emoji)) continue;
				occupied.delete(`${hunter.x},${hunter.y}`);
				occupied.add(key);
				state.animals = (state.animals || []).filter((a) => !(a.x === nx && a.y === ny));
				animalCells.delete(key);
				if (!onAction || visible?.has(`${hunter.x},${hunter.y}`) || visible?.has(key)) {
					logHistory(state, "🌍", `${hunter.emoji} ${hunter.name} подстрелил ${animal.emoji} на (${nx},${ny})`, {
						moveInDay: 0,
					});
				}
				moved = { ...hunter, x: nx, y: ny };
				break;
			}

			occupied.delete(`${hunter.x},${hunter.y}`);
			occupied.add(key);
			if (!onAction || visible?.has(`${hunter.x},${hunter.y}`) || visible?.has(key)) {
				logHistory(state, "🌍", `${hunter.emoji} ${hunter.name} перешёл (${hunter.x},${hunter.y}) → (${nx},${ny})`, {
					moveInDay: 0,
				});
			}
			moved = { ...hunter, x: nx, y: ny };
			break;
		}
		result.push(moved);
	}
	state.hunters = result;
}

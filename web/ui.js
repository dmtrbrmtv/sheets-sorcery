// ===== Sheets & Sorcery: UI Helpers =====

import { CFG } from "./config.js";
import { getTileAt } from "./gameState.js";
import { CRAFT_SPECS, getEnemyOnTile, getVillagerOnTile, getTimeState, countItem, getEffectiveAtk, getEffectiveArmor } from "./actions.js";
import { getTerrainName } from "./terrain.js";

const ACTION_SHORT = {
  chop: "Рубка",
  quarry: "Камень",
  hunt: "Охота",
  fish: "Рыба",
  build: "Строить",
  sail: "Плыть",
};

export function getCombatEnemyInfo(state) {
  const c = state.combat;
  if (!c) return null;
  if (c.type === "zombie") return { emoji: "🧟", name: "Зомби", hp: c.hp ?? CFG.ZOMBIE.hp, maxHp: CFG.ZOMBIE.hp, armor: 0 };
  if (c.type === "npc") {
    const spec = CFG.NPCS?.[c.target.emoji];
    return { emoji: c.target.emoji, name: spec?.name || c.target.emoji, hp: c.target.hp, maxHp: spec?.hp ?? 4, armor: 0 };
  }
  if (c.type === "animal") {
    const spec = CFG.ANIMALS?.[c.target.type];
    return { emoji: c.target.emoji, name: spec?.name || c.target.emoji, hp: c.target.hp, maxHp: spec?.hp ?? 3, armor: 0 };
  }
  return null;
}

function hpBar(current, max, fullIcon = "❤️", emptyIcon = "💔") {
  let s = "";
  for (let i = 0; i < max; i++) s += i < current ? fullIcon : emptyIcon;
  return s;
}

function armorBar(armor) {
  if (!armor || armor <= 0) return "";
  return "🛡️".repeat(armor);
}

export function getCombatDisplayData(state) {
  const p = state.player;
  const enemy = getCombatEnemyInfo(state);
  if (!enemy) return null;

  const statusSpecs = CFG.STATUS_EFFECTS || {};
  const playerEffects = (p.statusEffects || []).map(e => {
    const s = statusSpecs[e.type];
    return s ? `${s.icon} ${s.name} (${e.duration})` : "";
  }).filter(Boolean);

  return {
    player: {
      icon: p.icon || "🧙🏻‍♂️",
      hp: p.hp ?? 10,
      maxHp: p.maxhp ?? 10,
      armor: getEffectiveArmor(state),
      hpBar: hpBar(p.hp ?? 10, p.maxhp ?? 10),
      armorBar: armorBar(getEffectiveArmor(state)),
      effects: playerEffects,
    },
    enemy: {
      icon: enemy.emoji,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      armor: enemy.armor ?? 0,
      hpBar: hpBar(enemy.hp, enemy.maxHp),
      armorBar: armorBar(enemy.armor ?? 0),
      effects: [],
    },
    combatLog: state.combatLog || [],
  };
}

export function getContextHints(state) {
  const p = state.player;
  const tile = getTileAt(state.world, p.x, p.y, state);
  const enemy = getEnemyOnTile(state);
  const animal = (state.animals || []).find(a => a.x === p.x && a.y === p.y);
  const npc = (state.npcs || []).find(n => n.x === p.x && n.y === p.y);
  const hasBoat = (p.items || []).includes("⛵");
  const near = [
    getTileAt(state.world, p.x + 1, p.y, state),
    getTileAt(state.world, p.x - 1, p.y, state),
    getTileAt(state.world, p.x, p.y + 1, state),
    getTileAt(state.world, p.x, p.y - 1, state),
  ].filter(Boolean);

  const hints = [];
  const shortActions = [];
  const reasons = [];

  if (enemy) {
    const emoji = enemy.type === "zombie" ? "🧟" : enemy.target?.emoji || "?";
    hints.push(`⚔️ Бой с ${emoji} — панель боя справа`);
    shortActions.push("Fight");
    return { hints, reasons, tileEmoji: emoji, tileName: enemy.type === "zombie" ? "Зомби" : (CFG.NPCS?.[enemy.target?.emoji]?.name || CFG.ANIMALS?.[enemy.target?.type]?.name || "?"), shortActions };
  }

  const villager = getVillagerOnTile(state);
  if (villager) {
    hints.push(`💬 Поговорить с ${villager.name}`); shortActions.push("Talk");
  }

  if (CFG.RESOURCES.WOOD_TILES.has(tile)) {
    hints.push("🪓 Рубка (+1 с топором)"); shortActions.push(ACTION_SHORT.chop);
  }
  if (CFG.RESOURCES.STONE_TILES.has(tile)) {
    hints.push("⛏️ Каменоломня (+1 с киркой)"); shortActions.push(ACTION_SHORT.quarry);
  }
  const huntable = animal ? (animal.emoji || "🐇") : tile;
  if (CFG.RESOURCES.HUNT_TILES.has(huntable)) {
    hints.push("🏹 Охота"); shortActions.push(ACTION_SHORT.hunt);
  }
  if (near.some(t => t === "🌊")) {
    hints.push("🎣 Рыбалка"); shortActions.push(ACTION_SHORT.fish);
  }
  if (tile === "🪧") {
    const cost = CFG.BUILD?.HOUSE_COST || {};
    const costParts = Object.entries(cost).map(([k, v]) => {
      const text = `${CRAFT_COST_ICONS[k] || k}${v}`;
      const isMissing = (p[k] || 0) < v;
      return isMissing ? `<span class="cost-missing">${text}</span>` : text;
    });
    hints.push(`🏡 Купить дом мечты: ${costParts.join(" ")}`);
    shortActions.push("Купить");
  }
  if (tile === "🌊" && hasBoat) {
    hints.push("⛵ Плавать"); shortActions.push(ACTION_SHORT.sail);
  }

  const tileEmoji = animal ? (animal.emoji || "🐇") : villager ? villager.emoji : npc ? npc.emoji : tile;
  let tileName = animal
    ? ({ "🦌": "Олень", "🐗": "Кабан", "🐇": "Заяц", "🐺": "Волк", "🦅": "Орёл" }[animal.emoji] || animal.emoji || "?")
    : villager ? villager.name : npc ? (CFG.NPCS?.[npc.emoji]?.name || npc.emoji) : getTerrainName(tile);
  if (tile === "🪧") tileName = "Дом твоей мечты!!";

  return { hints, reasons, tileEmoji, tileName, shortActions };
}

const PHASE_ICONS = { day: "🌝", dusk: "🌘", night: "🌚", dawn: "🌔" };
const PHASE_NAMES = { day: "День", dusk: "Сумерки", night: "Ночь", dawn: "Рассвет" };

export function getPlayerStats(state) {
  const p = state.player;
  const items = p.items || [];
  const effects = [];
  if (items.includes("🪓")) effects.push("🪓 +1 дерево");
  if (items.includes("⛏️")) effects.push("⛏️ +1 камень");
  const atkBonus = getEffectiveAtk(state) - (p.atk ?? 2);
  if (atkBonus > 0) effects.push(`⚔️ +${atkBonus} атака`);
  const armorBonus = getEffectiveArmor(state) - (p.armor ?? 1);
  if (armorBonus > 0) effects.push(`🛡️ +${armorBonus} защита`);
  if (items.includes("⛵")) effects.push("⛵ плавание");
  if (items.includes("🪢")) effects.push("🪢 скалы");
  if (items.includes("💍")) effects.push("💍 удача");
  const statusSpecs = CFG.STATUS_EFFECTS || {};
  (p.statusEffects || []).forEach(e => {
    const s = statusSpecs[e.type];
    if (s) effects.push(`${s.icon} ${s.name} (${e.duration})`);
  });

  const t = getTimeState(state);
  const phaseIcon = PHASE_ICONS[t.phase] || "🌝";
  const phaseName = PHASE_NAMES[t.phase] || "День";
  const phaseStart = { day: 0, dusk: 20, night: 30, dawn: 40 }[t.phase] ?? 0;
  const stepInPhase = (t.stepIndex ?? 0) - phaseStart + 1;
  const phaseStepsInPhase = t.phase === "day" ? 20 : 10;

  const potionCount = (p.items || []).filter(i => i === "🧪").length;
  const villageCenterY = 6;
  const distFromVillage = p.y > villageCenterY ? (p.y - villageCenterY) : 0;

  return {
    icon: p.icon,
    name: p.name,
    x: p.x,
    y: p.y,
    hp: p.hp ?? 10,
    maxhp: p.maxhp ?? 10,
    potionCount,
    dayNumber: t.dayNumber,
    phase: t.phase,
    phaseIcon,
    phaseName,
    stepInDay: t.stepInDay,
    stepInPhase,
    phaseStepsInPhase,
    dayStepsLeft: t.dayStepsLeft,
    totalSteps: t.totalSteps ?? 50,
    wood: p.wood ?? 0,
    stone: p.stone ?? 0,
    herb: p.herb ?? 0,
    food: p.food ?? 0,
    gold: p.gold ?? 0,
    fish: p.fish ?? 0,
    effects,
    allPhases: ["day", "dusk", "night", "dawn"],
    distFromVillage,
  };
}

export const CRAFT_COST_ICONS = { wood: "🪵", stone: "🪨", gold: "💰", food: "🍖", fish: "🐟", herb: "🌿" };

export function getCraftSpecsWithState(state) {
  const p = state.player;
  return CRAFT_SPECS.map((spec, i) => {
    const cost = spec.cost || {};
    const costItems = spec.costItems || {};
    const canAffordResources = !Object.entries(cost).some(([k, v]) => (p[k] || 0) < v);
    const canAffordItems = !Object.entries(costItems).some(([item, need]) => countItem(state, item) < need);
    const canCraft = canAffordResources && canAffordItems;
    const costParts = [
      ...Object.entries(cost).map(([k, v]) => ({
        text: `${CRAFT_COST_ICONS[k] || k} ${v}`,
        missing: (p[k] || 0) < v,
      })),
      ...Object.entries(costItems).map(([item, v]) => ({
        text: `${item} ×${v}`,
        missing: countItem(state, item) < v,
      })),
    ];
    return { ...spec, index: i, cost, costItems, costParts, canCraft };
  });
}

export function getActiveQuests(state) {
  const quests = state.activeQuests || [];
  return quests.map(q => {
    const def = CFG.QUESTS?.[q.id];
    if (!def) return null;
    const parts = Object.entries(def.objectives || {}).map(([k, need]) => {
      const icons = { wood: "🪵", stone: "🪨", food: "🍖", fish: "🐟" };
      const cur = q.progress?.[k] || 0;
      return `${icons[k] || k} ${cur}/${need}`;
    });
    return { ...q, name: def.name, progressText: parts.join(", ") };
  }).filter(Boolean);
}

export const RULES_TEXT = [
  "Каждое действие = 1 шаг (ходьба, рубка, охота, бой, крафт)",
  "50 шагов в день → Day(20) Dusk(10) Night(10) Dawn(10)",
  "Новый день: +1 HP, регенерация",
  "Ночь (шаги 30–39) = враги сильнее",
  "Смерть → воскрешение в 🏥 с полным HP",
  "",
  "Как использовать действия:",
  "🪓 Рубка — встань на 🌳/🌲/🌿/🌱, нажми «Рубить»",
  "⛏️ Камень — встань на 🗻/🪨/🧱/🕳️, нажми «Камень»",
  "🏹 Охота — встань на 🦌/🐗/🐇 или рядом с животным",
  "🎣 Рыба — встань рядом с 🌊, нажми «Рыба»",
  "💬 Диалог — встань на жителя деревни, нажми «Поговорить»",
  "📜 Квесты — встань на 🧙‍♂️ Мастера квестов в деревне, нажми «Поговорить»",
  "🏡 Дом мечты — встань на 🪧, нажми «Купить дом мечты»",
  "🚪 Войти в дом — встань на свой 🏡, нажми «Войти в дом»",
];

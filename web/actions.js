// ===== Sheets & Sorcery: Actions (mirrors Apps Script 50_Actions, 90_Zombie) =====

import { GRID_W, GRID_H, CFG } from "./config.js";
import { getTileAt, setTileAt, buildVisibleSet, moveAnimals } from "./gameState.js";
import { dirToDelta, randInt } from "./utils.js";
import { a1ToXY } from "./utils.js";

function addHistory(state, who, got, what, mapInfo, timerInfo) {
  state.history.unshift({
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
  return state.timers.some(t => t.x === x && t.y === y && t.daysLeft > 0);
}

function addTimer(state, x, y, restoreTile, days, reason) {
  state.timers.push({
    x,
    y,
    restoreTile,
    daysLeft: days,
    reason: reason || "regen",
  });
}

function tickTimers(state) {
  state.timers = state.timers.filter(t => {
    t.daysLeft--;
    if (t.daysLeft <= 0) {
      setTileAt(state.world, t.x, t.y, t.restoreTile);
      return false;
    }
    return true;
  });
}

function hasItem(state, itemEmoji) {
  return (state.player.items || []).includes(itemEmoji);
}

function addResource(state, key, delta) {
  state.player[key] = (state.player[key] || 0) + delta;
}

function resolveZombieFight(state) {
  const p = state.player;
  const d = CFG.ZOMBIE.diceSides;
  const rollP = randInt(1, d);
  const rollZ = randInt(1, d);
  const pScore = rollP + (p.atk || 0);
  const zScore = rollZ + CFG.ZOMBIE.atk;
  const diff = pScore - zScore;
  const armor = Number(p.armor || 0);
  const dmg = Math.max(1, 3 - armor);
  const diceInfo = `🎲${rollP}+⚔️${p.atk}=${pScore} vs 🎲${rollZ}+🧟${CFG.ZOMBIE.atk}=${zScore} | 🧟 HP:${CFG.ZOMBIE.hp}`;

  if (diff >= 2) {
    setTileAt(state.world, p.x, p.y, CFG.ZOMBIE.graveTile);
    addTimer(state, p.x, p.y, CFG.ZOMBIE.aliveTile, CFG.ZOMBIE.respawnDays, "zombie");
    const gold = randInt(CFG.ZOMBIE.goldMin, CFG.ZOMBIE.goldMax);
    addResource(state, "gold", gold);
    let item = "";
    if (Math.random() < CFG.ZOMBIE.itemChance) {
      item = CFG.ZOMBIE.lootItems[randInt(0, CFG.ZOMBIE.lootItems.length - 1)];
      (p.items = p.items || []).push(item);
    }
    const got = item ? `💰+${gold} 🎁${item}` : `💰+${gold}`;
    addHistory(state, p.name, got, `⚔️ Убил 🧟 (HP:${CFG.ZOMBIE.hp}) → ${CFG.ZOMBIE.graveTile}`, `${diceInfo} | ❤️ ${p.hp}/${p.maxhp}`, `⏱️${CFG.ZOMBIE.respawnDays}`);
    return;
  }

  if (diff >= 0) {
    const newHp = (p.hp || 0) - 1;
    p.hp = newHp;
    addHistory(state, p.name, `❤️-1 (HP:${newHp}/${p.maxhp})`, "Отбился от 🧟", diceInfo, "");
    if (newHp <= 0) handleDeath(state);
    return;
  }

  const newHp = (p.hp || 0) - dmg;
  p.hp = newHp;
  addHistory(state, p.name, `❤️-${dmg} (HP:${newHp}/${p.maxhp})`, "Получил удар от 🧟", diceInfo, "");
  if (newHp <= 0) handleDeath(state);
}

function handleDeath(state) {
  const p = state.player;
  const hosp = a1ToXY(CFG.RESPAWN.hospitalA1) || { x: 4, y: 7 };
  p.hp = p.maxhp || 10;
  p.moves = 0;
  p.x = hosp.x;
  p.y = hosp.y;
  addHistory(state, p.name, "☠️", `Погиб → 🏥`, "", "");
}

export function move(state, dir) {
  const delta = dirToDelta(dir);
  if (!delta) return false;

  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const nx = p.x + delta.dx;
  const ny = p.y + delta.dy;
  const tile = getTileAt(state.world, nx, ny);

  if (tile === null) {
    addHistory(state, p.name, "🧱", `Граница (${nx},${ny})`, "", "");
    return false;
  }
  if (CFG.BLOCKED.has(tile)) {
    addHistory(state, p.name, tile, `Непроходимо (${nx},${ny})`, "", "");
    return false;
  }

  p.x = nx;
  p.y = ny;
  p.moves--;

  const visible = buildVisibleSet(p);
  visible.forEach(k => state.revealed.add(k));

  addHistory(state, p.name, `👣-1, ${tile}`, `Переместился → (${nx},${ny})`, "", "");

  if (tile === CFG.ZOMBIE.aliveTile) {
    resolveZombieFight(state);
  }

  moveAnimals(state);
  return true;
}

export function waitTurn(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  p.moves--;
  const tile = getTileAt(state.world, p.x, p.y);

  if (tile === CFG.ZOMBIE.aliveTile) {
    addHistory(state, p.name, "👣-1", "Пропустил ход на 🧟 → бой!", "", "");
    resolveZombieFight(state);
  } else {
    addHistory(state, p.name, "👣-1", "Пропустил ход", "", "");
  }
  moveAnimals(state);
  return true;
}

export function doChopWood(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const tile = getTileAt(state.world, p.x, p.y);
  if (!tile || !CFG.RESOURCES.WOOD_TILES.has(tile)) {
    addHistory(state, p.name, "🪵0", "Рубка только на 🌳/🌲/🌿/🌱", "", "");
    return false;
  }
  if (tile === CFG.RESOURCES.WOOD_DEPLETED && hasTimerAt(state, p.x, p.y)) {
    addHistory(state, p.name, "⏳", "Пень отдыхает", "", "");
    return false;
  }

  const bonus = hasItem(state, "🪓") ? 1 : 0;
  const gained = 1 + bonus;
  addResource(state, "wood", gained);
  p.moves--;

  let nextTile = tile;
  if (tile === "🌳" || tile === "🌲") nextTile = "🌿";
  else if (tile === "🌿") nextTile = "🌱";
  else if (tile === "🌱") nextTile = "🌱";

  setTileAt(state.world, p.x, p.y, nextTile);

  if (!hasTimerAt(state, p.x, p.y)) {
    addTimer(state, p.x, p.y, CFG.RESOURCES.WOOD_REGEN_TO, CFG.REGEN_DAYS.wood, "wood");
  }

  addHistory(state, p.name, `🪵+${gained}${bonus ? " (🪓)" : ""}`, `${tile}→${nextTile}`, "", `⏱️${CFG.REGEN_DAYS.wood}`);
  moveAnimals(state);
  return true;
}

export function doQuarry(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const tile = getTileAt(state.world, p.x, p.y);
  if (!tile || !CFG.RESOURCES.STONE_TILES.has(tile)) {
    addHistory(state, p.name, "🪨0", "Каменоломня только на 🗻/🪨/🧱", "", "");
    return false;
  }
  if (tile === CFG.RESOURCES.STONE_DEPLETED && hasTimerAt(state, p.x, p.y)) {
    addHistory(state, p.name, "⏳", "Шахта отдыхает", "", "");
    return false;
  }

  const bonus = hasItem(state, "⛏️") ? 1 : 0;
  const gained = 1 + bonus;
  addResource(state, "stone", gained);
  p.moves--;

  let nextTile = tile;
  if (tile === "🗻") nextTile = "🪨";
  else if (tile === "🪨") nextTile = "🧱";
  else if (tile === "🧱") nextTile = "🕳️";
  else if (tile === "🕳️") nextTile = "🕳️";

  setTileAt(state.world, p.x, p.y, nextTile);

  if (!hasTimerAt(state, p.x, p.y)) {
    addTimer(state, p.x, p.y, CFG.RESOURCES.STONE_REGEN_TO, CFG.REGEN_DAYS.stone, "stone");
  }

  addHistory(state, p.name, `🪨+${gained}${bonus ? " (⛏️)" : ""}`, `${tile}→${nextTile}`, "", `⏱️${CFG.REGEN_DAYS.stone}`);
  moveAnimals(state);
  return true;
}

export function doHunt(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const tile = getTileAt(state.world, p.x, p.y);
  const animal = (state.animals || []).find(a => a.x === p.x && a.y === p.y);
  const huntable = animal ? (animal.emoji || "🐇") : tile;

  if (!huntable || !CFG.RESOURCES.HUNT_TILES.has(huntable)) {
    addHistory(state, p.name, "🍖0", "Охота только на 🦌/🐗/🐇", "", "");
    return false;
  }

  const gained = randInt(1, 2);
  addResource(state, "food", gained);
  p.moves--;

  if (animal) {
    state.animals = state.animals.filter(a => !(a.x === p.x && a.y === p.y));
  } else {
    setTileAt(state.world, p.x, p.y, "⬜️");
    addTimer(state, p.x, p.y, huntable, CFG.REGEN_DAYS.hunt, "hunt");
  }

  addHistory(state, p.name, `🍖+${gained}`, `${huntable}→⬜️`, "", animal ? "" : `⏱️${CFG.REGEN_DAYS.hunt}`);
  moveAnimals(state);
  return true;
}

export function doFish(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const near = [
    getTileAt(state.world, p.x + 1, p.y),
    getTileAt(state.world, p.x - 1, p.y),
    getTileAt(state.world, p.x, p.y + 1),
    getTileAt(state.world, p.x, p.y - 1),
  ].filter(Boolean);

  if (!near.some(t => t === "🌊")) {
    addHistory(state, p.name, "🐟0", "Рыбалка только рядом с 🌊", "", "");
    return false;
  }

  const gained = randInt(0, 2);
  addResource(state, "fish", gained);
  p.moves--;

  addHistory(state, p.name, `🐟+${gained}`, "🎣", "", "");
  moveAnimals(state);
  return true;
}

export function buildHouse(state) {
  const p = state.player;
  if (p.moves <= 0) {
    addHistory(state, p.name, "👣0", "Нет ходов", "", "");
    return false;
  }

  const tile = getTileAt(state.world, p.x, p.y);
  if (!tile || !CFG.BUILD.HOUSE_ALLOWED_TILES.has(tile)) {
    addHistory(state, p.name, "🏠0", "Дом на ⬜️ или 🏚️", "", "");
    return false;
  }

  const cost = CFG.BUILD.HOUSE_COST;
  for (const k in cost) {
    if ((p[k] || 0) < cost[k]) {
      addHistory(state, p.name, "❌", "Не хватает ресурсов на 🏠", "", "");
      return false;
    }
  }

  for (const k in cost) addResource(state, k, -cost[k]);
  setTileAt(state.world, p.x, p.y, CFG.BUILD.HOUSE_TILE);
  p.moves--;

  addHistory(state, p.name, "🏠", `${tile}→🏠`, "", "");
  moveAnimals(state);
  return true;
}

export function newDay(state) {
  tickTimers(state);
  state.day++;
  state.player.moves = CFG.MOVES_PER_DAY;
  const p = state.player;
  const newHp = Math.min(p.maxhp || 10, (p.hp || 1) + 1);
  if (newHp > (p.hp || 1)) p.hp = newHp;

  addHistory(state, "🧙‍♂️Мастер", "🎆", `Новый день ${state.day}: 👣=${CFG.MOVES_PER_DAY}`, "", "");
  return true;
}

const CRAFT_SPECS = [
  { item: "🪓", name: "Топор", cost: { wood: 2, stone: 1 } },
  { item: "⛏️", name: "Кирка", cost: { wood: 1, stone: 2 } },
  { item: "🗡️", name: "Меч", cost: { wood: 1, stone: 1, gold: 1 }, stat: { atk: 1 } },
  { item: "🛡️", name: "Щит", cost: { wood: 1, stone: 1 }, stat: { armor: 1 } },
];

export function craft(state, spec) {
  const p = state.player;
  for (const k in spec.cost) {
    if ((p[k] || 0) < spec.cost[k]) {
      addHistory(state, p.name, "❌", `Не хватает для ${spec.item}`, "", "");
      return false;
    }
  }
  for (const k in spec.cost) addResource(state, k, -spec.cost[k]);
  (p.items = p.items || []).push(spec.item);
  if (spec.stat?.atk) p.atk = (p.atk || 0) + spec.stat.atk;
  if (spec.stat?.armor) p.armor = (p.armor || 0) + spec.stat.armor;
  addHistory(state, p.name, "✅", spec.item, "", "");
  return true;
}

export { CRAFT_SPECS };

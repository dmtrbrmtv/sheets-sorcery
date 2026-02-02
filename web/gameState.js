// ===== Sheets & Sorcery: Game State =====

import { GRID_W, GRID_H, CFG } from "./config.js";
import { WORLD } from "./world_base.js";
import { baseTile, a1ToXY, randInt } from "./utils.js";

export function createInitialState() {
  const world = WORLD.map(row => [...row.map(c => baseTile(c))]);
  const pos = findFirstWalkable(world);

  const animals = spawnAnimals(world);

  return {
    world,
    day: 1,
    player: {
      icon: "🧙🏻‍♂️",
      name: "Hero",
      x: pos.x,
      y: pos.y,
      hp: 10,
      maxhp: 10,
      atk: 0,
      armor: 0,
      moves: CFG.MOVES_PER_DAY,
      gold: 0,
      herb: 0,
      food: 0,
      water: 0,
      fish: 0,
      wood: 0,
      stone: 0,
      items: [],
    },
    revealed: new Set([`${pos.x},${pos.y}`]),
    timers: [],
    history: [],
    animals,
  };
}

function spawnAnimals(world) {
  const animals = [];
  const maxCount = (CFG.ANIMALS && CFG.ANIMALS.maxCount) || 5;
  const small = CFG.ANIMALS?.small;
  const big = CFG.ANIMALS?.big;

  for (let i = 0; i < maxCount; i++) {
    const spec = Math.random() < 0.6 && small ? small : big;
    if (!spec || !spec.tiles) continue;
    for (let tries = 0; tries < 20; tries++) {
      const x = randInt(1, GRID_W);
      const y = randInt(1, GRID_H);
      const tile = getTileAt(world, x, y);
      if (tile && spec.tiles.has(tile)) {
        animals.push({ x, y, type: spec === small ? "small" : "big", emoji: spec.emoji });
        break;
      }
    }
  }
  return animals;
}

function findFirstWalkable(world) {
  for (let y = 1; y <= GRID_H; y++) {
    for (let x = 1; x <= GRID_W; x++) {
      const t = getTileAt(world, x, y);
      if (t && !CFG.BLOCKED.has(t)) return { x, y };
    }
  }
  return { x: 1, y: 1 };
}

export function getTileAt(world, x, y) {
  if (x < 1 || y < 1 || x > GRID_W || y > GRID_H) return null;
  return baseTile(world[y - 1][x - 1]);
}

export function setTileAt(world, x, y, tile) {
  if (x < 1 || y < 1 || x > GRID_W || y > GRID_H) return;
  world[y - 1][x - 1] = tile;
}

export function buildVisibleSet(player, radius = CFG.FOG.radius) {
  const visible = new Set();
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (x >= 1 && y >= 1 && x <= GRID_W && y <= GRID_H) {
        visible.add(`${x},${y}`);
      }
    }
  }
  return visible;
}

export function moveAnimals(state) {
  const animals = state.animals || [];
  if (!animals.length) return;

  const playerCells = new Set([`${state.player.x},${state.player.y}`]);
  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

  state.animals = animals.map(a => {
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      const nx = a.x + d.dx;
      const ny = a.y + d.dy;
      if (nx < 1 || ny < 1 || nx > GRID_W || ny > GRID_H) continue;
      const tile = getTileAt(state.world, nx, ny);
      if (tile && CFG.BLOCKED.has(tile)) continue;
      if (CFG.ZOMBIE && tile === CFG.ZOMBIE.aliveTile) continue;
      if (playerCells.has(`${nx},${ny}`)) continue;

      const spec = CFG.ANIMALS?.[a.type];
      if (spec?.tiles && !spec.tiles.has(tile)) continue;

      return { ...a, x: nx, y: ny };
    }
    return a;
  });
}

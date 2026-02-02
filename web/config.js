// ===== Sheets & Sorcery: Web Config =====
// Matches Apps Script 00_Config.js where applicable

export const GRID_W = 26;
export const GRID_H = 32;
export const CELL_SIZE_PX = 28;

export const CFG = {
  FOG: {
    radius: 3,
    fogChar: "🌫️",
    baseEmpty: "⬜️",
  },
  BLOCKED: new Set(["🌊", "🗿", "⛰️", "🌋"]),
  RESOURCES: {
    HUNT_TILES: new Set(["🦌", "🐗", "🐇"]),
    WOOD_TILES: new Set(["🌳", "🌲", "🌿", "🌱"]),
    WOOD_DEPLETED: "🌱",
    WOOD_REGEN_TO: "🌳",
    STONE_TILES: new Set(["🗻", "🪨", "🧱", "🕳️"]),
    STONE_DEPLETED: "🕳️",
    STONE_REGEN_TO: "🗻",
  },
  MOVES_PER_DAY: 6,
  REGEN_DAYS: { wood: 3, stone: 3, hunt: 2 },
  ZOMBIE: {
    aliveTile: "🧟",
    graveTile: "🪦",
    respawnDays: 5,
    atk: 2,
    hp: 6,
    diceSides: 6,
    goldMin: 1,
    goldMax: 3,
    itemChance: 0.2,
    lootItems: ["💉", "🧪", "🗡️", "🛡️"],
  },
  RESPAWN: { hospitalA1: "D7" },
  BUILD: {
    HOUSE_COST: { wood: 5, stone: 3, gold: 2 },
    HOUSE_ALLOWED_TILES: new Set(["⬜️", "🏚️"]),
    HOUSE_TILE: "🏠",
  },
  ANIMALS: {
    small: { emoji: "🐇", tiles: new Set(["⬜️", "🌿"]) },
    big: { emoji: "🦌", tiles: new Set(["🌳", "🌲", "🌿"]) },
    maxCount: 5,
  },
};

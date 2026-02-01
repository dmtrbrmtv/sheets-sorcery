/*******************************
 * Sheets & Sorcery — Config
 *******************************/

const CFG = {
  SHEETS: {
    map: "🗺 Карта",
    base: "🗺 База (истина)",
    players: "🧙🏼‍♂️Персонажи",
    history: "📜История",
    timers: "⏱Таймеры",
    equip: "🧳Эквип",
    craft: "🧾Крафт",
  },

  GRID: {
    topLeftA1: "C3",
    bottomRightA1: "AB34",
    hudRow: 41,
    hudStartColA1: "C",
    hudEndColA1: "AB",
  },

  FOG: {
    radius: 3,
    fogChar: "🌫️",
    baseEmpty: "⬜️",
  },

  BLOCKED: new Set(["🌊", "🗿", "⛰️", "🌋"]),

  RESOURCES: {
    HUNT_TILES: new Set(["🦌", "🐗", "🐇"]),
  },

  MOVES_PER_DAY: 6,

  REGEN_DAYS: {
    wood: 3,
    stone: 3,
    hunt: 2,
  },

  ZOMBIE: {
    aliveTile: "🧟",
    graveTile: "⚰️",
    respawnDays: 5,

    atk: 2,
    hp: 6,
    diceSides: 6,

    goldMin: 1,
    goldMax: 3,
    itemChance: 0.20,
    lootItems: ["💉", "🧪", "🗡️", "🛡️"],
  },

  RESPAWN: {
    hospitalA1: "D7",
  },

  BUILD: {
    HOUSE_COST: { wood: 5, stone: 3, gold: 2 },
    HOUSE_ALLOWED_TILES: new Set(["⬜️", "🏚️"]),
    HOUSE_TILE: "🏠",
  },
};
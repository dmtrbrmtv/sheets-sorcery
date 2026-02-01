/*******************************
 * Sheets & Sorcery — Config
 *******************************/

/**
 * Helper to split a leading emoji icon from a raw name, e.g. "🧙🏼‍♂️ Dima" -> {icon: "🧙🏼‍♂️", name: "Dima"}
 * If no leading emoji, returns {icon: "", name: trimmed string}
 * Emoji detection tries to catch multi-char emoji (with ZWJ, skin tone, etc).
 */
function splitIconAndName_(raw) {
  if (typeof raw !== "string") return { icon: "", name: "" };
  // Regex covers multi-char emoji clusters at start of string
  // E.g. "🧙🏼‍♂️ Dima", "🐉Anna", etc.
  // See: https://stackoverflow.com/a/58355145/188421
  const emojiRegex = /^(\p{Extended_Pictographic}[\p{Extended_Pictographic}\u200D\uFE0F]*)\s*(.*)$/u;
  const m = raw.match(emojiRegex);
  if (m) {
    const icon = m[1] ? m[1].trim() : "";
    const name = m[2] ? m[2].trim() : "";
    return { icon, name };
  }
  return { icon: "", name: raw.trim() };
}

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
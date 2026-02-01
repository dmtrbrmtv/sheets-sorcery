/*******************************
 * Sheets & Sorcery — Config
 *******************************/

/**
 * Helper to split a leading emoji icon from a raw name, e.g. "🧙🏼‍♂️ Dima" -> {icon: "🧙🏼‍♂️", name: "Dima"}
 * If no leading emoji, returns {icon: "", name: trimmed string}
 * Emoji detection tries to catch multi-char emoji (with ZWJ, skin tone, etc).
 */
function splitIconAndName_(raw) {
  if (!raw) return { icon: "", name: "" };
  let s = String(raw).trim();
  // Regex handles emoji with skin tone modifiers (🏻🏼🏽🏾🏿) and ZWJ sequences
  // Pattern: base emoji + optional skin tone + (ZWJ + emoji + optional skin tone)* + optional variation selector
  const emojiRegex = /^(\p{Extended_Pictographic}(?:\p{Emoji_Modifier})?(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier})?(?:\uFE0F)?)*)\s*/u;
  const match = s.match(emojiRegex);
  if (match && match[1]) {
    const icon = match[1];
    const name = s.slice(match[0].length).trim();
    return { icon, name };
  }
  return { icon: "", name: s };
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
    // Wood sequence: 🌳/🌲 → 🌿 → 🌱 → (timer) → 🌳
    WOOD_TILES: new Set(["🌳", "🌲", "🌿", "🌱"]),
    WOOD_DEPLETED: "🌱",
    WOOD_REGEN_TO: "🌳",
    // Stone sequence: 🗻 → 🪨 → 🧱 → 🕳️ → (timer) → 🗻
    STONE_TILES: new Set(["🗻", "🪨", "🧱", "🕳️"]),
    STONE_DEPLETED: "🕳️",
    STONE_REGEN_TO: "🗻",
  },

  MOVES_PER_DAY: 6,

  REGEN_DAYS: {
    wood: 3,
    stone: 3,
    hunt: 2,
  },

  ZOMBIE: {
    aliveTile: "🧟",
    graveTile: "🪦",  // Headstone tile when zombie is killed
    respawnDays: 5,   // Days until zombie respawns

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
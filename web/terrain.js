// ===== Sheets & Sorcery: Terrain visuals =====
// Muted, parchment/fantasy-map palette (low saturation, calm)

export const TERRAIN_BG = {
  "🌳": "#5a7a58",
  "🌲": "#4a6a50",
  "🌿": "#6a8a6a",
  "🌱": "#6b8a68",
  "⬜️": "#d4c8a8",
  "🌾": "#c8b898",
  "🌊": "#8aa8b8",
  "🗻": "#8a8a82",
  "🪨": "#8e8e86",
  "🧱": "#9a9a92",
  "🕳️": "#7a7a72",
  "🗿": "#7c7c74",
  "⛰️": "#8a8a82",
  "🌋": "#6a5a52",
  "❄️": "#b8d0dc",
  "⛳": "#8aae7a",
  "💠": "#d0b898",
  "🌫️": "#8e8e86",
  "🏠": "#a08870",
  "🏡": "#a08870",
  "🏚️": "#8a7260",
  "🪧": "#c4b898",
  "🏥": "#b09878",
  "🪦": "#7a7a72",
  "🧟": "#5a6a58",
  "🏝️": "#a8c0a8",
  "🟫": "#8a6a4a",
};

export const TERRAIN_NAMES = {
  "🌳": "Лес",
  "🌲": "Лес",
  "🌿": "Поляна",
  "🌱": "Пень",
  "⬜️": "Поле",
  "🌾": "Нива",
  "🌊": "Вода",
  "🗻": "Гора",
  "🪨": "Камень",
  "🧱": "Скала",
  "🕳️": "Шахта",
  "🗿": "Скала",
  "⛰️": "Гора",
  "🌋": "Вулкан",
  "❄️": "Снег",
  "⛳": "Луг",
  "💠": "Пустыня",
  "🏠": "Дом",
  "🏡": "Дом",
  "🏚️": "Развалины",
  "🪧": "Дом мечты!!",
  "🏥": "Больница",
  "🪦": "Могила",
  "🧟": "Зомби",
  "🏝️": "Берег",
  "🟫": "Дорога",
};

export function getTerrainBg(tile) {
  if (!tile) return "#d4c8a8";
  const t = String(tile).trim();
  for (const [emoji, color] of Object.entries(TERRAIN_BG)) {
    if (t.startsWith(emoji)) return color;
  }
  return "#d4c8a8";
}

export function getTerrainName(tile) {
  if (!tile) return "—";
  const t = String(tile).trim();
  for (const [emoji, name] of Object.entries(TERRAIN_NAMES)) {
    if (t.startsWith(emoji)) return name;
  }
  return t.slice(0, 2) || "—";
}

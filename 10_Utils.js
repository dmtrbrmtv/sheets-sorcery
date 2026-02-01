/*******************************
 * Sheets & Sorcery — Utils
 *******************************/

function dirToDelta_(dir) {
  if (dir === "N") return { dx: 0, dy: -1 };
  if (dir === "S") return { dx: 0, dy: 1 };
  if (dir === "E") return { dx: 1, dy: 0 };
  if (dir === "W") return { dx: -1, dy: 0 };
  return null;
}

// первый эмодзи + VS16 (⚰️ и т.д.)
function baseTile_(cellValue) {
  if (!cellValue) return CFG.FOG.baseEmpty;
  const s = String(cellValue).trim();
  if (!s) return CFG.FOG.baseEmpty;

  const a = Array.from(s);
  let t = a[0] || CFG.FOG.baseEmpty;
  if (a[1] === "\uFE0F") t += a[1];
  return t;
}

// x,y (1..W,1..H) -> A1 (C3 = 1,1)
function xyToA1_(x, y) {
  const start = CFG.GRID.topLeftA1;
  const startCol = start.replace(/[0-9]/g, "");
  const startRow = Number(start.replace(/[A-Z]/gi, ""));
  const colNum = colToNum_(startCol) + (x - 1);
  const rowNum = startRow + (y - 1);
  return `${numToCol_(colNum)}${rowNum}`;
}

function colToNum_(col) {
  let n = 0;
  const s = String(col).toUpperCase();
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n;
}

function numToCol_(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function findColExact_(header, names) {
  for (const n of names) {
    const idx = header.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
}

function findColContains_(header, parts) {
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    for (const p of parts) {
      if (String(h).includes(p)) return i;
    }
  }
  return -1;
}

function num_(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function randInt_(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function costToString_(cost) {
  const order = ["wood", "stone", "gold", "food", "water", "herb", "fish"];
  const emoji = { wood: "🪵", stone: "🪨", gold: "💰", food: "🍖", water: "💧", herb: "🌿", fish: "🐟" };
  return order.filter(k => cost[k]).map(k => `${emoji[k]}${cost[k]}`).join(" ");
}

function a1ToXY_(a1) {
  const m = String(a1 || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;

  const colLetters = m[1];
  const rowNum = Number(m[2]);

  const start = CFG.GRID.topLeftA1;
  const startCol = start.replace(/[0-9]/g, "").toUpperCase();
  const startRow = Number(start.replace(/[A-Z]/gi, ""));

  const colNum = colToNum_(colLetters);
  const startColNum = colToNum_(startCol);

  const x = (colNum - startColNum) + 1;
  const y = (rowNum - startRow) + 1;

  return { x, y };
}
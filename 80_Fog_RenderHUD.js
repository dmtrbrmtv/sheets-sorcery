/*******************************
 * Sheets & Sorcery — Fog + Render + HUD
 *******************************/

function updateFog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const shMap = getSheet_(ss, CFG.SHEETS.map);
  const shBase = getSheet_(ss, CFG.SHEETS.base);

  const baseVals = gridRange_(shBase).getValues();
  const w = baseVals[0].length;
  const h = baseVals.length;

  const visibleNow = buildVisibleSet_(ss, w, h);
  persistReveal_(visibleNow);
  const revealed = getReveal_();

  const out = [];
  for (let yy = 1; yy <= h; yy++) {
    const row = [];
    for (let xx = 1; xx <= w; xx++) {
      const key = `${xx},${yy}`;
      if (revealed.has(key)) row.push(baseTile_(baseVals[yy - 1][xx - 1]));
      else row.push(CFG.FOG.fogChar);
    }
    out.push(row);
  }

  ensureEntities_(ss, w, h);

  const animals = getAnimals_();
  const npcs = getNpcs_();
  const players = readPlayers_(ss);
  const playerCells = new Set(players.map(p => `${p.x},${p.y}`));

  animals.forEach(a => {
    if (a.x < 1 || a.y < 1 || a.x > w || a.y > h) return;
    const key = `${a.x},${a.y}`;
    if (!revealed.has(key)) return;
    if (playerCells.has(key)) return;
    const tile = baseTile_(out[a.y - 1][a.x - 1]);
    out[a.y - 1][a.x - 1] = tile + (a.emoji || "🐇");
  });

  npcs.forEach(n => {
    if (n.x < 1 || n.y < 1 || n.x > w || n.y > h) return;
    const key = `${n.x},${n.y}`;
    if (!revealed.has(key)) return;
    if (playerCells.has(key)) return;
    const tile = baseTile_(out[n.y - 1][n.x - 1]);
    out[n.y - 1][n.x - 1] = tile + n.emoji;
  });

  players.forEach(p => {
    if (!p.icon) return;
    if (p.x < 1 || p.y < 1 || p.x > w || p.y > h) return;
    const key = `${p.x},${p.y}`;
    if (!revealed.has(key)) return;

    const tile = baseTile_(out[p.y - 1][p.x - 1]);
    out[p.y - 1][p.x - 1] = tile + p.icon;
  });

  gridRange_(shMap).setValues(out);

  syncToolFlags_(ss);
  renderHud_(ss);
  updateDayCell_(ss);

  SpreadsheetApp.flush();
  if (activeSheet) ss.setActiveSheet(activeSheet);
}

function jumpToMe() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);
  const shMap = getSheet_(ss, CFG.SHEETS.map);
  shMap.setActiveSelection(xyToA1_(actor.x, actor.y));
}

function renderHud_(ss) {
  const shMap = getSheet_(ss, CFG.SHEETS.map);
  const players = readPlayers_(ss);

  const IDX = {
    name: 0,      // C
    where: 2,     // E
    hp: 3,        // F
    moves: 4,     // G
    atk: 5,       // H
    armor: 6,     // I
    gold: 7,      // J
    herb: 8,      // K
    food: 9,      // L
    water: 10,    // M
    fish: 11,     // N
    wood: 12,     // O
    stone: 13,    // P
    status: 16,   // S
    penalty: 21   // X
  };

  const totalCols = colToNum_(CFG.GRID.hudEndColA1) - colToNum_(CFG.GRID.hudStartColA1) + 1;
  const header = Array(totalCols).fill("");

  header[IDX.name] = "Имя";
  header[IDX.where] = "📍";
  header[IDX.hp] = "❤️";
  header[IDX.moves] = "👣";
  header[IDX.atk] = "⚔️";
  header[IDX.armor] = "🛡️";
  header[IDX.gold] = "💰";
  header[IDX.herb] = "🌿";
  header[IDX.food] = "🍖";
  header[IDX.water] = "💧";
  header[IDX.fish] = "🐟";
  header[IDX.wood] = "🪵";
  header[IDX.stone] = "🪨";
  header[IDX.status] = "🌀";
  header[IDX.penalty] = "💢";

  const startCol = colToNum_(CFG.GRID.hudStartColA1);
  shMap.getRange(CFG.GRID.hudRow, startCol, 1, totalCols).setValues([header]);

  const rows = players.map(p => {
    const r = Array(totalCols).fill("");
    r[IDX.name] = p.icon ? `${p.icon} ${p.name}` : p.name;
    r[IDX.where] = xyToA1_(p.x, p.y);
    r[IDX.hp] = `${p.hp}/${p.maxhp}`;
    r[IDX.moves] = `${p.moves}/${CFG.MOVES_PER_DAY}`;
    r[IDX.atk] = p.atk;
    r[IDX.armor] = p.armor;

    r[IDX.gold] = p.gold;
    r[IDX.herb] = p.herb;
    r[IDX.food] = p.food;
    r[IDX.water] = p.water;
    r[IDX.fish] = p.fish;
    r[IDX.wood] = p.wood;
    r[IDX.stone] = p.stone;

    r[IDX.status] = p.status || "";
    r[IDX.penalty] = p.penalty || "";
    return r;
  });

  const maxClear = 40;
  shMap.getRange(CFG.GRID.hudRow + 1, startCol, maxClear, totalCols).clearContent();
  if (rows.length) shMap.getRange(CFG.GRID.hudRow + 1, startCol, rows.length, totalCols).setValues(rows);
}

// -------------------- MEMORY FOG --------------------
function buildVisibleSet_(ss, w, h) {
  const active = getActivePlayers_(ss);
  const r = CFG.FOG.radius;
  const visible = new Set();

  active.forEach(p => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = p.x + dx;
        const y = p.y + dy;
        if (x >= 1 && y >= 1 && x <= w && y <= h) visible.add(`${x},${y}`);
      }
    }
  });

  return visible;
}

function persistReveal_(visibleNow) {
  const props = PropertiesService.getDocumentProperties();
  const prev = getReveal_();
  visibleNow.forEach(k => prev.add(k));
  props.setProperty("revealSet", JSON.stringify(Array.from(prev)));
}

function getReveal_() {
  const props = PropertiesService.getDocumentProperties();
  const raw = props.getProperty("revealSet");
  if (!raw) return new Set();
  try { return new Set(JSON.parse(raw)); } catch (e) { return new Set(); }
}

function clearReveal_() {
  PropertiesService.getDocumentProperties().deleteProperty("revealSet");
}
/*******************************
 * Sheets & Sorcery — Actions
 *******************************/

// -------------------- MOVE --------------------
function moveN() { move_("N"); }
function moveS() { move_("S"); }
function moveW() { move_("W"); }
function moveE() { move_("E"); }

function move_(dir) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  const delta = dirToDelta_(dir);
  if (!delta) throw new Error("Направление должно быть N/S/E/W.");

  if (actor.moves <= 0) {
    writeHistory_(ss, actor.name, "👣0", "Пытался сделать ход, но ходы закончились", "", "");
    return;
  }

  const x = actor.x, y = actor.y;
  const nx = x + delta.dx;
  const ny = y + delta.dy;

  const tile = readBaseTile_(ss, nx, ny);
  if (tile === null) {
    writeHistory_(ss, actor.name, "🧱", `Упёрся в границу карты (${nx},${ny})`, "", "");
    return;
  }
  if (CFG.BLOCKED.has(tile)) {
    writeHistory_(ss, actor.name, tile, `Упёрся в непроходимую клетку (${nx},${ny})`, "", "");
    return;
  }

  setPlayerXYMoves_(ss, actor.row, nx, ny, actor.moves - 1);
  setStatus_(ss, actor.row, "🚶");
  writeHistory_(ss, actor.name, `👣-1, ${tile}`, `Переместился (${x},${y}) → (${nx},${ny})`, "", "");

  handleEncounter_(ss, actor.name);

  updateFog();
}

// -------------------- ДОБЫЧА --------------------
// Вариант A: стадии
// дерево: 🌳/🌲 -> 🌿 -> 🌱 -> (таймер) -> 🌳
// камень: 🗻 -> 🪨 -> 🧱 -> 🕳️ (таймер) -> 🗻

function doChopWood() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  if (actor.moves <= 0) { writeHistory_(ss, actor.name, "👣0", "Нет ходов", "", ""); return; }

  const tile = readBaseTile_(ss, actor.x, actor.y);

  if (!tile || !new Set(["🌳","🌲","🌿","🌱"]).has(tile)) {
    writeHistory_(ss, actor.name, "🪵0", "Рубка только на 🌳/🌲/🌿/🌱", "", "");
    return;
  }

  if (tile === "🌱" && hasTimerAt_(ss, actor.x, actor.y)) {
    writeHistory_(ss, actor.name, "⏳", "Пень отдыхает", "", "");
    return;
  }

  const bonus = hasItem_(ss, actor.name, "🪓") ? 1 : 0;
  const gained = 1 + bonus;

  addResource_(ss, actor.row, "wood", gained);
  setPlayerMoves_(ss, actor.row, actor.moves - 1);
  setStatus_(ss, actor.row, "🪓");

  let nextTile = tile;
  let startTimer = false;

  if (tile === "🌳" || tile === "🌲") nextTile = "🌿";
  else if (tile === "🌿") nextTile = "🌱";
  else if (tile === "🌱") { nextTile = "🌱"; startTimer = true; }

  setBaseTile_(ss, actor.x, actor.y, nextTile);

  let timerInfo = "";
  if (startTimer) {
    addTimer_(ss, actor.x, actor.y, "🌳", CFG.REGEN_DAYS.wood, "wood", actor.name);
    timerInfo = `⏱️${CFG.REGEN_DAYS.wood}`;
  }

  writeHistory_(
    ss,
    actor.name,
    `🪵+${gained}${bonus ? " (🪓)" : ""}`,
    `${tile}→${nextTile}`,
    "",
    timerInfo
  );

  updateFog();
}

function doQuarry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  if (actor.moves <= 0) { writeHistory_(ss, actor.name, "👣0", "Нет ходов", "", ""); return; }

  const tile = readBaseTile_(ss, actor.x, actor.y);

  if (!tile || !new Set(["🗻","🪨","🧱","🕳️"]).has(tile)) {
    writeHistory_(ss, actor.name, "🪨0", "Каменоломня только на 🗻/🪨/🧱", "", "");
    return;
  }

  if (tile === "🕳️" && hasTimerAt_(ss, actor.x, actor.y)) {
    writeHistory_(ss, actor.name, "⏳", "Шахта отдыхает", "", "");
    return;
  }

  const bonus = hasItem_(ss, actor.name, "⛏️") ? 1 : 0;
  const gained = 1 + bonus;

  addResource_(ss, actor.row, "stone", gained);
  setPlayerMoves_(ss, actor.row, actor.moves - 1);
  setStatus_(ss, actor.row, "⛏️");

  let nextTile = tile;
  let startTimer = false;

  if (tile === "🗻") nextTile = "🪨";
  else if (tile === "🪨") nextTile = "🧱";
  else if (tile === "🧱") { nextTile = "🕳️"; startTimer = true; }
  else if (tile === "🕳️") { nextTile = "🕳️"; startTimer = true; }

  setBaseTile_(ss, actor.x, actor.y, nextTile);

  let timerInfo = "";
  if (startTimer) {
    addTimer_(ss, actor.x, actor.y, "🗻", CFG.REGEN_DAYS.stone, "stone", actor.name);
    timerInfo = `⏱️${CFG.REGEN_DAYS.stone}`;
  }

  writeHistory_(
    ss,
    actor.name,
    `🪨+${gained}${bonus ? " (⛏️)" : ""}`,
    `${tile}→${nextTile}`,
    "",
    timerInfo
  );

  updateFog();
}

function doHunt() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  if (actor.moves <= 0) { writeHistory_(ss, actor.name, "👣0", "Нет ходов", "", ""); return; }

  const tile = readBaseTile_(ss, actor.x, actor.y);
  if (!tile || !CFG.RESOURCES.HUNT_TILES.has(tile)) {
    writeHistory_(ss, actor.name, "🍖0", "Охота только на 🦌/🐗/🐇", "", "");
    return;
  }

  const gained = randInt_(1, 2);
  addResource_(ss, actor.row, "food", gained);
  setPlayerMoves_(ss, actor.row, actor.moves - 1);
  setStatus_(ss, actor.row, "🏹");

  setBaseTile_(ss, actor.x, actor.y, "⬜️");
  addTimer_(ss, actor.x, actor.y, tile, CFG.REGEN_DAYS.hunt, "hunt", actor.name);

  writeHistory_(
    ss,
    actor.name,
    `🍖+${gained}`,
    `${tile}→⬜️`,
    "",
    `⏱️${CFG.REGEN_DAYS.hunt}`
  );

  updateFog();
}

function doFish() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  if (actor.moves <= 0) { writeHistory_(ss, actor.name, "👣0", "Нет ходов", "", ""); return; }

  const near = [
    readBaseTile_(ss, actor.x + 1, actor.y),
    readBaseTile_(ss, actor.x - 1, actor.y),
    readBaseTile_(ss, actor.x, actor.y + 1),
    readBaseTile_(ss, actor.x, actor.y - 1),
  ].filter(Boolean);

  const ok = near.some(t => t === "🌊");
  if (!ok) {
    writeHistory_(ss, actor.name, "🐟0", "Рыбалка только рядом с 🌊", "", "");
    return;
  }

  const gained = randInt_(0, 2);
  addResource_(ss, actor.row, "fish", gained);
  setPlayerMoves_(ss, actor.row, actor.moves - 1);
  setStatus_(ss, actor.row, "🎣");

  writeHistory_(ss, actor.name, `🐟+${gained}`, "🎣", "", "");
  updateFog();
}

// -------------------- ДОМ --------------------
function buildHouse() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actor = getActiveActor_(ss);

  if (actor.moves <= 0) { writeHistory_(ss, actor.name, "👣0", "Нет ходов", "", ""); return; }

  const tile = readBaseTile_(ss, actor.x, actor.y);
  if (!tile || !CFG.BUILD.HOUSE_ALLOWED_TILES.has(tile)) {
    writeHistory_(ss, actor.name, "🏠0", "Дом можно строить на ⬜️ или 🏚️", "", "");
    return;
  }

  const cost = CFG.BUILD.HOUSE_COST;
  const cur = getPlayerResources_(ss, actor.row);
  for (const k in cost) {
    if ((cur[k] || 0) < cost[k]) {
      writeHistory_(ss, actor.name, "❌", "Не хватает ресурсов на 🏠", costToString_(cost), "");
      return;
    }
  }

  for (const k in cost) addResource_(ss, actor.row, k, -cost[k]);

  setBaseTile_(ss, actor.x, actor.y, CFG.BUILD.HOUSE_TILE);
  setPlayerMoves_(ss, actor.row, actor.moves - 1);
  setStatus_(ss, actor.row, "🏠");

  writeHistory_(ss, actor.name, "🏠", `${tile}→🏠`, costToString_(cost), "");
  updateFog();
}
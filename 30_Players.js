/*******************************
 * Sheets & Sorcery — Players / Equip
 *******************************/

// -------------------- ACTIVE --------------------
function setActiveOnlyMe() {
  const p = PropertiesService.getDocumentProperties();
  p.setProperty("activeMode", "me");
  p.setProperty("activeCount", "1");
  updateFog();
}

function setActiveFirst5() {
  const p = PropertiesService.getDocumentProperties();
  p.setProperty("activeMode", "firstN");
  p.setProperty("activeCount", "5");
  updateFog();
}

function getActiveActor_(ss) {
  const active = getActivePlayers_(ss);
  if (!active.length) throw new Error("Нет активных игроков. Проверь 🧙🏼‍♂️Персонажи.");
  return active[0];
}

function getActivePlayers_(ss) {
  const p = PropertiesService.getDocumentProperties();
  const mode = p.getProperty("activeMode") || "me";
  const count = Number(p.getProperty("activeCount") || "1");
  const players = readPlayers_(ss);
  if (mode === "firstN") return players.slice(0, Math.max(1, count));
  return players.slice(0, 1);
}

function readPlayers_(ss) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  const header = data[0].map(v => String(v || "").trim());

  const col = {
    name: findColExact_(header, ["Персонаж", "Игрок", "Name"]),
    icon: findColExact_(header, ["Icon", "🙂", "Иконка"]),

    hp: findColContains_(header, ["❤️HP", "HP", "❤️"]),
    maxhp: findColContains_(header, ["❤️Max", "Max"]),

    atk: findColContains_(header, ["⚔️Atk", "Atk", "⚔️"]),
    armor: findColContains_(header, ["🛡Armor", "Armor", "🛡"]),

    gold: findColContains_(header, ["💰Gold", "Gold", "💰"]),
    herb: findColContains_(header, ["🌿Herb", "Herb", "🌿"]),
    food: findColContains_(header, ["🍖Food", "Food", "🍖"]),
    water: findColContains_(header, ["💧Water", "Water", "💧"]),
    fish: findColContains_(header, ["🐟Fish", "Fish", "🐟"]),
    wood: findColContains_(header, ["🪵Wood", "Wood", "🪵"]),
    stone: findColContains_(header, ["🪨Stone", "Stone", "🪨"]),

    moves: findColContains_(header, ["👣Ходы", "Ходы", "👣"]),
    x: findColExact_(header, ["X"]),
    y: findColExact_(header, ["Y"]),

    status: findColContains_(header, ["🌀Статус", "🌀", "Статус"]),
    penalty: findColContains_(header, ["💢Штрафы", "💢", "Штраф"]),
  };

  ["name", "hp", "moves", "x", "y"].forEach(k => {
    if (col[k] === -1) throw new Error(`В 🧙🏼‍♂️Персонажи не найдена колонка: ${k}`);
  });

  const res = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rawName = String(row[col.name] || "").trim();
    if (!rawName) continue;

    const split = splitIconAndName_(rawName);
    let icon = split.icon;
    let name = split.name;
    // Fallback/backward compatibility:
    //  - If no leading emoji found, fall back to icon column (if present)
    if (!icon) {
      icon = col.icon !== -1 ? String(row[col.icon] || "").trim() : "";
    }
    // Ensure icon is not an email
    if (icon.includes("@")) icon = "";
    // name should always be non-empty, but protect: if stripping emoji produces empty name, use fallback rawName
    if (!name) name = rawName;

    res.push({
      row: i + 1,
      name,
      icon,
      hp: col.hp !== -1 ? num_(row[col.hp], 1) : 1,
      maxhp: col.maxhp !== -1 ? num_(row[col.maxhp], 1) : (col.hp !== -1 ? num_(row[col.hp], 1) : 1),
      atk: col.atk !== -1 ? num_(row[col.atk], 0) : 0,
      armor: col.armor !== -1 ? num_(row[col.armor], 0) : 0,
      gold: col.gold !== -1 ? num_(row[col.gold], 0) : 0,
      herb: col.herb !== -1 ? num_(row[col.herb], 0) : 0,
      food: col.food !== -1 ? num_(row[col.food], 0) : 0,
      water: col.water !== -1 ? num_(row[col.water], 0) : 0,
      fish: col.fish !== -1 ? num_(row[col.fish], 0) : 0,
      wood: col.wood !== -1 ? num_(row[col.wood], 0) : 0,
      stone: col.stone !== -1 ? num_(row[col.stone], 0) : 0,
      moves: num_(row[col.moves], 0),
      x: num_(row[col.x], 1),
      y: num_(row[col.y], 1),
      status: col.status !== -1 ? String(row[col.status] || "").trim() : "",
      penalty: col.penalty !== -1 ? String(row[col.penalty] || "").trim() : "",
    });
  }

  return res;
}

function setPlayerXYMoves_(ss, sheetRow, x, y, moves) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const colX = findColExact_(header, ["X"]);
  const colY = findColExact_(header, ["Y"]);
  const colM = findColContains_(header, ["Ходы", "👣"]);
  sh.getRange(sheetRow, colX + 1).setValue(x);
  sh.getRange(sheetRow, colY + 1).setValue(y);
  sh.getRange(sheetRow, colM + 1).setValue(moves);
}

function setPlayerMoves_(ss, sheetRow, moves) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const colM = findColContains_(header, ["Ходы", "👣"]);
  sh.getRange(sheetRow, colM + 1).setValue(moves);
}

function setStatus_(ss, sheetRow, statusText) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const col = findColContains_(header, ["🌀Статус", "🌀", "Статус"]);
  if (col === -1) return;
  sh.getRange(sheetRow, col + 1).setValue(statusText);
}

function addResource_(ss, sheetRow, key, delta) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const map = {
    gold: ["Gold", "💰"],
    herb: ["Herb", "🌿"],
    food: ["Food", "🍖"],
    water: ["Water", "💧"],
    fish: ["Fish", "🐟"],
    wood: ["Wood", "🪵"],
    stone: ["Stone", "🪨"],
  };
  const col = findColContains_(header, map[key] || [key]);
  if (col === -1) throw new Error(`Не найдена колонка ресурса: ${key}`);
  const cur = num_(sh.getRange(sheetRow, col + 1).getValue(), 0);
  sh.getRange(sheetRow, col + 1).setValue(cur + delta);
}

function addStat_(ss, sheetRow, key, delta) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const map = {
    atk: ["Atk", "⚔️"],
    armor: ["Armor", "🛡"],
  };
  const col = findColContains_(header, map[key] || [key]);
  if (col === -1) return;
  const cur = num_(sh.getRange(sheetRow, col + 1).getValue(), 0);
  sh.getRange(sheetRow, col + 1).setValue(cur + delta);
}

function getPlayerResources_(ss, sheetRow) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());

  const get = (names) => {
    const c = findColContains_(header, names);
    if (c === -1) return 0;
    return num_(sh.getRange(sheetRow, c + 1).getValue(), 0);
  };

  return {
    gold: get(["Gold", "💰"]),
    herb: get(["Herb", "🌿"]),
    food: get(["Food", "🍖"]),
    water: get(["Water", "💧"]),
    fish: get(["Fish", "🐟"]),
    wood: get(["Wood", "🪵"]),
    stone: get(["Stone", "🪨"]),
  };
}

// -------------------- ЭКВИП + ФЛАГИ --------------------
function ensureEquipHeader_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet_(ss, CFG.SHEETS.equip);
  const v = sh.getDataRange().getValues();
  if (!v.length || !String(v[0][0] || "")) {
    sh.getRange(1, 1, 1, 3).setValues([["Кто", "Предмет", "Заметка"]]);
  }
}

function addItem_(ss, playerName, itemEmoji, note) {
  const sh = ensureSheet_(ss, CFG.SHEETS.equip);
  ensureEquipHeader_();
  sh.appendRow([playerName, itemEmoji, note || ""]);
}

function hasItem_(ss, playerName, itemEmoji) {
  const sh = getSheet_(ss, CFG.SHEETS.equip);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return false;

  const head = values[0].map(v => String(v || "").trim());
  const cWho = head.indexOf("Кто");
  const cItem = head.indexOf("Предмет");
  if (cWho === -1 || cItem === -1) return false;

  for (let i = 1; i < values.length; i++) {
    const who = String(values[i][cWho] || "").trim();
    const it = String(values[i][cItem] || "").trim();
    if (who === playerName && it.includes(itemEmoji)) return true;
  }
  return false;
}

function syncToolFlags_(ss) {
  const shP = getSheet_(ss, CFG.SHEETS.players);
  const shE = getSheet_(ss, CFG.SHEETS.equip);
  const pData = shP.getDataRange().getValues();
  if (pData.length < 2) return;

  const head = pData[0].map(v => String(v || "").trim());
  const colName = findColExact_(head, ["Персонаж","Игрок","Name"]);
  const colAxe = findColContains_(head, ["🪓Axe","Axe","🪓"]);
  const colPick = findColContains_(head, ["⛏️Pick","Pick","⛏️"]);
  if (colName === -1 || colAxe === -1 || colPick === -1) return;

  const eData = shE.getDataRange().getValues();
  const eHead = (eData[0] || []).map(v => String(v || "").trim());
  const eWho = eHead.indexOf("Кто");
  const eItem = eHead.indexOf("Предмет");
  if (eWho === -1 || eItem === -1) return;

  const itemsByWho = new Map();
  for (let i = 1; i < eData.length; i++) {
    const who = String(eData[i][eWho] || "").trim();
    const it = String(eData[i][eItem] || "").trim();
    if (!who || !it) continue;
    if (!itemsByWho.has(who)) itemsByWho.set(who, []);
    itemsByWho.get(who).push(it);
  }

  for (let r = 1; r < pData.length; r++) {
    const name = String(pData[r][colName] || "").trim();
    if (!name) continue;

    const arr = itemsByWho.get(name) || [];
    const hasAxe = arr.some(s => String(s).includes("🪓"));
    const hasPick = arr.some(s => String(s).includes("⛏️"));

    shP.getRange(r + 1, colAxe + 1).setValue(!!hasAxe);
    shP.getRange(r + 1, colPick + 1).setValue(!!hasPick);
  }
}

// -------------------- COLUMNS ENSURE --------------------
function ensurePlayersColumns_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = getSheet_(ss, CFG.SHEETS.players);
  let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());

  const need = [
    "🙂",
    "❤️HP", "❤️Max", "⚔️Atk", "🛡Armor",
    "💰Gold", "🌿Herb", "🍖Food", "💧Water", "🐟Fish", "🪵Wood", "🪨Stone",
    "👣Ходы", "X", "Y", "🌀Статус", "💢Штрафы",
    "🪓Axe", "⛏️Pick"
  ];

  need.forEach(n => {
    if (!header.includes(n)) {
      sh.insertColumnAfter(sh.getLastColumn());
      sh.getRange(1, sh.getLastColumn()).setValue(n);
      header.push(n);
    }
  });

  header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const colMoves = findColContains_(header, ["Ходы", "👣"]);
  const last = sh.getLastRow();
  if (colMoves !== -1 && last >= 2) {
    const rng = sh.getRange(2, colMoves + 1, last - 1, 1);
    const vals = rng.getValues();
    for (let i = 0; i < vals.length; i++) {
      if (vals[i][0] === "" || vals[i][0] === null) vals[i][0] = CFG.MOVES_PER_DAY;
    }
    rng.setValues(vals);
  }
}

function setPlayerHp_(ss, sheetRow, hp) {
  const sh = getSheet_(ss, CFG.SHEETS.players);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
  const colHp = findColContains_(header, ["❤️HP", "HP", "❤️"]);
  if (colHp === -1) return;
  sh.getRange(sheetRow, colHp + 1).setValue(hp);
}
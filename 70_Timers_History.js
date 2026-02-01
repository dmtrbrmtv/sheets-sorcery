/*******************************
 * Sheets & Sorcery — Timers + History + Days
 *******************************/

// -------------------- ТАЙМЕРЫ --------------------
function ensureTimersHeader_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet_(ss, CFG.SHEETS.timers);
  const v = sh.getDataRange().getValues();
  if (!v.length || !String(v[0][0] || "")) {
    sh.getRange(1, 1, 1, 7).setValues([["X", "Y", "RestoreTile", "DaysLeft", "Reason", "Who", "When"]]);
  }
}

/**
 * Совместимо со старыми вызовами:
 * addTimer_(ss,x,y,tile,days)
 * addTimer_(ss,x,y,tile,days,reason,who)
 */
function addTimer_(ss, x, y, restoreTile, days, reason, who) {
  const sh = ensureSheet_(ss, CFG.SHEETS.timers);
  ensureTimersHeader_();
  sh.appendRow([x, y, restoreTile, days, reason || "regen", who || "", new Date()]);
}

function hasTimerAt_(ss, x, y) {
  const sh = ss.getSheetByName(CFG.SHEETS.timers);
  if (!sh) return false;
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return false;

  for (let i = 1; i < data.length; i++) {
    const tx = Number(data[i][0]);
    const ty = Number(data[i][1]);
    const daysLeft = Number(data[i][3]);
    if (tx === x && ty === y && daysLeft > 0) return true;
  }
  return false;
}

function tickTimers_(ss) {
  const sh = ss.getSheetByName(CFG.SHEETS.timers);
  if (!sh) return;

  const data = sh.getDataRange().getValues();
  if (data.length < 2) return;

  const keep = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const x = num_(data[i][0], 0);
    const y = num_(data[i][1], 0);
    const tile = String(data[i][2] || "").trim();
    let days = num_(data[i][3], 0);

    days -= 1;
    if (days <= 0) {
      if (x > 0 && y > 0 && tile) setBaseTile_(ss, x, y, tile);
    } else {
      const reason = String(data[i][4] || "").trim();
      const who = String(data[i][5] || "").trim();
      keep.push([x, y, tile, days, reason || "regen", who || "", new Date()]);
    }
  }

  sh.clear();
  sh.getRange(1, 1, 1, 7).setValues([["X", "Y", "RestoreTile", "DaysLeft", "Reason", "Who", "When"]]);
  if (keep.length > 1) sh.getRange(2, 1, keep.length - 1, 7).setValues(keep.slice(1));
}

// -------------------- ИСТОРИЯ --------------------
function ensureHistoryHeader_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet_(ss, CFG.SHEETS.history);
  const v = sh.getDataRange().getValues();
  if (!v.length || !String(v[0][0] || "")) {
    sh.getRange(1, 1, 1, 6).setValues([["Кто", "Что", "Получил", "Карта", "Таймер", "Когда"]]);
  }
}

function writeHistory_(ss, who, got, what, mapInfo, timerInfo) {
  const sh = ensureSheet_(ss, CFG.SHEETS.history);
  ensureHistoryHeader_();
  sh.appendRow([who, what, got || "", mapInfo || "", timerInfo || "", new Date()]);
}

// -------------------- ДНИ --------------------
function newDayMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  tickTimers_(ss);

  const active = getActivePlayers_(ss);
  active.forEach(p => setPlayerMoves_(ss, p.row, CFG.MOVES_PER_DAY));

  writeHistory_(ss, "🧙‍♂️Мастер", "🎆", `Новый день: 👣=${CFG.MOVES_PER_DAY}`, "", "");
  updateFog();
}

function skipWeek() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const DAYS = 7;

  for (let day = 1; day <= DAYS; day++) {
    tickTimers_(ss);

    const active = getActivePlayers_(ss);
    active.forEach(p => {
      setPlayerMoves_(ss, p.row, CFG.MOVES_PER_DAY);
    });
  }

  writeHistory_(ss, "🧙‍♂️Мастер", "⏩", `Прошла неделя (${DAYS} дней)`, "", "");
  updateFog();
}
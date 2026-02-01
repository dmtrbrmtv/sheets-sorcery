/*******************************
 * Sheets & Sorcery — Setup
 *******************************/

function setupFirstRun() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getSheet_(ss, CFG.SHEETS.map);
  ensureSheet_(ss, CFG.SHEETS.base);
  getSheet_(ss, CFG.SHEETS.players);
  ensureSheet_(ss, CFG.SHEETS.history);
  ensureSheet_(ss, CFG.SHEETS.timers);
  ensureSheet_(ss, CFG.SHEETS.equip);
  ensureSheet_(ss, CFG.SHEETS.craft);

  ensurePlayersColumns_();
  ensureHistoryHeader_();
  ensureTimersHeader_();
  ensureEquipHeader_();
  refreshCraftSheet();

  updateFog();
}

function syncBaseFromMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shMap = getSheet_(ss, CFG.SHEETS.map);
  const shBase = getSheet_(ss, CFG.SHEETS.base);

  const mapVals = gridRange_(shMap).getValues();
  const out = mapVals.map(row => row.map(v => baseTile_(v)));
  gridRange_(shBase).setValues(out);

  clearReveal_();
  updateFog();
  writeHistory_(ss, "🧙‍♂️Мастер", "🧲", "Sync Base выполнен", "", "");
}
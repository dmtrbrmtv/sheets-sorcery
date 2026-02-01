/*******************************
 * Sheets & Sorcery — Sheets helpers
 *******************************/

function getSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Не найден лист '${name}'.`);
  return sh;
}

function ensureSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function gridRange_(sh) {
  return sh.getRange(`${CFG.GRID.topLeftA1}:${CFG.GRID.bottomRightA1}`);
}
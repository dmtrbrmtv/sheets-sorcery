/*******************************
 * Sheets & Sorcery — Base (истина)
 *******************************/

function readBaseTile_(ss, x, y) {
	const shBase = getSheet_(ss, CFG.SHEETS.base);
	const rg = gridRange_(shBase);
	const w = rg.getNumColumns();
	const h = rg.getNumRows();
	if (x < 1 || y < 1 || x > w || y > h) return null;

	const v = shBase.getRange(xyToA1_(x, y)).getValue();
	return baseTile_(v);
}

function setBaseTile_(ss, x, y, tile) {
	const shBase = getSheet_(ss, CFG.SHEETS.base);
	const w = gridRange_(shBase).getNumColumns();
	const h = gridRange_(shBase).getNumRows();
	if (x < 1 || y < 1 || x > w || y > h) return;
	shBase.getRange(xyToA1_(x, y)).setValue(tile);
}

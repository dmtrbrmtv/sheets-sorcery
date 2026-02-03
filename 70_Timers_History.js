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
	const sh = getSheet_(ss, CFG.SHEETS.timers);
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
	const sh = getSheet_(ss, CFG.SHEETS.timers);
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
function ensureHistoryHeader_(ss) {
	const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
	const sh = ensureSheet_(spreadsheet, CFG.SHEETS.history);
	const v = sh.getDataRange().getValues();
	if (!v.length || !String(v[0][0] || "")) {
		sh.getRange(1, 1, 1, 6).setValues([["Кто", "Что", "Получил", "Карта", "Таймер", "Когда"]]);
	}
}

function writeHistory_(ss, who, got, what, mapInfo, timerInfo) {
	const sh = ensureSheet_(ss, CFG.SHEETS.history);
	ensureHistoryHeader_(ss);
	const data = sh.getDataRange().getValues();
	const header = data.length ? [data[0]] : [["Кто", "Что", "Получил", "Карта", "Таймер", "Когда"]];
	const rows = data.length > 1 ? data.slice(1) : [];
	const newRow = [who, what, got || "", mapInfo || "", timerInfo || "", new Date()];
	const all = header.concat([newRow], rows).slice(0, 201);
	const numRows = all.length;
	sh.getRange(1, 1, numRows, 6).setValues(all);
	if (data.length > numRows) sh.getRange(numRows + 1, 1, data.length - numRows, 6).clearContent();
}

// -------------------- ДНИ --------------------
function getDay_() {
	const p = PropertiesService.getDocumentProperties();
	return Number(p.getProperty("currentDay") || "1");
}

function setDay_(n) {
	const p = PropertiesService.getDocumentProperties();
	p.setProperty("currentDay", String(n));
}

function updateDayCell_(ss) {
	const day = getDay_();
	const shMap = getSheet_(ss, CFG.SHEETS.map);
	shMap.getRange("C39").setValue(`День ${day}`);
	SpreadsheetApp.flush();
}

function newDayMaster() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();

	tickTimers_(ss);

	const rg = gridRange_(getSheet_(ss, CFG.SHEETS.base));
	const w = rg.getNumColumns();
	const h = rg.getNumRows();
	moveNpcs_(ss, w, h);

	const active = getActivePlayers_(ss);
	active.forEach((p) => {
		setPlayerMoves_(ss, p.row, CFG.MOVES_PER_DAY);
		const newHp = Math.min(p.maxhp || 10, (p.hp || 1) + 1);
		if (newHp > (p.hp || 1)) setPlayerHp_(ss, p.row, newHp);
	});

	const day = getDay_() + 1;
	setDay_(day);
	updateDayCell_(ss);

	writeHistory_(ss, "🧙‍♂️Мастер", "🎆", `Новый день ${day}: 👣=${CFG.MOVES_PER_DAY}`, "", "");
	updateFog();
}

function skipWeek() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const DAYS = 7;

	const rg = gridRange_(getSheet_(ss, CFG.SHEETS.base));
	const w = rg.getNumColumns();
	const h = rg.getNumRows();

	for (let d = 1; d <= DAYS; d++) {
		tickTimers_(ss);
		moveNpcs_(ss, w, h);

		const active = getActivePlayers_(ss);
		active.forEach((p) => {
			setPlayerMoves_(ss, p.row, CFG.MOVES_PER_DAY);
			const newHp = Math.min(p.maxhp || 10, (p.hp || 1) + 1);
			if (newHp > (p.hp || 1)) setPlayerHp_(ss, p.row, newHp);
		});
	}

	const day = getDay_() + DAYS;
	setDay_(day);
	updateDayCell_(ss);

	writeHistory_(ss, "🧙‍♂️Мастер", "⏩", `Прошла неделя → День ${day}`, "", "");
	updateFog();
}

// ===== Sheets & Sorcery: Web Utils =====

export function dirToDelta(dir) {
	if (dir === "N") return { dx: 0, dy: -1 };
	if (dir === "S") return { dx: 0, dy: 1 };
	if (dir === "E") return { dx: 1, dy: 0 };
	if (dir === "W") return { dx: -1, dy: 0 };
	return null;
}

export function randInt(a, b) {
	return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function baseTile(cellValue) {
	if (!cellValue) return "⬜️";
	const s = String(cellValue).trim();
	if (!s) return "⬜️";
	const a = Array.from(s);
	let t = a[0] || "⬜️";
	if (a[1] === "\uFE0F") t += a[1];
	return t;
}

// A1 "D7" -> {x:4, y:7} (1-based, relative to grid C3=1,1)
export function a1ToXY(a1) {
	const m = String(a1 || "")
		.toUpperCase()
		.match(/^([A-Z]+)(\d+)$/);
	if (!m) return null;
	const colLetters = m[1];
	const rowNum = Number(m[2]);
	const colNum = colLetters.split("").reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
	return { x: colNum - 2, y: rowNum - 2 };
}

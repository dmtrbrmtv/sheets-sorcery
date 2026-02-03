// ===== Sheets & Sorcery: Home Base =====
// 10×10 garden with house at bottom, player can move

import { CFG } from "./config.js";
import { randInt } from "./utils.js";

const HOME_W = CFG.HOME?.W ?? 10;
const HOME_H = CFG.HOME?.H ?? 10;

// Fixed garden layout: house 🏡 at bottom center (5,10), garden with crops and animals
const HOME_LAYOUT = [
	["🌱", "🌱", "🌱", "🌱", "🌱", "🌱", "🌱", "🌱", "🌱", "🌱"],
	["🌱", "🌾", "🌾", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "🌱"],
	["🌱", "🌾", "🌾", "⬜️", "⬜️", "⬜️", "🌾", "🐖", "⬜️", "🌱"],
	["🌱", "🌾", "🌾", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "🌱"],
	["🌱", "🥕", "🥕", "⬜️", "⬜️", "🌾", "🐄", "⬜️", "⬜️", "🌱"],
	["🌱", "🥕", "🥕", "⬜️", "⬜️", "⬜️", "⬜️", "🌾", "🐑", "🌱"],
	["🌱", "🍅", "🍅", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "🌱"],
	["🌱", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "⬜️", "🌱"],
	["🌱", "⬜️", "⬜️", "⬜️", "⬜️", "🧺", "⬜️", "⬜️", "⬜️", "🌱"],
	["🌱", "🌱", "🌱", "🌱", "🏡", "🌱", "🌱", "🌱", "🌱", "🌱"],
];

export function getHomeLayout() {
	return HOME_LAYOUT.map((row) => [...row]);
}

export function createHomeState() {
	const tiles = getHomeLayout();
	return {
		width: HOME_W,
		height: HOME_H,
		tiles,
		crops: [],
		pigs: [],
		lastDayProcessed: 0,
		playerX: 5,
		playerY: 9,
	};
}

export function getHomeTileAt(home, x, y) {
	if (x < 1 || y < 1 || x > home.width || y > home.height) return null;
	return home.tiles[y - 1][x - 1];
}

export function moveInHome(state, dir) {
	const home = state.home;
	if (!home) return false;
	const dx = dir === "E" ? 1 : dir === "W" ? -1 : 0;
	const dy = dir === "S" ? 1 : dir === "N" ? -1 : 0;
	const nx = (home.playerX ?? 5) + dx;
	const ny = (home.playerY ?? 9) + dy;
	if (nx < 1 || nx > home.width || ny < 1 || ny > home.height) return false;
	home.playerX = nx;
	home.playerY = ny;
	return true;
}

export function setHomeTileAt(home, x, y, tile) {
	if (x < 1 || y < 1 || x > home.width || y > home.height) return;
	home.tiles[y - 1][x - 1] = tile;
}

function cellLabel(x, y) {
	const col = String.fromCharCode(64 + x);
	return `${col}${y}`;
}

export function placePlot(state, x, y) {
	const home = state.home || createHomeState();
	state.home = home;
	const tile = getHomeTileAt(home, x, y);
	if (tile !== "⬜️") return false;
	const crop = (home.crops || []).find((c) => c.x === x && c.y === y);
	if (crop) return false;
	const pig = (home.pigs || []).find((p) => p.x === x && p.y === y);
	if (pig) return false;
	setHomeTileAt(home, x, y, "🟫");
	return true;
}

export function plantVeg(state, x, y) {
	const home = state.home || createHomeState();
	state.home = home;
	const tile = getHomeTileAt(home, x, y);
	if (tile !== "🟫") return false;
	const existing = (home.crops || []).find((c) => c.x === x && c.y === y);
	if (existing) return false;
	home.crops = home.crops || [];
	home.crops.push({ x, y, type: "veg", plantedAt: state.dayNumber ?? 1 });
	return true;
}

export function plantFruit(state, x, y) {
	const home = state.home || createHomeState();
	state.home = home;
	const tile = getHomeTileAt(home, x, y);
	if (tile !== "🟫") return false;
	const existing = (home.crops || []).find((c) => c.x === x && c.y === y);
	if (existing) return false;
	home.crops = home.crops || [];
	home.crops.push({ x, y, type: "fruit", plantedAt: state.dayNumber ?? 1 });
	return true;
}

export function addPig(state, x, y) {
	const home = state.home || createHomeState();
	state.home = home;
	const tile = getHomeTileAt(home, x, y);
	if (tile !== "⬜️" && tile !== "🟫") return false;
	const existing = (home.pigs || []).find((p) => p.x === x && p.y === y);
	if (existing) return false;
	const maxPigs = CFG.HOME?.PIG_MAX ?? 5;
	if ((home.pigs || []).length >= maxPigs) return false;
	const cost = CFG.HOME?.PIG_COST ?? { wood: 1 };
	const p = state.player;
	for (const k in cost) {
		if ((p[k] || 0) < cost[k]) return false;
	}
	const spent = {};
	for (const k in cost) {
		p[k] = (p[k] || 0) - cost[k];
		spent[k] = -cost[k];
	}
	logSpend(state, "Добавить свинью", spent);
	home.pigs = home.pigs || [];
	home.pigs.push({
		x,
		y,
		createdAt: state.dayNumber ?? 1,
		lastCollectedAt: state.dayNumber ?? 1,
	});
	setHomeTileAt(home, x, y, "🐷");
	return true;
}

export function getCropAt(home, x, y) {
	return (home.crops || []).find((c) => c.x === x && c.y === y);
}

export function getPigAt(home, x, y) {
	return (home.pigs || []).find((p) => p.x === x && p.y === y);
}

export function isCropReady(crop, dayNumber, type) {
	const days = type === "veg" ? (CFG.HOME?.VEG_DAYS ?? 2) : (CFG.HOME?.FRUIT_DAYS ?? 3);
	return dayNumber - crop.plantedAt >= days;
}

export function isPigReady(pig, dayNumber) {
	const interval = CFG.HOME?.PIG_FOOD_INTERVAL ?? 2;
	return dayNumber - pig.lastCollectedAt >= interval;
}

export function collect(state, x, y) {
	const home = state.home;
	if (!home) return false;
	const crop = getCropAt(home, x, y);
	const pig = getPigAt(home, x, y);
	const day = state.dayNumber ?? 1;

	if (crop && isCropReady(crop, day, crop.type)) {
		const yieldRange =
			crop.type === "veg" ? (CFG.HOME?.VEG_YIELD ?? [1, 2]) : [CFG.HOME?.FRUIT_YIELD ?? 1, CFG.HOME?.FRUIT_YIELD ?? 1];
		const amount = crop.type === "veg" ? randInt(yieldRange[0], yieldRange[1]) : (yieldRange[0] ?? 1);
		state.player.food = (state.player.food || 0) + amount;
		const label = cellLabel(x, y);
		const icon = crop.type === "veg" ? "🥕" : "🍎";
		logGain(state, `${icon} ${crop.type} (${label})`, { food: amount });
		home.crops = home.crops.filter((c) => !(c.x === x && c.y === y));
		return true;
	}

	if (pig && isPigReady(pig, day)) {
		const amount = 1;
		state.player.food = (state.player.food || 0) + amount;
		const label = cellLabel(x, y);
		logGain(state, `🐷 Свинья (${label})`, { food: amount });
		pig.lastCollectedAt = day;
		return true;
	}

	return false;
}

export function processHomeDay(state) {
	const home = state.home;
	if (!home) return;
	const day = state.dayNumber ?? 1;
	if (home.lastDayProcessed >= day) return;
	home.lastDayProcessed = day;
}

export function logGain(state, source, delta) {
	const parts = Object.entries(delta || {})
		.map(([k, v]) => {
			const icons = { food: "🍖", wood: "🪵", stone: "🪨", gold: "💰" };
			return v > 0 ? `${icons[k] || k}+${v}` : "";
		})
		.filter(Boolean);
	addHistoryEntry(state, "🏠 Home", parts.join(" "), `${source}`);
}

export function logSpend(state, reason, delta) {
	const parts = Object.entries(delta || {})
		.map(([k, v]) => {
			if (v >= 0) return "";
			const icons = { food: "🍖", wood: "🪵", stone: "🪨", gold: "💰" };
			return `${icons[k] || k}${v}`;
		})
		.filter(Boolean);
	if (parts.length) addHistoryEntry(state, "📉 Потрачено", parts.join(" "), `→ ${reason}`);
}

function addHistoryEntry(state, who, got, what) {
	state.history = state.history || [];
	state.history.unshift({
		day: state.dayNumber ?? state.day ?? 1,
		moveInDay: state.dayStep ?? 0,
		who,
		got: got || "",
		what: what || "",
		mapInfo: "",
		timerInfo: "",
		when: new Date().toISOString(),
	});
	if (state.history.length > 200) state.history.pop();
}

export { addHistoryEntry };

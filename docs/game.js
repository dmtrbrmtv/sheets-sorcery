// ===== Sheets & Sorcery: Web =====
// Layout: Left (History+Rules) | Center (Map) | Right (Player HUD + Combat Panel)

import {
	advanceTurn,
	buildHouse,
	CRAFT_SPECS,
	canChopWood,
	canFish,
	canHunt,
	canQuarry,
	combatTurn,
	craft,
	doChopWood,
	doFish,
	doHunt,
	doQuarry,
	doTalk,
	getTimeState,
	getVillagerOnTile,
	isInCombat,
	move,
	moveEntitiesOnAction,
	portalHome,
	useConsumable,
} from "./actions.js";
import { CELL_SIZE_PX, CFG, DEBUG_SHOW_BIOMES, GRID_H, GRID_W } from "./config.js";
import { buildVisibleSet, createInitialState, getTileAt, setTileAt, spawnHunters } from "./gameState.js";
import {
	addPig,
	collect,
	createHomeState,
	getCropAt,
	getHomeLayout,
	getHomeTileAt,
	getPigAt,
	moveInHome,
	placePlot,
	plantFruit,
	plantVeg,
} from "./home.js";
import { ensureSessionId, LEGACY_KEY, makeStorageKey } from "./session.js";
import { getTerrainBg } from "./terrain.js";
import {
	getActiveQuests,
	getCombatDisplayData,
	getCombatEnemyInfo,
	getContextHints,
	getCraftSpecsWithState,
	getPlayerStats,
	RULES_TEXT,
} from "./ui.js";
import { getBiomeFromTile, getBiomeLabel } from "./worldGenerator.js";
import { AudioManager } from "./web/audio/audioManager.js";

const sessionInfo = ensureSessionId();
const STORAGE_KEY = makeStorageKey(sessionInfo.sessionId);
const HAS_EXPLICIT_SESSION = sessionInfo.explicit;

const state = loadState();
let homeMode = false;
let selectedHomeX = null;
let selectedHomeY = null;
let selectedCraftCategory = null;
let selectedCraftIndex = null;
let historyShowGlobal = true;
let historyShowPlayer = true;

function loadState() {
	try {
		let raw = localStorage.getItem(STORAGE_KEY);
		if (!raw && !HAS_EXPLICIT_SESSION) {
			const legacy = localStorage.getItem(LEGACY_KEY);
			if (legacy) {
				localStorage.setItem(STORAGE_KEY, legacy);
				localStorage.removeItem(LEGACY_KEY);
				raw = legacy;
			}
		}
		if (!raw) {
			const fresh = createInitialState();
			saveState(fresh);
			return fresh;
		}
		const parsed = JSON.parse(raw);
		parsed.revealed = new Set(parsed.revealed || []);
		if (!parsed.world || !parsed.player) {
			const fresh = createInitialState();
			saveState(fresh);
			return fresh;
		}
		if (!parsed.npcs) parsed.npcs = [];
		if (!parsed.villagers) parsed.villagers = [];
		if (!parsed.hunters) {
			const occupied = new Set([
				...(parsed.animals || []).map((a) => `${a.x},${a.y}`),
				...(parsed.npcs || []).map((n) => `${n.x},${n.y}`),
				`${parsed.player?.x ?? 1},${parsed.player?.y ?? 1}`,
			]);
			(parsed.villagers || []).forEach((v) => occupied.add(`${v.x},${v.y}`));
			parsed.hunters = spawnHunters(parsed.world, occupied);
		}
		if (parsed.dayNumber === undefined) parsed.dayNumber = parsed.day ?? 1;
		if (parsed.dayStep === undefined) {
			if (parsed.phase !== undefined && parsed.phaseSteps !== undefined) {
				const stepsInPhase = { day: 20, dusk: 10, night: 10, dawn: 10 };
				const phaseStarts = { day: 0, dusk: 20, night: 30, dawn: 40 };
				const start = phaseStarts[parsed.phase] ?? 0;
				const remaining = parsed.phaseSteps ?? 0;
				const taken = (stepsInPhase[parsed.phase] ?? 20) - remaining;
				parsed.dayStep = Math.min(49, start + taken);
			} else {
				parsed.dayStep = 0;
			}
		}
		if ((parsed.dayStep ?? 0) >= 50) {
			parsed.dayNumber = (parsed.dayNumber ?? parsed.day ?? 1) + 1;
			parsed.dayStep = 0;
		}
		if (!parsed.player.statusEffects) parsed.player.statusEffects = [];
		if (!parsed.activeQuests) parsed.activeQuests = [];
		if (!parsed.completedQuests) parsed.completedQuests = [];
		if (!parsed.combat) parsed.combat = null;
		if (!parsed.home) parsed.home = null;
		if (!parsed.worldChanges) parsed.worldChanges = {};
		if (parsed.worldSeed == null) parsed.worldSeed = 4242;
		// Migration: ensure villagers have role/name from CFG (old saves may lack it)
		if (parsed.villagers?.length && CFG.VILLAGERS) {
			parsed.villagers = parsed.villagers.map((v) => {
				const spec = CFG.VILLAGERS[v.emoji];
				return spec ? { ...v, name: spec.name, role: spec.role || v.role, dialog: spec.dialog || v.dialog } : v;
			});
		}
		// Migration: ensure sign 🪧 at (3,9) for house build spot (saved games may lack it)
		const signX = 3,
			signY = 9;
		const tile = getTileAt(parsed.world, signX, signY);
		if (tile && tile !== "🏡" && tile !== "🏠") {
			setTileAt(parsed.world, signX, signY, "🪧");
		}
		// Migration: home layout and player position (always apply layout so garden is visible)
		if (parsed.home) {
			if (!parsed.home.playerX) parsed.home.playerX = 5;
			if (!parsed.home.playerY) parsed.home.playerY = 9;
			parsed.home.tiles = getHomeLayout();
		}
		return parsed;
	} catch {
		const fresh = createInitialState();
		saveState(fresh);
		return fresh;
	}
}

function saveState(nextState = state) {
	const revealed = Array.from(nextState.revealed || []);
	const toSave = { ...nextState, revealed, combat: null };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function isOnHouseTile() {
	const tile = getTileAt(state.world, state.player.x, state.player.y);
	return tile === "🏡" || tile === "🏠";
}

function isOnDreamHouseSpot() {
	return getTileAt(state.world, state.player.x, state.player.y) === "🪧";
}

function canBuyDreamHouse() {
	if (!isOnDreamHouseSpot()) return false;
	const cost = CFG.BUILD?.HOUSE_COST || {};
	return !Object.entries(cost).some(([k, v]) => (state.player[k] || 0) < v);
}

function enterHouse() {
	if (!isOnHouseTile()) return;
	state.home = state.home || createHomeState();
	homeMode = true;
	selectedHomeX = null;
	selectedHomeY = null;
	lastCamera = null;
	lastPlayerPos = null;
	saveState();
	refreshAll();
}

function exitHouse() {
	homeMode = false;
	selectedHomeX = null;
	selectedHomeY = null;
	lastCamera = null;
	lastPlayerPos = null;
	saveState();
	refreshAll();
}

/** Wraps EVERY player action. NEVER blocks on time.
 *  1. Run action first (unconditionally)
 *  2. Advance time second (unconditionally)
 *  3. Render third (unconditionally) */
function performTurn_(doActionFn) {
	AudioManager.init();
	state._playerDiedThisTurn = false;

	const day = state.dayNumber ?? state.day ?? 1;
	const stepIndex = state.dayStep ?? 0;
	console.log("TURN start", day, stepIndex);

	doActionFn();
	if (state._playerDiedThisTurn) {
		try {
			AudioManager.playPlayerDeath();
		} catch (_) {}
	}
	console.log("TURN after action", day, stepIndex);

	advanceTurn(state);
	const dayAfter = state.dayNumber ?? state.day ?? 1;
	const stepAfter = state.dayStep ?? 0;
	console.log("TURN after time", dayAfter, stepAfter);

	saveState();
	refreshAll();
}

function refreshAll() {
	if (homeMode) {
		renderHomeGrid();
		renderDayOverlay();
		renderPlayerPanel();
		renderInventory();
		renderHomeActions();
		renderHistory();
		renderCraft();
		renderQuests();
		renderRules();
	} else {
		render();
		renderDayOverlay();
		renderPlayerPanel();
		renderInventory();
		renderActionsOrCombat();
		renderHistory();
		renderCraft();
		renderQuests();
		renderRules();
	}
}

function renderDayOverlay() {
	const dayOverlayEl = document.getElementById("day-overlay");
	if (!dayOverlayEl) return;
	dayOverlayEl.style.display = "none";
	const t = getTimeState(state);
	if (!gridEl) return;
	gridEl.classList.remove("phase-day", "phase-dusk", "phase-night", "phase-dawn");
	if (!homeMode) gridEl.classList.add(`phase-${t.phase || "day"}`);
	try {
		AudioManager.playMusic(t.phase);
	} catch (_) {}
}

const mapWrapperEl = document.querySelector(".map-wrapper");
const mapContainerEl = document.querySelector(".map-container");
const mapBgEl = document.getElementById("map-bg");
const gridEl = document.getElementById("grid");
const historyEl = document.getElementById("history");
const actionsEl = document.getElementById("actions");
const combatPanelEl = document.getElementById("combat-panel");
const combatPlayerEl = document.getElementById("combat-player");
const combatEnemyEl = document.getElementById("combat-enemy");
const combatLogEl = document.getElementById("combat-log");
const playerStatsEl = document.getElementById("player-stats");
const contextHintsEl = document.getElementById("context-hints");
const craftTabWeaponsEl = document.getElementById("craft-tab-weapons");
const craftTabItemsEl = document.getElementById("craft-tab-items");
const craftListEl = document.getElementById("craft-list");
const craftDetailsEl = document.getElementById("craft-details");
const rulesEl = document.getElementById("rules");
const questsEl = document.getElementById("quests");
const resetBtn = document.getElementById("reset");
const VIEW_COLS = Math.min(GRID_W, 19);
const VIEW_ROWS = Math.min(GRID_H, 19);
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let lastPlayerPos = null;
let lastCamera = null;

if (!gridEl) throw new Error("index.html must contain <div id='grid'></div>");

document.documentElement.style.setProperty("--cell-size", `${CELL_SIZE_PX}px`);
const gridWidth = GRID_W * CELL_SIZE_PX;
const gridHeight = GRID_H * CELL_SIZE_PX;

if (mapContainerEl) {
	mapContainerEl.style.width = `${gridWidth}px`;
	mapContainerEl.style.height = `${gridHeight}px`;
}

gridEl.style.display = "grid";
gridEl.style.gridTemplateColumns = `repeat(${GRID_W}, ${CELL_SIZE_PX}px)`;
gridEl.style.gridAutoRows = `${CELL_SIZE_PX}px`;
gridEl.style.gap = "0";
gridEl.style.padding = "0";

function updateCameraAndFocus({ playerX, playerY, gridCols, gridRows }) {
	if (!mapContainerEl || !mapWrapperEl) return;

	const viewCols = Math.min(gridCols, VIEW_COLS);
	const viewRows = Math.min(gridRows, VIEW_ROWS);
	const viewportW = viewCols * CELL_SIZE_PX;
	const viewportH = viewRows * CELL_SIZE_PX;
	const mapW = gridCols * CELL_SIZE_PX;
	const mapH = gridRows * CELL_SIZE_PX;

	mapWrapperEl.style.width = `${viewportW}px`;
	mapWrapperEl.style.height = `${viewportH}px`;

	const playerPx = (playerX - 0.5) * CELL_SIZE_PX;
	const playerPy = (playerY - 0.5) * CELL_SIZE_PX;
	const targetX = viewportW / 2 - playerPx;
	const targetY = viewportH / 2 - playerPy;

	const minX = viewportW - mapW;
	const minY = viewportH - mapH;
	const clampedX = Math.max(minX, Math.min(0, targetX));
	const clampedY = Math.max(minY, Math.min(0, targetY));

	const focusX = playerPx + clampedX;
	const focusY = playerPy + clampedY;
	mapWrapperEl.style.setProperty("--focus-x", `${focusX}px`);
	mapWrapperEl.style.setProperty("--focus-y", `${focusY}px`);

	if (reduceMotionQuery.matches || !lastCamera) {
		mapContainerEl.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
		lastCamera = { x: clampedX, y: clampedY };
		return;
	}

	const lastX = lastCamera.x;
	const lastY = lastCamera.y;
	if (lastX !== clampedX || lastY !== clampedY) {
		const overshootX = clampedX + (clampedX - lastX) * 0.08;
		const overshootY = clampedY + (clampedY - lastY) * 0.08;
		mapContainerEl.getAnimations?.().forEach((anim) => anim.cancel());
		mapContainerEl.animate(
			[
				{ transform: `translate(${lastX}px, ${lastY}px)` },
				{ transform: `translate(${overshootX}px, ${overshootY}px)` },
				{ transform: `translate(${clampedX}px, ${clampedY}px)` },
			],
			{ duration: 160, easing: "cubic-bezier(0.22, 1.0, 0.36, 1)" },
		);
	}

	mapContainerEl.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
	lastCamera = { x: clampedX, y: clampedY };
}

refreshAll();

gridEl.addEventListener("click", (e) => {
	const cell = e.target.closest(".cell");
	if (!cell) return;
	if (homeMode) {
		const cx = Number(cell.dataset.x) + 1;
		const cy = Number(cell.dataset.y) + 1;
		const home = state.home;
		if (home?.playerX != null && home?.playerY != null) {
			const dx = Math.sign(cx - home.playerX);
			const dy = Math.sign(cy - home.playerY);
			if (dx !== 0 || dy !== 0) {
				const dir = dy < 0 ? "N" : dy > 0 ? "S" : dx > 0 ? "E" : "W";
				performTurn_(() => {
					const px = state.home?.playerX;
					const py = state.home?.playerY;
					moveInHome(state, dir);
					if (state.home && (state.home.playerX !== px || state.home.playerY !== py)) {
						try {
							AudioManager.playStep(null);
						} catch (_) {}
					}
				});
				return;
			}
		}
		selectedHomeX = cx;
		selectedHomeY = cy;
		refreshAll();
		return;
	}
	if (isInCombat(state)) return;
	const x = Number(cell.dataset.x) + 1;
	const y = Number(cell.dataset.y) + 1;
	const dx = Math.sign(x - state.player.x);
	const dy = Math.sign(y - state.player.y);
	if (dx === 0 && dy === 0) return;
	const dir = dy < 0 ? "N" : dy > 0 ? "S" : dx > 0 ? "E" : "W";
	performTurn_(() => {
		const px = state.player.x;
		const py = state.player.y;
		if (move(state, dir)) {
			moveEntitiesOnAction(state);
			buildVisibleSet(state.player).forEach((k) => state.revealed.add(k));
			if (state.player.x !== px || state.player.y !== py) {
				const tile = getTileAt(state.world, state.player.x, state.player.y, state);
				try {
					AudioManager.playStep(tile);
				} catch (_) {}
			}
		}
	});
});

document.addEventListener("keydown", (e) => {
	const key = e.key.toLowerCase();
	if (homeMode) {
		if (key === "enter" || key === " " || key === "space") {
			e.preventDefault();
			const home = state.home;
			if (home?.playerX != null && home?.playerY != null) {
				selectedHomeX = home.playerX;
				selectedHomeY = home.playerY;
				refreshAll();
			}
			return;
		}
		if (key === "escape") {
			e.preventDefault();
			if (selectedHomeX != null || selectedHomeY != null) {
				selectedHomeX = null;
				selectedHomeY = null;
				refreshAll();
			}
			return;
		}
	}
	let dir = null;
	if (key === "arrowup" || key === "w") dir = "N";
	if (key === "arrowdown" || key === "s") dir = "S";
	if (key === "arrowleft" || key === "a") dir = "W";
	if (key === "arrowright" || key === "d") dir = "E";
	if (dir) {
		e.preventDefault();
		if (homeMode) {
			performTurn_(() => {
				const px = state.home?.playerX;
				const py = state.home?.playerY;
				moveInHome(state, dir);
				if (state.home && (state.home.playerX !== px || state.home.playerY !== py)) {
					try {
						AudioManager.playStep(null);
					} catch (_) {}
				}
			});
			return;
		}
		if (!isInCombat(state)) {
			performTurn_(() => {
				const px = state.player.x;
				const py = state.player.y;
				if (move(state, dir)) {
					moveEntitiesOnAction(state);
					buildVisibleSet(state.player).forEach((k) => state.revealed.add(k));
					if (state.player.x !== px || state.player.y !== py) {
						const tile = getTileAt(state.world, state.player.x, state.player.y, state);
						try {
							AudioManager.playStep(tile);
						} catch (_) {}
					}
				}
			});
		}
	}
});

if (resetBtn) {
	resetBtn.addEventListener("click", () => {
		if (confirm("Сбросить игру?")) {
			localStorage.removeItem(STORAGE_KEY);
			location.reload();
		}
	});
}

function setupAudioControls() {
	const musicEl = document.getElementById("audio-music");
	const sfxEl = document.getElementById("audio-sfx");
	const muteEl = document.getElementById("audio-mute");
	if (!musicEl || !sfxEl || !muteEl) return;
	musicEl.value = Math.round((AudioManager.getMusicVolume() ?? 0.2) * 100);
	sfxEl.value = Math.round((AudioManager.getSfxVolume() ?? 0.08) * 100);
	muteEl.textContent = AudioManager.isMuted() ? "🔊 Unmute" : "🔇 Mute";
	muteEl.classList.toggle("muted", AudioManager.isMuted());
	musicEl.addEventListener("input", () => {
		onFirstUserInteraction();
		AudioManager.setMusicVolume(Number(musicEl.value) / 100);
	});
	sfxEl.addEventListener("input", () => {
		onFirstUserInteraction();
		AudioManager.setSfxVolume(Number(sfxEl.value) / 100);
	});
	muteEl.addEventListener("click", () => {
		onFirstUserInteraction();
		const next = !AudioManager.isMuted();
		AudioManager.mute(next);
		muteEl.textContent = next ? "🔊 Unmute" : "🔇 Mute";
		muteEl.classList.toggle("muted", next);
	});
}

function onFirstUserInteraction() {
	AudioManager.init();
	const t = getTimeState(state);
	AudioManager.playMusic(t.phase);
}
document.addEventListener("click", onFirstUserInteraction, { once: true, capture: true });
document.addEventListener("keydown", onFirstUserInteraction, { once: true, capture: true });
document.addEventListener("touchstart", onFirstUserInteraction, { once: true, capture: true });
setupAudioControls();

function syncHistoryTabs() {
	const globalEl = document.getElementById("history-tab-global");
	const playerEl = document.getElementById("history-tab-player");
	if (globalEl) {
		globalEl.classList.toggle("active", historyShowGlobal);
		globalEl.setAttribute("aria-pressed", String(historyShowGlobal));
	}
	if (playerEl) {
		playerEl.classList.toggle("active", historyShowPlayer);
		playerEl.setAttribute("aria-pressed", String(historyShowPlayer));
	}
}
document.querySelector(".history-header")?.addEventListener("click", (e) => {
	const globalBtn = e.target.closest("#history-tab-global");
	const playerBtn = e.target.closest("#history-tab-player");
	if (globalBtn) {
		e.preventDefault();
		historyShowGlobal = !historyShowGlobal;
		syncHistoryTabs();
		renderHistory();
	}
	if (playerBtn) {
		e.preventDefault();
		historyShowPlayer = !historyShowPlayer;
		syncHistoryTabs();
		renderHistory();
	}
});
syncHistoryTabs();

const RULES_COLLAPSED_KEY = "sheets-sorcery-rules-collapsed";
const rulesPanelEl = document.getElementById("rules-panel");
const rulesToggleEl = document.getElementById("rules-toggle");
let rulesCollapsed = localStorage.getItem(RULES_COLLAPSED_KEY) === "1";
function syncRulesPanel() {
	if (rulesPanelEl) rulesPanelEl.classList.toggle("collapsed", rulesCollapsed);
	if (rulesToggleEl) rulesToggleEl.setAttribute("aria-expanded", String(!rulesCollapsed));
}
function toggleRules() {
	rulesCollapsed = !rulesCollapsed;
	localStorage.setItem(RULES_COLLAPSED_KEY, rulesCollapsed ? "1" : "0");
	syncRulesPanel();
}
syncRulesPanel();
if (rulesToggleEl) {
	rulesToggleEl.addEventListener("click", toggleRules);
	rulesToggleEl.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggleRules();
		}
	});
}

function renderMapBg() {
	if (!mapBgEl) return;
	let canvas = mapBgEl.querySelector("canvas");
	if (!canvas) {
		canvas = document.createElement("canvas");
		canvas.width = GRID_W * CELL_SIZE_PX;
		canvas.height = GRID_H * CELL_SIZE_PX;
		mapBgEl.appendChild(canvas);
	}
	const ctx = canvas.getContext("2d");
	const p = state.player;
	buildVisibleSet(p).forEach((k) => state.revealed.add(k));
	for (let viewY = 1; viewY <= GRID_H; viewY++) {
		for (let viewX = 1; viewX <= GRID_W; viewX++) {
			const key = `${viewX},${viewY}`;
			const isRevealed = state.revealed.has(key);
			const baseTile = isRevealed ? getTileAt(state.world, viewX, viewY, state) : null;
			const color = isRevealed ? getTerrainBg(baseTile) : "#6a6a62";
			ctx.fillStyle = color;
			const canvasX = (viewX - 1) * CELL_SIZE_PX;
			const canvasY = (viewY - 1) * CELL_SIZE_PX;
			ctx.fillRect(canvasX, canvasY, CELL_SIZE_PX, CELL_SIZE_PX);
		}
	}
}

const HOME_W = CFG.HOME?.W ?? 10;
const HOME_H = CFG.HOME?.H ?? 10;

function getHomeCellEmoji(home, x, y) {
	const tile = getHomeTileAt(home, x, y) || "⬜️";
	const pHome = home.playerX != null && home.playerY != null;
	const isPlayerHere = pHome && home.playerX === x && home.playerY === y;
	if (isPlayerHere) return state.player?.icon || "🧙🏻‍♂️";
	const pig = getPigAt(home, x, y);
	if (pig) return "🐷";
	const crop = getCropAt(home, x, y);
	if (crop) return crop.type === "veg" ? "🥕" : "🍎";
	return tile;
}

function renderHomeGrid() {
	const home = state.home;
	if (!home) return;
	if (home.playerX == null) home.playerX = 5;
	if (home.playerY == null) home.playerY = 9;
	if (!home.tiles || home.tiles.length !== 10) home.tiles = getHomeLayout();
	if (mapBgEl) mapBgEl.style.display = "none";
	gridEl.style.display = "grid";
	gridEl.style.gridTemplateColumns = `repeat(${HOME_W}, ${CELL_SIZE_PX}px)`;
	gridEl.style.gridAutoRows = `${CELL_SIZE_PX}px`;
	gridEl.innerHTML = "";
	for (let y = 1; y <= HOME_H; y++) {
		for (let x = 1; x <= HOME_W; x++) {
			const cell = document.createElement("div");
			cell.className = "cell home-cell";
			cell.dataset.x = String(x - 1);
			cell.dataset.y = String(y - 1);
			const isSelected = selectedHomeX === x && selectedHomeY === y;
			const isPlayerHere = home.playerX === x && home.playerY === y;
			if (isSelected) cell.classList.add("selected");
			if (isPlayerHere) cell.classList.add("player-here");
			const emoji = getHomeCellEmoji(home, x, y);
			const terrain = document.createElement("span");
			terrain.className = "cell-terrain";
			terrain.textContent = emoji;
			cell.appendChild(terrain);
			gridEl.appendChild(cell);
		}
	}
	if (mapContainerEl) {
		mapContainerEl.style.width = `${HOME_W * CELL_SIZE_PX}px`;
		mapContainerEl.style.height = `${HOME_H * CELL_SIZE_PX}px`;
	}
	updateCameraAndFocus({ playerX: home.playerX, playerY: home.playerY, gridCols: HOME_W, gridRows: HOME_H });
	lastPlayerPos = { mode: "home", x: home.playerX, y: home.playerY };
}

function render() {
	if (mapBgEl) mapBgEl.style.display = "";
	if (mapContainerEl) {
		mapContainerEl.style.width = `${gridWidth}px`;
		mapContainerEl.style.height = `${gridHeight}px`;
	}
	gridEl.style.gridTemplateColumns = `repeat(${GRID_W}, ${CELL_SIZE_PX}px)`;
	renderMapBg();
	gridEl.innerHTML = "";
	const p = state.player;
	buildVisibleSet(p).forEach((k) => state.revealed.add(k));

	const playerCells = new Set([`${p.x},${p.y}`]);
	const entityCells = new Map();
	(state.animals || []).forEach((a) => {
		const key = `${a.x},${a.y}`;
		if (state.revealed.has(key)) entityCells.set(key, { emoji: a.emoji || "🐇", hostile: !a.passive });
	});
	(state.npcs || []).forEach((n) => {
		const key = `${n.x},${n.y}`;
		if (state.revealed.has(key)) entityCells.set(key, { emoji: n.emoji, hostile: true });
	});
	(state.villagers || []).forEach((v) => {
		const key = `${v.x},${v.y}`;
		if (state.revealed.has(key)) entityCells.set(key, { emoji: v.emoji, hostile: false });
	});
	(state.hunters || []).forEach((h) => {
		const key = `${h.x},${h.y}`;
		if (state.revealed.has(key)) entityCells.set(key, { emoji: h.emoji, hostile: false });
	});

	const lastPos = lastPlayerPos?.mode === "world" ? lastPlayerPos : null;
	let stepDx = 0;
	let stepDy = 0;
	let shouldSpring = false;
	if (lastPos) {
		stepDx = p.x - lastPos.x;
		stepDy = p.y - lastPos.y;
		shouldSpring = Math.abs(stepDx) + Math.abs(stepDy) === 1;
	}

	for (let viewY = 1; viewY <= GRID_H; viewY++) {
		for (let viewX = 1; viewX <= GRID_W; viewX++) {
			const key = `${viewX},${viewY}`;
			const isRevealed = state.revealed.has(key);
			const baseTile = isRevealed ? getTileAt(state.world, viewX, viewY, state) : null;
			const entityData = entityCells.get(key);
			const isPlayerHere = viewX === p.x && viewY === p.y;

			const cell = document.createElement("div");
			cell.className = "cell";
			cell.dataset.x = String(viewX - 1);
			cell.dataset.y = String(viewY - 1);

			if (!isRevealed) cell.classList.add("fog");
			if (isPlayerHere) cell.classList.add("player-here");
			if (entityData && !isPlayerHere) cell.classList.add("has-entity");
			if (entityData && isPlayerHere) {
				cell.classList.add("has-entity");
				const villager = (state.villagers || []).find((v) => v.x === viewX && v.y === viewY);
				const hunter = (state.hunters || []).find((h) => h.x === viewX && h.y === viewY);
				if (!villager && !hunter) cell.classList.add("combat-tile");
			}

			const terrain = document.createElement("span");
			terrain.className = "cell-terrain";
			if (DEBUG_SHOW_BIOMES && isRevealed) {
				const biome = getBiomeFromTile(baseTile);
				terrain.textContent = biome ? getBiomeLabel(biome) : baseTile || "";
			} else {
				terrain.textContent = isRevealed ? baseTile : "";
			}

			const overlay = document.createElement("div");
			overlay.className = "cell-overlay";

			const entityLayer = document.createElement("span");
			entityLayer.className = "cell-entity";
			if (isPlayerHere) {
				entityLayer.textContent = p.icon;
				entityLayer.classList.add("player");
				if (shouldSpring) {
					entityLayer.classList.add("step-spring");
					entityLayer.style.setProperty("--step-from-x", `${-stepDx * CELL_SIZE_PX}px`);
					entityLayer.style.setProperty("--step-from-y", `${-stepDy * CELL_SIZE_PX}px`);
				}
				if (entityData) {
					const combatInfo = getCombatEnemyInfo(state);
					const villager = (state.villagers || []).find((v) => v.x === viewX && v.y === viewY);
					const hunter = (state.hunters || []).find((h) => h.x === viewX && h.y === viewY);
					if (combatInfo) entityLayer.textContent = `${p.icon} ${combatInfo.emoji}`;
					else if (villager) entityLayer.textContent = `${p.icon} ${villager.emoji}`;
					else if (hunter) entityLayer.textContent = `${p.icon} ${hunter.emoji}`;
				}
			} else if (entityData) {
				entityLayer.textContent = entityData.emoji;
				entityLayer.classList.add(entityData.hostile ? "entity-hostile" : "entity-neutral");
			}

			cell.appendChild(terrain);
			cell.appendChild(overlay);
			cell.appendChild(entityLayer);
			gridEl.appendChild(cell);
		}
	}

	updateCameraAndFocus({ playerX: p.x, playerY: p.y, gridCols: GRID_W, gridRows: GRID_H });
	lastPlayerPos = { mode: "world", x: p.x, y: p.y };
}

function renderPlayerPanel() {
	if (!playerStatsEl) return;
	const s = getPlayerStats(state);
	const phaseIndicator = (s.allPhases || ["day", "dusk", "night", "dawn"])
		.map((p) => {
			const icon = { day: "🌝", dusk: "🌘", night: "🌚", dawn: "🌔" }[p];
			const active = p === s.phase ? " phase-current" : "";
			return `<span class="phase-dot${active}" title="${p}">${icon}</span>`;
		})
		.join(" ");
	playerStatsEl.innerHTML = `
    <div class="player-row">📍 (${s.x},${s.y})${s.distFromVillage > 0 ? ` · От деревни: ${s.distFromVillage}` : ""}</div>
    <div class="player-row">❤️ HP: ${s.hp}/${s.maxhp}  🧪 ${s.potionCount ?? 0}</div>
    <div class="player-row">🗓️ День: ${s.dayNumber}</div>
    <div class="player-row">${s.phaseIcon} Время: ${s.phaseName}</div>
    <div class="player-row">Шаг: ${s.stepInDay ?? 1}/${s.totalSteps ?? 50}</div>
    <div class="player-row phase-indicator">${phaseIndicator}</div>
    <div class="player-row">👣 Осталось шагов: ${s.dayStepsLeft}/${s.totalSteps ?? 50}</div>
    ${s.effects.length ? `<div class="player-effects">${s.effects.join(" ")}</div>` : ""}
  `;
}

function renderInventory() {
	const invEl = document.getElementById("inventory");
	if (!invEl) return;
	const s = getPlayerStats(state);
	const items = state.player?.items || [];
	const itemCounts = {};
	for (const emoji of items) {
		itemCounts[emoji] = (itemCounts[emoji] || 0) + 1;
	}
	const itemParts = Object.entries(itemCounts)
		.sort((a, b) => b[1] - a[1])
		.map(([emoji, n]) => (n > 1 ? `${emoji}×${n}` : emoji))
		.join(" ");
	invEl.innerHTML = `
    <div class="inv-row">🪵 ${s.wood} 🪨 ${s.stone} 🌿 ${s.herb ?? 0} 🍖 ${s.food} 🐟 ${s.fish} 💰 ${s.gold}</div>
    <div class="inv-row inv-items"><span class="inv-label">Предметы:</span> ${itemParts || "—"}</div>
  `;
}

function renderHomeActions() {
	if (!actionsEl) return;
	actionsEl.style.display = "flex";
	if (combatPanelEl) combatPanelEl.style.display = "none";
	const hasSelection = selectedHomeX != null && selectedHomeY != null;
	const btns = `
    <button data-home-action="plot">🟫 Грядка</button>
    <button data-home-action="veg">🥕 Посадить овощ</button>
    <button data-home-action="fruit">🍎 Посадить фрукт</button>
    <button data-home-action="pig">🐷 Добавить свинью</button>
    <button data-home-action="collect">📦 Собрать</button>
    <button data-home-action="exit">🚪 Выйти из дома</button>
  `;
	actionsEl.innerHTML = btns;
	if (contextHintsEl) {
		const sel = hasSelection ? `Выбрано: (${selectedHomeX},${selectedHomeY})` : "Кликните по клетке для выбора";
		contextHintsEl.innerHTML = `<div class="hint-tile">🏠 Вы дома</div><div class="hints-list">${sel}</div>`;
	}
	actionsEl.querySelectorAll("[data-home-action]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const action = btn.dataset.homeAction;
			if (action === "exit") {
				exitHouse();
				return;
			}
			if (!hasSelection) return;
			performTurn_(() => {
				let ok = false;
				if (action === "plot") ok = placePlot(state, selectedHomeX, selectedHomeY);
				if (action === "veg") ok = plantVeg(state, selectedHomeX, selectedHomeY);
				if (action === "fruit") ok = plantFruit(state, selectedHomeX, selectedHomeY);
				if (action === "pig") ok = addPig(state, selectedHomeX, selectedHomeY);
				if (action === "collect") ok = collect(state, selectedHomeX, selectedHomeY);
			});
		});
	});
}

function renderActionsOrCombat() {
	const inCombat = isInCombat(state);
	if (actionsEl) actionsEl.style.display = inCombat ? "none" : "flex";
	if (combatPanelEl) combatPanelEl.style.display = inCombat ? "block" : "none";

	if (inCombat && combatPanelEl) {
		const data = getCombatDisplayData(state);
		if (data && combatPlayerEl && combatEnemyEl && combatLogEl) {
			combatPlayerEl.innerHTML = `
        <div class="combat-fighter-icon">${data.player.icon}</div>
        <div class="combat-fighter-name">Вы</div>
        ${data.player.armorBar ? `<div class="combat-fighter-armor">${data.player.armorBar}</div>` : ""}
        <div class="combat-fighter-hp">${data.player.hpBar}</div>
        <div class="combat-fighter-effects">${data.player.effects.join(" ") || "—"}</div>
      `;
			combatEnemyEl.innerHTML = `
        <div class="combat-fighter-icon">${data.enemy.icon}</div>
        <div class="combat-fighter-name">${data.enemy.name}</div>
        ${data.enemy.armorBar ? `<div class="combat-fighter-armor">${data.enemy.armorBar}</div>` : ""}
        <div class="combat-fighter-hp">${data.enemy.hpBar}</div>
        <div class="combat-fighter-effects">${data.enemy.effects.join(" ") || "—"}</div>
      `;
			combatLogEl.innerHTML = data.combatLog.length
				? data.combatLog.map((line) => `<div class="combat-log-line">${line}</div>`).join("")
				: "<div class='combat-log-line combat-log-empty'>—</div>";
		}

		combatPanelEl.querySelectorAll("[data-combat]").forEach((btn) => {
			const clone = btn.cloneNode(true);
			btn.replaceWith(clone);
			clone.addEventListener("click", () => {
				const action = clone.dataset.combat;
				performTurn_(() => {
					const hadCombat = !!state.combat;
					combatTurn(state, action);
					if (action === "attack" || action === "defend") {
						try {
							AudioManager.playHit();
						} catch (_) {}
					}
					if (hadCombat && !state.combat && (state.combatLog || [])[0]?.includes("побеждён")) {
						try {
							AudioManager.playDeath();
						} catch (_) {}
					}
				});
			});
		});
	} else if (!inCombat && actionsEl) {
		const villager = getVillagerOnTile(state);
		const canChop = canChopWood(state);
		const canQ = canQuarry(state);
		const canH = canHunt(state);
		const canF = canFish(state);
		const houseCost = CFG.BUILD?.HOUSE_COST || {};
		const icons = { wood: "🪵", stone: "🪨", gold: "💰" };
		const potionCount = (state.player?.items || []).filter((i) => i === "🧪").length;
		const rationsCount = (state.player?.items || []).filter((i) => i === "🍱").length;
		let actionButtons = "";
		if (potionCount > 0)
			actionButtons += `<button data-action="use-consumable" data-item="🧪">🧪 Использовать зелье (${potionCount})</button>`;
		if (rationsCount > 0)
			actionButtons += `<button data-action="use-consumable" data-item="🍱">🍱 Использовать рационы (${rationsCount})</button>`;
		const homePos = CFG.BUILD?.HOME_POSITION || { x: 3, y: 9 };
		const atHome = state.player.x === homePos.x && state.player.y === homePos.y;
		actionButtons += `<button data-action="portal-home" ${atHome ? "disabled" : ""} title="Телепорт к дому">🌀 Домой</button>`;
		actionButtons += `
      <button data-action="chop" ${!canChop ? "disabled" : ""}>🪓 Рубить</button>
      <button data-action="quarry" ${!canQ ? "disabled" : ""}>⛏️ Камень</button>
      <button data-action="hunt" ${!canH ? "disabled" : ""}>🏹 Охота</button>
      <button data-action="fish" ${!canF ? "disabled" : ""}>🎣 Рыба</button>
    `;
		if (isOnDreamHouseSpot()) {
			const canBuy = canBuyDreamHouse();
			const costParts = Object.entries(houseCost).map(([k, v]) => {
				const text = (icons[k] || k) + v;
				const isMissing = !canBuy && (state.player[k] || 0) < v;
				return isMissing ? `<span class="cost-missing">${text}</span>` : text;
			});
			const costStr = costParts.join(" ");
			actionButtons =
				`<button data-action="buy-dream-house" ${!canBuy ? "disabled" : ""}>🏡 Купить дом мечты (${costStr})</button>` +
				actionButtons;
		}
		if (isOnHouseTile()) {
			actionButtons = `<button data-action="enter-house">🚪 Войти в дом</button>${actionButtons}`;
		}
		if (villager) {
			actionButtons = `<button data-action="talk">💬 Поговорить (${villager.name})</button>${actionButtons}`;
		}
		actionsEl.innerHTML = actionButtons;
		actionsEl.querySelectorAll("[data-action]").forEach((btn) => {
			if (btn.disabled) return;
			btn.addEventListener("click", () => {
				const action = btn.dataset.action;
				if (action === "enter-house") {
					enterHouse();
					return;
				}
				if (action === "buy-dream-house") {
					performTurn_(() => {
						if (buildHouse(state)) moveEntitiesOnAction(state);
					});
					return;
				}
				if (action === "use-consumable") {
					const item = btn.dataset.item;
					if (item)
						performTurn_(() => {
							if (useConsumable(state, item)) moveEntitiesOnAction(state);
						});
					return;
				}
				if (action === "portal-home") {
					performTurn_(() => {
						if (portalHome(state)) moveEntitiesOnAction(state);
					});
					return;
				}
				performTurn_(() => {
					let ok = false;
					if (action === "talk") ok = doTalk(state);
					if (action === "chop") {
						ok = doChopWood(state);
						if (ok) {
							try {
								AudioManager.playChop();
							} catch (_) {}
						}
					}
					if (action === "quarry") {
						ok = doQuarry(state);
						if (ok) {
							try {
								AudioManager.playQuarry();
							} catch (_) {}
						}
					}
					if (action === "hunt") ok = doHunt(state);
					if (action === "fish") ok = doFish(state);
					if (ok) moveEntitiesOnAction(state);
				});
			});
		});
	}

	if (contextHintsEl && !inCombat) {
		const { hints, reasons, tileEmoji, tileName, shortActions } = getContextHints(state);
		let html = "";
		if (hints.length) {
			const tileLine =
				tileEmoji && tileName
					? `<div class="hint-tile">${tileEmoji} ${tileName} → ${shortActions.join(", ")}</div>`
					: "";
			html += `${tileLine}<ul class='hints-list'>${hints.map((h) => `<li>${h}</li>`).join("")}</ul>`;
		} else if (reasons.length) {
			const tileLine = tileEmoji && tileName ? `<div class="hint-tile">${tileEmoji} ${tileName}</div>` : "";
			html += `${tileLine}<ul class='reasons-list'>${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>`;
		} else {
			const tileLine = tileEmoji && tileName ? `<div class="hint-tile">${tileEmoji} ${tileName}</div>` : "";
			html += `${tileLine}<div class='hints-empty'>—</div>`;
		}
		contextHintsEl.innerHTML = html;
	} else if (contextHintsEl && inCombat) {
		contextHintsEl.innerHTML = "<div class='hint-tile'>⚔️ Режим боя — используйте кнопки</div>";
	}
}

function renderContextHints() {
	if (contextHintsEl && !isInCombat(state)) {
		const { hints, reasons, tileEmoji, tileName, shortActions } = getContextHints(state);
		let html = "";
		if (hints.length) {
			const tileLine =
				tileEmoji && tileName
					? `<div class="hint-tile">${tileEmoji} ${tileName} → ${shortActions.join(", ")}</div>`
					: "";
			html += `${tileLine}<ul class='hints-list'>${hints.map((h) => `<li>${h}</li>`).join("")}</ul>`;
		} else if (reasons.length) {
			const tileLine = tileEmoji && tileName ? `<div class="hint-tile">${tileEmoji} ${tileName}</div>` : "";
			html += `${tileLine}<ul class='reasons-list'>${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>`;
		} else {
			const tileLine = tileEmoji && tileName ? `<div class="hint-tile">${tileEmoji} ${tileName}</div>` : "";
			html += `${tileLine}<div class='hints-empty'>—</div>`;
		}
		contextHintsEl.innerHTML = html;
	}
}

function renderHistory() {
	if (!historyEl) return;
	let items = (state.history || []).slice(0, 50);
	const playerName = state.player?.name || "Hero";
	const isPlayerRelated = (h) => h.who === playerName || (h.what || "").includes("«");
	const isWorldRelated = (h) => !isPlayerRelated(h);
	if (historyShowGlobal || historyShowPlayer) {
		items = items.filter((h) => (historyShowGlobal && isWorldRelated(h)) || (historyShowPlayer && isPlayerRelated(h)));
	}
	let lastKey = "";
	const grouped = [];
	for (const h of items) {
		const key = `${h.day}-${h.moveInDay ?? 0}`;
		if (key !== lastKey) {
			grouped.push({ type: "group", day: h.day, moveInDay: h.moveInDay });
			lastKey = key;
		}
		grouped.push({ type: "entry", ...h });
	}

	function isCombat(g) {
		const w = (g.what || "") + (g.got || "");
		return /⚔️|🧟|❤️-|Убил|Отбился|Получил|Удар|ударил/.test(w);
	}

	historyEl.innerHTML =
		grouped
			.map((g) => {
				if (g.type === "group") {
					const label = g.moveInDay === 0 ? `День ${g.day}` : `День ${g.day}, шаг ${g.moveInDay}`;
					return `<div class="history-group">${label}</div>`;
				}
				const line = [g.who, g.got, g.what].filter(Boolean).join(" ");
				const mapInfo = g.mapInfo ? ` <span class="map-info">${g.mapInfo}</span>` : "";
				const combatClass = isCombat(g) ? " combat" : "";
				return `<div class="history-item${combatClass}">${line}${mapInfo}</div>`;
			})
			.join("") || "<div class='history-item'>—</div>";

	historyEl.scrollTop = 0;
}

function renderCraft() {
	if (!craftListEl || !craftDetailsEl) return;
	const allSpecs = getCraftSpecsWithState(state);

	if (craftTabWeaponsEl) {
		craftTabWeaponsEl.className = `craft-tab${selectedCraftCategory === "weapon" ? " active" : ""}`;
		craftTabWeaponsEl.onclick = () => {
			selectedCraftCategory = selectedCraftCategory === "weapon" ? null : "weapon";
			selectedCraftIndex = null;
			renderCraft();
		};
	}
	if (craftTabItemsEl) {
		craftTabItemsEl.className = `craft-tab${selectedCraftCategory === "item" ? " active" : ""}`;
		craftTabItemsEl.onclick = () => {
			selectedCraftCategory = selectedCraftCategory === "item" ? null : "item";
			selectedCraftIndex = null;
			renderCraft();
		};
	}

	const specs = selectedCraftCategory ? allSpecs.filter((s) => (s.category || "item") === selectedCraftCategory) : [];

	craftListEl.innerHTML = specs.length
		? specs
				.map((spec) => {
					const active = spec.index === selectedCraftIndex ? " active" : "";
					const canClass = spec.canCraft ? " can-craft" : "";
					return `<button type="button" data-craft-index="${spec.index}" class="craft-list-item${active}${canClass}" aria-pressed="${active ? "true" : "false"}">
          <span class="craft-list-icon">${spec.item}</span>
          <span class="craft-list-name">${spec.name}</span>
        </button>`;
				})
				.join("")
		: "";

	craftListEl.querySelectorAll(".craft-list-item").forEach((el) => {
		el.addEventListener("click", () => {
			selectedCraftIndex = Number(el.dataset.craftIndex);
			renderCraft();
		});
	});

	const spec = selectedCraftIndex != null ? allSpecs.find((s) => s.index === selectedCraftIndex) : null;
	if (spec) {
		const costSpans = spec.costParts
			.map((p) => `<span class="craft-cost-part${p.missing ? " craft-cost-missing" : ""}">${p.text}</span>`)
			.join("");
		craftDetailsEl.innerHTML = `
      <div class="craft-details-header">
        <span class="craft-details-icon">${spec.item}</span>
        <h4 class="craft-details-name">${spec.name}</h4>
      </div>
      <div class="craft-details-effect">${spec.effect || ""}</div>
      <div class="craft-details-cost-row">
        <span class="craft-details-cost-value">${costSpans}</span>
        <button data-craft="${spec.index}" class="craft-do-btn"${spec.canCraft ? "" : " disabled"} title="${spec.canCraft ? "Скрафтить" : "Не хватает ресурсов"}">✓</button>
      </div>
    `;
		const btn = craftDetailsEl.querySelector("[data-craft]");
		if (btn && spec.canCraft) {
			btn.addEventListener("click", () => {
				performTurn_(() => {
					if (craft(state, CRAFT_SPECS[spec.index])) moveEntitiesOnAction(state);
				});
			});
		}
	} else {
		craftDetailsEl.innerHTML = "";
	}
}

function renderQuests() {
	if (!questsEl) return;
	const quests = getActiveQuests(state);
	if (!quests.length) {
		questsEl.innerHTML = "<div class='quests-empty'>— Нет активных квестов</div>";
		return;
	}
	questsEl.innerHTML = quests
		.map((q) => `<div class="quest-item">📜 ${q.name}<br><small>${q.progressText}</small></div>`)
		.join("");
}

function renderRules() {
	if (!rulesEl) return;
	rulesEl.innerHTML = `<pre class='rules-text'>${RULES_TEXT.join("\n")}</pre>`;
}

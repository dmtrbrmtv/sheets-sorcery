// ===== Sheets & Sorcery: Web =====
// Milestones 4–6: Core mechanics, History, Persistence

import { GRID_W, GRID_H, CELL_SIZE_PX, CFG } from "./config.js";
import { WORLD } from "./world_base.js";
import { createInitialState, getTileAt, buildVisibleSet } from "./gameState.js";
import { move, waitTurn, doChopWood, doQuarry, doHunt, doFish, buildHouse, newDay, craft, CRAFT_SPECS } from "./actions.js";

// --- State ---
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem("sheets-sorcery");
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    parsed.revealed = new Set(parsed.revealed || []);
    if (!parsed.world || !parsed.player) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState() {
  const toSave = {
    ...state,
    revealed: Array.from(state.revealed),
  };
  localStorage.setItem("sheets-sorcery", JSON.stringify(toSave));
}

// --- Mount ---
const gridEl = document.getElementById("grid");
const debugEl = document.getElementById("debug");
const historyEl = document.getElementById("history");
const actionsEl = document.getElementById("actions");
const resetBtn = document.getElementById("reset");

if (!gridEl) throw new Error("index.html must contain <div id='grid'></div>");

document.documentElement.style.setProperty("--cell-size", `${CELL_SIZE_PX}px`);
gridEl.style.display = "grid";
gridEl.style.gridTemplateColumns = `repeat(${GRID_W}, ${CELL_SIZE_PX}px)`;
gridEl.style.gridAutoRows = `${CELL_SIZE_PX}px`;
gridEl.style.gap = "2px";
gridEl.style.padding = "16px";
gridEl.tabIndex = 0;

render();
updateDebug();
renderHistory();
renderActions();

// Click: move one step toward clicked cell if walkable
gridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const x = Number(cell.dataset.x) + 1;
  const y = Number(cell.dataset.y) + 1;

  const dx = Math.sign(x - state.player.x);
  const dy = Math.sign(y - state.player.y);
  if (dx === 0 && dy === 0) return;

  const dir = dy < 0 ? "N" : dy > 0 ? "S" : dx > 0 ? "E" : "W";
  move(state, dir);
  const visible = buildVisibleSet(state.player);
  visible.forEach(k => state.revealed.add(k));
  saveState();

  render();
  updateDebug();
  renderHistory();
});

// Keyboard
gridEl.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  let dir = null;
  if (key === "arrowup" || key === "w") dir = "N";
  if (key === "arrowdown" || key === "s") dir = "S";
  if (key === "arrowleft" || key === "a") dir = "W";
  if (key === "arrowright" || key === "d") dir = "E";

  if (dir) {
    e.preventDefault();
    move(state, dir);
    const visible = buildVisibleSet(state.player);
    visible.forEach(k => state.revealed.add(k));
    saveState();
    render();
    updateDebug();
    renderHistory();
  }
});

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (confirm("Сбросить игру?")) {
      localStorage.removeItem("sheets-sorcery");
      state = createInitialState();
      render();
      updateDebug();
      renderHistory();
      renderActions();
    }
  });
}

gridEl.focus();

// --- Render ---
function render() {
  gridEl.innerHTML = "";
  const p = state.player;
  const visible = buildVisibleSet(p);
  visible.forEach(k => state.revealed.add(k));

  const playerCells = new Set([`${p.x},${p.y}`]);
  const animalCells = new Map();
  (state.animals || []).forEach(a => {
    if (state.revealed.has(`${a.x},${a.y}`) && !playerCells.has(`${a.x},${a.y}`)) {
      animalCells.set(`${a.x},${a.y}`, a.emoji || "🐇");
    }
  });

  for (let y = 1; y <= GRID_H; y++) {
    for (let x = 1; x <= GRID_W; x++) {
      const key = `${x},${y}`;
      const isRevealed = state.revealed.has(key);
      let tile = isRevealed ? getTileAt(state.world, x, y) : CFG.FOG.fogChar;
      const animal = animalCells.get(key);
      if (animal) tile = tile + animal;

      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = String(x - 1);
      cell.dataset.y = String(y - 1);

      const terrain = document.createElement("span");
      terrain.className = "terrain";
      terrain.textContent = tile;

      if (x === p.x && y === p.y) {
        const pl = document.createElement("span");
        pl.className = "player";
        pl.textContent = p.icon;
        cell.appendChild(terrain);
        cell.appendChild(pl);
      } else {
        cell.appendChild(terrain);
      }

      gridEl.appendChild(cell);
    }
  }
}

function updateDebug() {
  if (!debugEl) return;
  const p = state.player;
  debugEl.innerHTML = `Cell: (${p.x},${p.y}) &nbsp; Day: ${state.day} &nbsp; 👣${p.moves} &nbsp; ❤️${p.hp}/${p.maxhp}`;
}

function renderHistory() {
  if (!historyEl) return;
  const items = (state.history || []).slice(0, 30);
  historyEl.innerHTML = items.map(h => {
    const line = [h.who, h.got, h.what].filter(Boolean).join(" ");
    return `<div class="history-item">${line}</div>`;
  }).join("") || "<div class='history-item'>—</div>";
}

function renderActions() {
  if (!actionsEl) return;
  const actionBtns = `
    <button data-action="chop">🪓 Рубить</button>
    <button data-action="quarry">⛏️ Камень</button>
    <button data-action="hunt">🏹 Охота</button>
    <button data-action="fish">🎣 Рыба</button>
    <button data-action="build">🏠 Дом</button>
    <button data-action="wait">⏸️ Пропуск</button>
    <button data-action="newday">🎆 Новый день</button>
  `;
  const craftBtns = CRAFT_SPECS.map((s, i) =>
    `<button data-craft="${i}">🔨 ${s.item}</button>`
  ).join("");
  actionsEl.innerHTML = `<div class="action-row">${actionBtns}</div><div class="craft-row">${craftBtns}</div>`;

  actionsEl.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      let ok = false;
      if (action === "chop") ok = doChopWood(state);
      if (action === "quarry") ok = doQuarry(state);
      if (action === "hunt") ok = doHunt(state);
      if (action === "fish") ok = doFish(state);
      if (action === "build") ok = buildHouse(state);
      if (action === "wait") ok = waitTurn(state);
      if (action === "newday") ok = newDay(state);
      if (ok) {
        saveState();
        render();
        updateDebug();
        renderHistory();
      }
    });
  });

  actionsEl.querySelectorAll("[data-craft]").forEach(btn => {
    btn.addEventListener("click", () => {
      const spec = CRAFT_SPECS[Number(btn.dataset.craft)];
      if (craft(state, spec)) {
        saveState();
        render();
        updateDebug();
        renderHistory();
      }
    });
  });
}

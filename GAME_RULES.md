# GAME RULES

Before any refactor, read this file and scan the codebase.

TASK:
1) List all sheets used in CFG and where they are referenced.
2) List all public entry functions (menu / buttons / triggers).
3) List where player name, icon and email are parsed.

IMPORTANT:
- Do NOT change any code yet.
- This step is analysis only.

---

## Analysis (codebase scan) 02.02..2026

### 1) Sheets used in CFG and where they are referenced

Defined in **00_Config.js** (`CFG.SHEETS`):

| Sheet key | Display name (Russian) | References |
|-----------|------------------------|------------|
| `map` | 🗺 Карта | **02_Setup.js** (7, 26), **80_Fog_RenderHUD.js** (7, 51, 56) |
| `base` | 🗺 База (истина) | **02_Setup.js** (8, 27), **40_WorldBase.js** (6, 7, 19), **80_Fog_RenderHUD.js** (8) |
| `players` | 🧙🏼‍♂️Персонажи | **02_Setup.js** (9), **30_Players.js** (66, 148, 159, 166, 175, 193, 206, 262, 306, 339) |
| `history` | 📜История | **02_Setup.js** (10), **70_Timers_History.js** (73, 81) |
| `timers` | ⏱Таймеры | **02_Setup.js** (11), **70_Timers_History.js** (8, 21, 27, 42) |
| `equip` | 🧳Эквип | **02_Setup.js** (12), **30_Players.js** (229, 237, 243, 263) |
| `craft` | 🧾Крафт | **02_Setup.js** (13), **60_Craft.js** (37) |

- **20_Sheets.js** defines `getSheet_(ss, name)` and `ensureSheet_(ss, name)`; both use `ss.getSheetByName(name)` with names from `CFG.SHEETS`.
- **02_Setup.js** uses `getSheet_` for map/players (must exist), `ensureSheet_` for base/history/timers/equip/craft (created if missing).

---

### 2) Public entry functions (menu / buttons / triggers)

- **Triggers:** None in `appsscript.json` (no installable or simple triggers declared in the repo).
- **Menu:** Built in **01_Menu.js** by `onOpen()` (simple trigger: runs when the spreadsheet is opened).

**Menu entry → function (file):**

| Menu label | Function | File |
|------------|----------|------|
| 🧰 Setup — первый запуск | `setupFirstRun` | 02_Setup.js |
| 🧲 Sync Base — запомнить тайлы с 🗺 Карта | `syncBaseFromMap` | 02_Setup.js |
| 🌫️ Обновить туман | `updateFog` | 80_Fog_RenderHUD.js |
| 📍 Прыгнуть к себе | `jumpToMe` | 80_Fog_RenderHUD.js |
| 🟢 Active — только я | `setActiveOnlyMe` | 30_Players.js |
| 🟢 Active — первые 5 | `setActiveFirst5` | 30_Players.js |
| ⬆️ Move N | `moveN` | 50_Actions.js |
| ⬇️ Move S | `moveS` | 50_Actions.js |
| ⬅️ Move W | `moveW` | 50_Actions.js |
| ➡️ Move E | `moveE` | 50_Actions.js |
| 🪵 Рубка леса (…) | `doChopWood` | 50_Actions.js |
| ⛏️ Каменоломня (…) | `doQuarry` | 50_Actions.js |
| 🏹 Охота (…) | `doHunt` | 50_Actions.js |
| 🎣 Рыбалка (рядом 🌊) | `doFish` | 50_Actions.js |
| 🏠 Дом (…) | `buildHouse` | 50_Actions.js |
| 🔨 Крафт: 🪓 Топор (…) | `craftAxe` | 60_Craft.js |
| 🔨 Крафт: ⛏️ Кирка (…) | `craftPick` | 60_Craft.js |
| 🔨 Крафт: 🗡️ Меч (…) | `craftSword` | 60_Craft.js |
| 🔨 Крафт: 🛡️ Щит (…) | `craftShield` | 60_Craft.js |
| 📜 Крафт — обновить | `refreshCraftSheet` | 60_Craft.js |
| 🎆 Новый день (мастер) | `newDayMaster` | 70_Timers_History.js |
| ⏩ Пропустить неделю | `skipWeek` | 70_Timers_History.js |

**Single UI entry point:** `onOpen` in **01_Menu.js** (no buttons or other triggers found in code).

---

### 3) Player name, icon and email parsing

- **Name & icon (from sheet):**  
  In **30_Players.js**, `readPlayers_(ss)` (lines ~65–125):
  - Reads the **players** sheet; header lookup uses `findColExact_(header, ["Персонаж", "Игрок", "Name"])` for the name column and `["Icon", "🙂", "Иконка"]` for the icon column.
  - For each data row: `rawName = String(row[col.name] || "").trim()`.
  - **Parsing:** `splitIconAndName_(rawName)` is called; then:
    - If no leading emoji, icon is taken from the icon column (if present): `row[col.icon]`.
    - **Email:** icon is cleared if it looks like email: `if (icon.includes("@")) icon = "";` (line 117). So “email” is only used to **reject** an icon value, not to parse or store email.
  - Final `name`: if empty after split, fallback is `rawName`.

- **`splitIconAndName_` (logic):**  
  Defined in **two** places:
  1. **00_Config.js** (lines 10–22): uses `\p{Extended_Pictographic}…` regex; returns `{ icon, name }`.
  2. **30_Players.js** (lines 41–62): duplicate implementation with different regex (`\p{Emoji_Presentation}…` and a fallback).  

  Only **30_Players.js** uses it (in `readPlayers_`). So **player name and icon are parsed** in **30_Players.js** inside `readPlayers_`, using the local `splitIconAndName_` and the "icon is not an email" check; **email** is not parsed as a field, only used to blank the icon when it contains `@`.

---

## Refactor plan (analysis only — no code changes yet)

**Principles:** GAME_RULES.md is the single source of truth. Do not change gameplay rules or data contracts. Only remove duplication, dead code, and inconsistencies. If rule contradictions are found, report first; do not fix yet.

### Rule contradictions (code vs CFG / docs)

- **None detected.** CFG constants (SHEETS, GRID, FOG, BLOCKED, RESOURCES.HUNT_TILES, etc.) are used consistently. Sheet names, grid, fog, and parsing behavior match the analysis above.

---

### 1) Safe refactor plan (ordered steps)

| Step | Scope | Risk | Description |
|------|--------|------|-------------|
| **1** | 00_Config.js, 30_Players.js | Low | Remove duplicate `splitIconAndName_`: keep a single implementation (see "Smallest first step" below). |
| **2** | 30_Players.js, 70_Timers_History.js, 40_WorldBase.js | Low | Unify sheet access: use `getSheet_` or `ensureSheet_` everywhere instead of mixing with `ss.getSheetByName(...)`. |
| **3** | 30_Players.js | Low | Optionally group "active" menu handlers with fog/HUD or a dedicated place if file grows; no change to behavior or contracts. |
| **4** | (Future) | — | Any further cleanup only after 1–2 are done and tested. |

**Out of scope for this refactor:** gameplay rules, CFG values, sheet names, column semantics, menu items, or parsing contract (name/icon/email behavior).

---

### 2) Duplicated logic and unclear responsibilities

**Duplication**

- **`splitIconAndName_(raw)`** — Defined in **00_Config.js** (lines 10–22) and **30_Players.js** (lines 41–62). Different regexes (Config: `Extended_Pictographic`; Players: `Emoji_Presentation` + fallback). Only **30_Players.js** calls it (from `readPlayers_`). In Apps Script load order, 30_Players runs after 00_Config, so the **30_Players** implementation is the one that actually runs; the **00_Config** version is dead code. **Action:** One canonical implementation; remove the other (prefer Config as helper, or keep in Players; align behavior with current runtime).

- **Sheet access pattern** — **getSheet_** / **ensureSheet_** used in some places; **ss.getSheetByName(CFG.SHEETS.xxx)** in others, with manual null checks. **30_Players.js:** mix of `getSheet_` and `ss.getSheetByName` (166, 243, 262, 263). **70_Timers_History.js:** `ensureSheet_` vs `ss.getSheetByName` (27, 42) with `if (!sh) return`. **40_WorldBase.js:** `ss.getSheetByName` + manual throw (6–7) vs `getSheet_` (19). **Action:** Use helpers consistently: "must exist" → `getSheet_`; "create if missing" → `ensureSheet_`.

**Unclear / mixed responsibilities**

- **30_Players.js** contains: (a) "Active" mode and menu entry points (`setActiveOnlyMe`, `setActiveFirst5`), (b) player parsing and column mapping (`readPlayers_`, `splitIconAndName_`), (c) player mutators, (d) equip sheet (ensure header, add item, has item), (e) sync of equip → player tool flags (`syncToolFlags_`), (f) ensure-players-columns. No contradiction with GAME_RULES; only note for future splitting if the file grows.

- **80_Fog_RenderHUD.js** calls `syncToolFlags_(ss)` after updating fog. That couples fog render to "sync tool flags from equip"; acceptable by current design, but responsibility is slightly mixed. No change suggested here; only document.

**Dead code**

- **`splitIconAndName_` in 00_Config.js** is never used at runtime (overwritten by 30_Players.js). Removing the duplicate (Step 1) removes this dead definition.

---

### 3) Smallest first refactor step

**Step 1 (recommended first):** Consolidate `splitIconAndName_` and remove duplication.

- **Option A (preferred):** Keep **one** implementation in **00_Config.js** (canonical helper next to CFG). Make it **behaviorally match** the current runtime implementation in **30_Players.js** (same regex/fallback and edge cases: empty input, trim, `{ icon, name }`). Remove the entire `splitIconAndName_` function (and the "EMOJI + NAME PARSER" comment block) from **30_Players.js**. In **30_Players.js**, keep the rest of `readPlayers_` unchanged (including the "icon column" fallback and `if (icon.includes("@")) icon = ""`). **Verification:** Run a test that uses `readPlayers_` (e.g. "Прыгнуть к себе" or "Move") and confirm player name/icon still parse correctly for a row with leading emoji and a row with separate icon column.

- **Option B:** Keep the implementation only in **30_Players.js** and remove it from **00_Config.js** (so Config has no parsing helper). Same verification as above.

**Why this first:** Single file change (or two small edits), no CFG or sheet changes, no new APIs. Only removes dead code and one duplicate; keeps parsing contract and gameplay unchanged.

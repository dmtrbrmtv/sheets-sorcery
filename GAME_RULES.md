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

## Analysis (codebase scan)

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

  Only **30_Players.js** uses it (in `readPlayers_`). So **player name and icon are parsed** in **30_Players.js** inside `readPlayers_`, using the local `splitIconAndName_` and the “icon is not an email” check; **email** is not parsed as a field, only used to blank the icon when it contains `@`.
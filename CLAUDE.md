# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sheets & Sorcery** is a dual-platform tactical RPG with:
- **Google Sheets + Apps Script version** — the original, runs in Google Sheets
- **Browser version** — vanilla ES6 modules, served from `/docs` (GitHub Pages)

Both versions share core mechanics: resource gathering, crafting, combat, fog of war, and procedural world generation. UI and data are in Russian.

## Commands

```bash
# Web version development
pnpm dev                        # Start local server at http://localhost:3333

# Linting (Biome)
pnpm lint                       # Check for issues
pnpm lint:fix                   # Auto-fix issues

# Import Excel map to web version
pnpm import-map                 # Reads "Sheets & Sorcery.xlsx" → generates docs/world_base.js

# Apps Script deployment (requires clasp)
clasp push                      # Push code to Google Apps Script
clasp deploy                    # Create deployment
```

## Architecture

### Apps Script Version (numbered files)

Files load in numeric order. Functions ending with `_` are private.

| File | Responsibility |
|------|----------------|
| `00_Config.js` | CFG object (sheets, grid, fog, resources, zombie stats, NPC definitions) |
| `01_Menu.js` | `onOpen()` trigger — builds game menu |
| `02_Setup.js` | First-run setup, sync base from map |
| `10_Utils.js` | General utilities |
| `20_Sheets.js` | `getSheet_(ss, name)` and `ensureSheet_(ss, name)` helpers |
| `30_Players.js` | Player parsing, active state, equipment, tool flags |
| `40_WorldBase.js` | Read base tile definitions |
| `50_Actions.js` | Movement, gathering, hunting, fishing, building |
| `60_Craft.js` | Crafting system |
| `70_Timers_History.js` | Day/regeneration timers, action history |
| `80_Fog_RenderHUD.js` | Fog of war, HUD rendering in spreadsheet |
| `85_Entities.js` | Zombie and NPC management |
| `90_Zombie.js` | Zombie-specific mechanics |

**Data sheets:** `🗺 Карта` (map), `🗺 База` (base truth), `🧙🏼‍♂️Персонажи` (players), `📜История` (history), `⏱Таймеры` (timers), `🧳Эквип` (equipment), `🧾Крафт` (crafting)

### Web Version (`/docs`)

ES6 modules, no build step. State persisted in localStorage.

| File | Responsibility |
|------|----------------|
| `game.js` | Game loop, main UI, isometric map rendering |
| `gameState.js` | Centralized game state (player, world, entities, timers) |
| `actions.js` | All game actions (movement, combat, gathering, crafting) |
| `config.js` | Game balance (HP, damage, armor, accuracy, regen times) |
| `ui.js` | Stats, combat log, crafting interface rendering |
| `worldGenerator.js` | Procedural biome generation |
| `home.js` | Personal farm/building system |
| `terrain.js` | Tile properties and visuals |
| `world_base.js` | Generated base map data (from Excel import) |

## Key Mechanics

- **Day-night cycle:** day (20 steps) → dusk (10) → night (10) → dawn (10)
- **Fog of war:** 3-tile visibility radius, updates immediately on movement
- **Resource regeneration:** wood/stone (3 days), hunts (2 days)
- **Combat:** accuracy checks, damage types, status effects (bleeding, poison, fear)
- **5 animal types** with varying aggression; **3 NPC types**; **5 villager types** for trading/quests

## Important Notes

- **GAME_RULES.md is the single source of truth** for game design. Read it before refactoring.
- Keep both versions in sync when making gameplay changes
- Apps Script uses `splitIconAndName_()` to parse emoji + name from player data
- Sheet access should use `getSheet_()` (must exist) or `ensureSheet_()` (create if missing)

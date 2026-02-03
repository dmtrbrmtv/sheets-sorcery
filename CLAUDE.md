# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sheets & Sorcery** is a tactical RPG running in the browser (vanilla ES6 modules, served from `/docs`).

Core mechanics: resource gathering, crafting, combat, fog of war, and procedural world generation. UI and data are in Russian.

## Commands

```bash
# Web version development
pnpm dev                        # Start local server at http://localhost:3333

# Linting (Biome)
pnpm lint                       # Check for issues
pnpm lint:fix                   # Auto-fix issues

```

## Architecture

### Web Version (`/docs`)

ES6 modules, no build step. State persisted in localStorage.

| File | Responsibility |
|------|----------------|
| `game.js` | Game loop, main UI, isometric map rendering |
| `gameState.js` | Centralized game state (player, world, entities, timers) |
| `actions.js` | All game actions (movement, combat, gathering, crafting) |
| `config.js` | Game balance (HP, damage, armor, accuracy, regen times) |
| `ui.js` | Stats, combat log, crafting interface rendering |
| `worldGenerator.js` | Procedural world generation (base + infinite) |
| `home.js` | Personal farm/building system |
| `terrain.js` | Tile properties and visuals |

## Key Mechanics

- **Day-night cycle:** day (20 steps) → dusk (10) → night (10) → dawn (10)
- **Fog of war:** 3-tile visibility radius, updates immediately on movement
- **Resource regeneration:** wood/stone (3 days), hunts (2 days)
- **Combat:** accuracy checks, damage types, status effects (bleeding, poison, fear)
- **5 animal types** with varying aggression; **3 NPC types**; **5 villager types** for trading/quests

## Important Notes

- **GAME_RULES.md is the single source of truth** for game design. Read it before refactoring.

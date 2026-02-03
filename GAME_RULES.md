# GAME RULES (Web Only)

This file summarizes the web version rules and invariants. Treat this as the design contract for refactors.

## Sources of Truth

- `docs/config.js` is the authority for balance constants and tunables.
- `docs/actions.js` is the authority for gameplay rules and action behavior.
- `docs/gameState.js` defines the runtime state shape and initialization defaults.

If code and these sources disagree, update code to match the sources and adjust tests accordingly.

## Core Invariants

- Grid size is 26×32 (`GRID_W`, `GRID_H`).
- Base world is procedurally generated per new game seed; infinite world tiles extend beyond the base grid.
- Day-night cycle steps are fixed: day 20, dusk 10, night 10, dawn 10.
- Fog of war radius is 3 tiles.
- Resource regeneration is fixed: wood 3 days, stone 3 days, hunt 2 days.
- Village safe zone is the rectangular area (x: 2–4, y: 4–9).
- Player defaults on new game: 10 HP, 10 max HP, 2 ATK, 1 armor.
- Zombie defaults: 6 HP, 1–2 ATK damage, 70% accuracy, respawn after 5 days.

## Refactor Rules

- Do not change gameplay balance or rules without updating `docs/config.js` and relevant tests.
- Keep public game state fields stable unless explicitly required by a feature.
- When altering actions or combat flow, add or update tests under `tests/` to lock the behavior.

# Restored from previous update (combat/layout overhaul)

## What was REMOVED in the combat overhaul (and is now RESTORED)

### 1. Endless walking
- **Removed:** Movement consumed 1 step per move; when `phaseSteps <= 0`, movement was blocked with "Нет шагов"
- **Restored:** Movement is FREE — no step consumption. Player can walk endlessly across the map.

### 2. Day-night cycle (4 phases)
- **Removed:** Replaced with a single "day" phase of 5 steps. No dusk/night/dawn.
- **Restored:**
  - **Day:** 20 steps
  - **Dusk:** 10 steps  
  - **Night:** 10 steps
  - **Dawn:** 10 steps
  - Auto-advance: day → dusk → night → dawn → new day (+1 HP, regen)
  - Visual overlay: `phase-day`, `phase-dusk`, `phase-night`, `phase-dawn`
  - `isNight()`: true during dusk and night (zombie damage +1)

### 3. Step consumption scope
- **Removed:** Both movement and actions consumed steps
- **Restored:** Only actions consume steps: chop, quarry, hunt, fish, build. Combat does NOT consume steps (so you can always finish a fight).

### 4. Rules display
- **Removed:** "5 ходов в день", "Ночь (последние 2 хода)"
- **Restored:** Full phase breakdown and "Ходьба — бесплатно"

### 5. Player panel
- **Removed:** "Ходы: X/5"
- **Restored:** "День/Сумерки/Ночь/Рассвет: X/50" (phase label + steps)

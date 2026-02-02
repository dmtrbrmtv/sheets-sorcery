// ===== Sheets & Sorcery: World Base Map =====
// 26×32 blob-based procedural generator. Seed for reproducibility.

import { GRID_W, GRID_H } from "./config.js";
import { generateWorld } from "./worldGenerator.js";

function ensureDimensions(grid) {
  const out = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      const val = (grid[y] && grid[y][x]) ? String(grid[y][x]).trim() : "⬜️";
      row.push(val || "⬜️");
    }
    out.push(row);
  }
  return out;
}

/** Default seed for WORLD export (used when state has no worldSeed yet) */
const DEFAULT_SEED = 4242;

export const WORLD = ensureDimensions(generateWorld(DEFAULT_SEED));
export { generateWorld };

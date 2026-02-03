// ===== Sheets & Sorcery: Procedural World Generation =====
// Infinite world below the base map (y > GRID_H). Uses same blob generator as base map.

import { proceduralTileFromSeed } from "./worldGenerator.js";

/** Procedural tile — delegates to blob-based generator with world seed */
export function proceduralTile(x, y, state = null) {
	const seed = state?.worldSeed ?? 4242;
	return proceduralTileFromSeed(x, y, seed);
}

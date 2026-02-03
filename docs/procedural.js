// ===== Sheets & Sorcery: Procedural World Generation =====
// Infinite world extension beyond the base grid. Uses same blob generator as base world.

import { proceduralTileFromSeed } from "./worldGenerator.js";

/** Procedural tile — delegates to blob-based generator with world seed */
export function proceduralTile(x, y, state = null) {
	const seed = state?.worldSeed ?? 4242;
	return proceduralTileFromSeed(x, y, seed);
}

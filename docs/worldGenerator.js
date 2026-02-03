// ===== Sheets & Sorcery: Blob-Based Procedural World Generator =====
// Height + moisture noise → biomes, with smoothing. Reproducible via seed.

import { GRID_H, GRID_W } from "./config.js";

/** Smooth noise from grid hashes — blob-like, no stripes */
function smoothNoise(x, y, cellSize) {
	const x0 = Math.floor(x / cellSize) * cellSize;
	const y0 = Math.floor(y / cellSize) * cellSize;
	const x1 = x0 + cellSize;
	const y1 = y0 + cellSize;
	const fx = (x - x0) / cellSize;
	const fy = (y - y0) / cellSize;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);
	const h = (a, b) => (((a | 0) * 31 + (b | 0)) >>> 0) % 1000000;
	const v00 = (h(x0, y0) % 1000) / 1000;
	const v10 = (h(x1, y0) % 1000) / 1000;
	const v01 = (h(x0, y1) % 1000) / 1000;
	const v11 = (h(x1, y1) % 1000) / 1000;
	return v00 * (1 - sx) * (1 - sy) + v10 * sx * (1 - sy) + v01 * (1 - sx) * sy + v11 * sx * sy;
}

/** Deterministic hash for (x, y) with seed */
function hash(seed, x, y) {
	let h = seed;
	h = (h * 31 + (x | 0)) | 0;
	h = (h * 31 + (y | 0)) | 0;
	return (h >>> 0) % 1000000;
}

const BIOME_GRASS = "grass";
const BIOME_FOREST = "forest";
const BIOME_FIELD = "field";
const BIOME_MOUNTAIN = "mountain";
const BIOME_WATER = "water";
const BIOME_SHORE = "shore";

const BIOME_TO_TILES = {
	grass: ["🌿"],
	forest: ["🌳", "🌲"],
	field: ["🌾", "🌱"],
	mountain: ["🗻", "⛰️", "🪨"],
	water: ["🌊"],
	shore: ["🏝️"],
};

/** Map raw biome to emoji tile (with variety) */
function biomeToTile(biome, x, y, seed) {
	const tiles = BIOME_TO_TILES[biome];
	if (!tiles || tiles.length === 0) return "🌿";
	if (tiles.length === 1) return tiles[0];
	const idx = hash(seed + 1, x, y) % tiles.length;
	return tiles[idx];
}

/** Get 8-neighbor biome counts */
function getNeighborCounts(grid, x, y, w, h) {
	const counts = {};
	const dirs = [
		[-1, -1],
		[0, -1],
		[1, -1],
		[-1, 0],
		[1, 0],
		[-1, 1],
		[0, 1],
		[1, 1],
	];
	for (const [dx, dy] of dirs) {
		const nx = x + dx;
		const ny = y + dy;
		if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
			const b = grid[ny][nx];
			counts[b] = (counts[b] || 0) + 1;
		}
	}
	return counts;
}

/** Majority neighbor biome */
function majorityNeighbor(counts) {
	let best = null;
	let bestCount = 0;
	for (const [b, c] of Object.entries(counts)) {
		if (c > bestCount) {
			bestCount = c;
			best = b;
		}
	}
	return best;
}

/** Smoothing pass: if <=2 same-type neighbors, convert to majority */
function smoothPass(biomeGrid, w, h) {
	const next = biomeGrid.map((row) => [...row]);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const counts = getNeighborCounts(biomeGrid, x, y, w, h);
			const self = biomeGrid[y][x];
			const sameCount = counts[self] || 0;
			if (sameCount <= 2) {
				const maj = majorityNeighbor(counts);
				if (maj) next[y][x] = maj;
			}
		}
	}
	return next;
}

/** Remove isolated mountains: if mountain has <=1 mountain neighbor, convert to majority */
function clusterMountains(biomeGrid, w, h) {
	const next = biomeGrid.map((row) => [...row]);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			if (biomeGrid[y][x] !== BIOME_MOUNTAIN) continue;
			const counts = getNeighborCounts(biomeGrid, x, y, w, h);
			const mountainCount = counts[BIOME_MOUNTAIN] || 0;
			if (mountainCount <= 1) {
				const maj = majorityNeighbor(counts);
				if (maj && maj !== BIOME_MOUNTAIN) next[y][x] = maj;
			}
		}
	}
	return next;
}

/** Apply shore: water-adjacent land becomes shore (optional, can keep as grass/field) */
function applyShore(biomeGrid, w, h) {
	const next = biomeGrid.map((row) => [...row]);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			if (biomeGrid[y][x] !== BIOME_WATER) continue;
			const dirs = [
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1],
				[-1, -1],
				[1, -1],
				[-1, 1],
				[1, 1],
			];
			for (const [dx, dy] of dirs) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
					const n = biomeGrid[ny][nx];
					if (n !== BIOME_WATER && n !== BIOME_SHORE) {
						next[ny][nx] = BIOME_SHORE;
					}
				}
			}
		}
	}
	return next;
}

/** Village structure — override these cells after generation (0-based col, row) */
const VILLAGE_OVERRIDES = [
	[1, 3, "⬜️"],
	[2, 3, "🏠"],
	[3, 3, "⬜️"],
	[1, 4, "🏥"],
	[2, 4, "⬜️"],
	[3, 4, "⬜️"],
	[1, 5, "⬜️"],
	[2, 5, "🏠"],
	[3, 5, "⬜️"],
	[1, 6, "⬜️"],
	[2, 6, "🏠"],
	[3, 6, "⬜️"],
	[1, 7, "⬜️"],
	[2, 7, "⬜️"],
	[3, 7, "⬜️"],
	[1, 8, "⬜️"],
	[2, 8, "🪧"],
	[3, 8, "⬜️"],
];

/** Generate full 26×32 world with blob-based terrain */
export function generateWorld(seed = Date.now()) {
	const w = GRID_W;
	const h = GRID_H;

	// Height + moisture noise (different scales for blob shape). Offsets from seed for reproducibility.
	const heightScale = 10;
	const moistureScale = 12;
	const heightOffset = hash(seed, 0, 0) % 1000;
	const moistureOffset = hash(seed, 1, 0) % 1000;

	const biomeGrid = [];
	for (let y = 0; y < h; y++) {
		const row = [];
		for (let x = 0; x < w; x++) {
			const hVal = smoothNoise(x + heightOffset, y + heightOffset * 0.7, heightScale);
			const mVal = smoothNoise(x + moistureOffset, y + moistureOffset * 0.5, moistureScale);

			if (hVal < 0.25) {
				row.push(BIOME_WATER);
			} else if (hVal > 0.82) {
				row.push(BIOME_MOUNTAIN);
			} else if (hVal > 0.72 && mVal < 0.5) {
				row.push(BIOME_MOUNTAIN);
			} else if (mVal > 0.65 && hVal > 0.35) {
				row.push(BIOME_FOREST);
			} else if (mVal < 0.35 && hVal < 0.65) {
				row.push(BIOME_FIELD);
			} else if (mVal > 0.5) {
				row.push(BIOME_FOREST);
			} else {
				row.push(BIOME_GRASS);
			}
		}
		biomeGrid.push(row);
	}

	// Smoothing passes
	let smoothed = smoothPass(biomeGrid, w, h);
	smoothed = smoothPass(smoothed, w, h);
	smoothed = clusterMountains(smoothed, w, h);
	smoothed = applyShore(smoothed, w, h);

	// Convert biomes to tiles
	const tileGrid = [];
	for (let y = 0; y < h; y++) {
		const row = [];
		for (let x = 0; x < w; x++) {
			row.push(biomeToTile(smoothed[y][x], x, y, seed));
		}
		tileGrid.push(row);
	}

	// Village overrides (x,y in 0-based grid: village cols 2-4 = indices 1-3, rows 4-9 = indices 3-8)
	for (const [gx, gy, tile] of VILLAGE_OVERRIDES) {
		if (gy >= 0 && gy < h && gx >= 0 && gx < w) {
			tileGrid[gy][gx] = tile;
		}
	}

	// Place 2–3 graves (🪦) for zombie spawns — outside village, on grass/field
	const graveCandidates = [];
	for (let gy = 0; gy < h; gy++) {
		for (let gx = 0; gx < w; gx++) {
			const inVillage = gx >= 1 && gx <= 3 && gy >= 3 && gy <= 8;
			if (inVillage) continue;
			const t = tileGrid[gy][gx];
			if (["🌿", "🌾", "🌱", "🌳", "🌲"].includes(t)) graveCandidates.push([gx, gy]);
		}
	}
	const graveCount = Math.min(3, Math.floor(graveCandidates.length / 4));
	for (let i = 0; i < graveCount; i++) {
		const idx = hash(seed + 100, i, 0) % graveCandidates.length;
		const [gx, gy] = graveCandidates[idx];
		tileGrid[gy][gx] = "🪦";
	}

	// Rare abandoned house (🏚️) — pick from non-grave, non-village land
	const ruinCandidates = [];
	for (let gy = 0; gy < h; gy++) {
		for (let gx = 0; gx < w; gx++) {
			const inVillage = gx >= 1 && gx <= 3 && gy >= 3 && gy <= 8;
			if (inVillage) continue;
			const t = tileGrid[gy][gx];
			if (["🌿", "🌾", "🌱", "🌳", "🌲", "🏝️"].includes(t)) ruinCandidates.push([gx, gy]);
		}
	}
	if (ruinCandidates.length > 0 && hash(seed + 200, 0, 0) % 5 === 0) {
		const idx = hash(seed + 201, 0, 0) % ruinCandidates.length;
		const [gx, gy] = ruinCandidates[idx];
		tileGrid[gy][gx] = "🏚️";
	}

	return tileGrid;
}

/** Single-tile lookup for procedural infinite world (y > GRID_H) */
export function proceduralTileFromSeed(x, y, seed) {
	const heightOffset = hash(seed, 0, 0) % 1000;
	const moistureOffset = hash(seed, 1, 0) % 1000;
	const heightScale = 10;
	const moistureScale = 12;

	const hVal = smoothNoise(x + heightOffset, y + heightOffset * 0.7, heightScale);
	const mVal = smoothNoise(x + moistureOffset, y + moistureOffset * 0.5, moistureScale);

	let biome;
	if (hVal < 0.25) biome = BIOME_WATER;
	else if (hVal > 0.82) biome = BIOME_MOUNTAIN;
	else if (hVal > 0.72 && mVal < 0.5) biome = BIOME_MOUNTAIN;
	else if (mVal > 0.65 && hVal > 0.35) biome = BIOME_FOREST;
	else if (mVal < 0.35 && hVal < 0.65) biome = BIOME_FIELD;
	else if (mVal > 0.5) biome = BIOME_FOREST;
	else biome = BIOME_GRASS;

	return biomeToTile(biome, x, y, seed);
}

/** For DEBUG: get biome label from biome type */
export function getBiomeLabel(biome) {
	const names = {
		grass: "G",
		forest: "F",
		field: "P",
		mountain: "M",
		water: "W",
		shore: "S",
		ruin: "R",
	};
	return names[biome] || "?";
}

/** Map tile emoji to biome for DEBUG_SHOW_BIOMES */
const TILE_TO_BIOME = {
	"🌿": "grass",
	"🌳": "forest",
	"🌲": "forest",
	"🌾": "field",
	"🌱": "field",
	"🗻": "mountain",
	"⛰️": "mountain",
	"🪨": "mountain",
	"🌊": "water",
	"🏝️": "shore",
	"🏚️": "ruin",
};

export function getBiomeFromTile(tile) {
	if (!tile) return null;
	const t = String(tile).trim();
	for (const [emoji, biome] of Object.entries(TILE_TO_BIOME)) {
		if (t.startsWith(emoji)) return biome;
	}
	return null;
}

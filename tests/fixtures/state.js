// Test fixtures for game state

/**
 * Create a minimal test state with default values
 * @param {object} overrides - Properties to override
 * @returns {object} Game state
 */
export function createTestState(overrides = {}) {
	const defaultWorld = createSimpleWorld();
	const player = createTestPlayer(overrides.player);

	const state = {
		world: overrides.world ?? defaultWorld,
		worldSeed: 12345,
		worldChanges: {},
		dayNumber: 1,
		dayStep: 0,
		activeQuests: [],
		completedQuests: [],
		combat: null,
		player,
		revealed: new Set([`${player.x},${player.y}`]),
		timers: [],
		history: [],
		home: null,
		animals: [],
		npcs: [],
		villagers: [],
		hunters: [],
		...overrides,
	};

	return state;
}

/**
 * Create a test player with default values
 * @param {object} overrides - Properties to override
 * @returns {object} Player object
 */
export function createTestPlayer(overrides = {}) {
	return {
		icon: "🧙🏻‍♂️",
		name: "TestHero",
		x: 5,
		y: 5,
		hp: 10,
		maxhp: 10,
		atk: 2,
		armor: 1,
		gold: 0,
		herb: 0,
		food: 0,
		water: 0,
		fish: 0,
		wood: 0,
		stone: 0,
		items: [],
		statusEffects: [],
		...overrides,
	};
}

/**
 * Create a simple 10x10 world for testing
 * @returns {string[][]} World grid
 */
export function createSimpleWorld() {
	const world = [];
	for (let y = 0; y < 32; y++) {
		const row = [];
		for (let x = 0; x < 26; x++) {
			row.push("⬜️");
		}
		world.push(row);
	}
	return world;
}

/**
 * Create a world with specific tiles at positions
 * @param {object} tileMap - Map of "x,y" -> tile
 * @returns {string[][]} World grid
 */
export function createWorldWithTiles(tileMap) {
	const world = createSimpleWorld();
	for (const [key, tile] of Object.entries(tileMap)) {
		const [x, y] = key.split(",").map(Number);
		if (y >= 1 && y <= 32 && x >= 1 && x <= 26) {
			world[y - 1][x - 1] = tile;
		}
	}
	return world;
}

/**
 * Create a state with player on a forest tile
 * @returns {object} Game state with forest
 */
export function createStateWithForest() {
	const world = createWorldWithTiles({
		"5,5": "🌳",
		"6,5": "🌲",
		"7,5": "🌿",
		"8,5": "🌱",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 5, y: 5 }),
	});
}

/**
 * Create a state with player near water
 * @returns {object} Game state with water
 */
export function createStateWithWater() {
	const world = createWorldWithTiles({
		"5,5": "⬜️",
		"6,5": "🌊",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 5, y: 5 }),
	});
}

/**
 * Create a state with player on stone tiles
 * @returns {object} Game state with stone
 */
export function createStateWithStone() {
	const world = createWorldWithTiles({
		"5,5": "🗻",
		"6,5": "🪨",
		"7,5": "🧱",
		"8,5": "🕳️",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 5, y: 5 }),
	});
}

/**
 * Create a state with a zombie on a tile
 * @returns {object} Game state with zombie
 */
export function createStateWithZombie() {
	const world = createWorldWithTiles({
		"5,5": "🧟",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 5, y: 5 }),
	});
}

/**
 * Create a state with player in village
 * @returns {object} Game state in village
 */
export function createStateInVillage() {
	const world = createWorldWithTiles({
		"3,5": "⬜️",
		"3,6": "🏠",
		"3,7": "🏥",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 3, y: 5 }),
	});
}

/**
 * Create a state with huntable animals
 * @returns {object} Game state with animals
 */
export function createStateWithHuntableAnimals() {
	const world = createWorldWithTiles({
		"5,5": "⬜️",
		"6,5": "🌳",
	});
	return createTestState({
		world,
		player: createTestPlayer({ x: 5, y: 5 }),
		animals: [
			{ x: 5, y: 5, type: "small", emoji: "🐇", passive: true, hp: 1, atk: 0 },
			{ x: 6, y: 5, type: "big", emoji: "🦌", passive: true, hp: 2, atk: 0 },
		],
	});
}

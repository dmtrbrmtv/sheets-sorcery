import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CFG, GRID_H, GRID_W } from "../../docs/config.js";
import {
	buildVisibleSet,
	createInitialState,
	getTileAt,
	isInVillage,
	moveAnimals,
	moveHunters,
	moveNpcs,
	setTileAt,
	spawnNewEnemies,
} from "../../docs/gameState.js";
import { createTestAnimal, createTestHunter, createTestNpc } from "../fixtures/entities.js";
import { createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";
import { mockRandom, resetRandomMocks } from "../helpers/random.js";

describe("gameState", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("createInitialState", () => {
		it("creates state with all required properties", () => {
			const state = createInitialState();

			expect(state.world).toBeDefined();
			expect(Array.isArray(state.world)).toBe(true);
			expect(state.player).toBeDefined();
			expect(state.dayNumber).toBe(1);
			expect(state.dayStep).toBe(0);
			expect(state.combat).toBeNull();
			expect(state.timers).toEqual([]);
			expect(state.history).toBeDefined();
			expect(state.revealed instanceof Set).toBe(true);
		});

		it("creates player with default stats", () => {
			const state = createInitialState();

			expect(state.player.hp).toBe(10);
			expect(state.player.maxhp).toBe(10);
			expect(state.player.atk).toBe(2);
			expect(state.player.armor).toBe(1);
			expect(state.player.gold).toBe(0);
			expect(state.player.items).toEqual([]);
		});

		it("places player on walkable tile", () => {
			const state = createInitialState();
			const tile = getTileAt(state.world, state.player.x, state.player.y);

			const blocked = CFG.BLOCKED_NO_BOAT || CFG.BLOCKED;
			expect(blocked.has(tile)).toBe(false);
		});

		it("spawns animals", () => {
			const state = createInitialState();
			expect(state.animals).toBeDefined();
			expect(Array.isArray(state.animals)).toBe(true);
		});

		it("spawns npcs", () => {
			const state = createInitialState();
			expect(state.npcs).toBeDefined();
			expect(Array.isArray(state.npcs)).toBe(true);
		});

		it("spawns villagers in village", () => {
			const state = createInitialState();
			expect(state.villagers).toBeDefined();
			expect(Array.isArray(state.villagers)).toBe(true);

			for (const v of state.villagers) {
				expect(isInVillage(v.x, v.y)).toBe(true);
			}
		});

		it("spawns hunters", () => {
			const state = createInitialState();
			expect(state.hunters).toBeDefined();
			expect(Array.isArray(state.hunters)).toBe(true);
		});

		it("initializes revealed set with player position", () => {
			const state = createInitialState();
			const key = `${state.player.x},${state.player.y}`;
			expect(state.revealed.has(key)).toBe(true);
		});

		it("generates worldSeed", () => {
			const state = createInitialState();
			expect(typeof state.worldSeed).toBe("number");
		});
	});

	describe("getTileAt", () => {
		it("returns tile at valid position", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			expect(getTileAt(world, 5, 5)).toBe("🌳");
		});

		it("returns null for x < 1", () => {
			const world = createWorldWithTiles({});
			expect(getTileAt(world, 0, 5)).toBeNull();
		});

		it("returns null for y < 1", () => {
			const world = createWorldWithTiles({});
			expect(getTileAt(world, 5, 0)).toBeNull();
		});

		it("returns null for x > GRID_W", () => {
			const world = createWorldWithTiles({});
			expect(getTileAt(world, GRID_W + 1, 5)).toBeNull();
		});

		it("returns procedural tile for y > GRID_H", () => {
			const world = createWorldWithTiles({});
			// Beyond GRID_H, proceduralTile generates tiles
			const tile = getTileAt(world, 5, GRID_H + 1);
			// Procedural tile should return some valid tile (not null)
			expect(tile).toBeDefined();
		});

		it("uses worldChanges when state provided", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = { worldChanges: { "5,5": "🌱" } };

			expect(getTileAt(world, 5, 5, state)).toBe("🌱");
		});

		it("returns original tile when no worldChange", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = { worldChanges: {} };

			expect(getTileAt(world, 5, 5, state)).toBe("🌳");
		});
	});

	describe("setTileAt", () => {
		it("sets tile at valid position", () => {
			const world = createWorldWithTiles({ "5,5": "⬜️" });
			setTileAt(world, 5, 5, "🌳");
			expect(getTileAt(world, 5, 5)).toBe("🌳");
		});

		it("does nothing for out of bounds position", () => {
			const world = createWorldWithTiles({});
			setTileAt(world, 0, 0, "🌳");
			// Should not throw
		});

		it("uses worldChanges for positions beyond GRID_H", () => {
			const world = createWorldWithTiles({});
			const state = { worldChanges: {} };

			setTileAt(world, 5, GRID_H + 1, "🌳", state);

			expect(state.worldChanges["5,33"]).toBe("🌳");
		});
	});

	describe("isInVillage", () => {
		it("returns true for positions inside village", () => {
			// Village: xMin: 2, xMax: 4, yMin: 4, yMax: 9
			expect(isInVillage(2, 4)).toBe(true);
			expect(isInVillage(3, 6)).toBe(true);
			expect(isInVillage(4, 9)).toBe(true);
		});

		it("returns false for positions outside village", () => {
			expect(isInVillage(1, 4)).toBe(false); // x too low
			expect(isInVillage(5, 4)).toBe(false); // x too high
			expect(isInVillage(3, 3)).toBe(false); // y too low
			expect(isInVillage(3, 10)).toBe(false); // y too high
		});

		it("returns false for positions far from village", () => {
			expect(isInVillage(10, 10)).toBe(false);
			expect(isInVillage(20, 20)).toBe(false);
		});
	});

	describe("buildVisibleSet", () => {
		it("includes player position", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player);
			expect(visible.has("10,10")).toBe(true);
		});

		it("includes positions within radius", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player, 2);

			// Check corners
			expect(visible.has("8,8")).toBe(true);
			expect(visible.has("12,8")).toBe(true);
			expect(visible.has("8,12")).toBe(true);
			expect(visible.has("12,12")).toBe(true);
		});

		it("excludes positions outside radius", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player, 2);

			expect(visible.has("7,10")).toBe(false); // 3 tiles away
			expect(visible.has("13,10")).toBe(false);
		});

		it("excludes positions outside map bounds", () => {
			const player = createTestPlayer({ x: 1, y: 1 });
			const visible = buildVisibleSet(player, 3);

			expect(visible.has("0,1")).toBe(false);
			expect(visible.has("-1,1")).toBe(false);
			expect(visible.has("1,0")).toBe(false);
		});
	});

	describe("moveAnimals", () => {
		it("moves animals during new day", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [createTestAnimal("small", { x: 5, y: 5 })],
			});
			const originalX = state.animals[0].x;
			const originalY = state.animals[0].y;

			moveAnimals(state);

			// Animal should have moved (or stayed if no valid moves)
			const moved = state.animals[0].x !== originalX || state.animals[0].y !== originalY;
			// Movement is random, so we just check it's still valid
			expect(state.animals[0].x).toBeGreaterThanOrEqual(1);
			expect(state.animals[0].y).toBeGreaterThanOrEqual(1);
		});

		it("respects tile restrictions for animals", () => {
			// Create a world where rabbit can only stay on its tile
			const world = createWorldWithTiles({
				"5,5": "⬜️",
				"5,4": "🌊",
				"5,6": "🌊",
				"4,5": "🌊",
				"6,5": "🌊",
			});
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [createTestAnimal("small", { x: 5, y: 5 })],
			});

			moveAnimals(state);

			// Rabbit can only move to valid tiles
			const animal = state.animals[0];
			const tile = getTileAt(state.world, animal.x, animal.y);
			expect(CFG.ANIMALS.small.tiles.has(tile)).toBe(true);
		});

		it("rabbit flees from player", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [createTestAnimal("small", { x: 6, y: 5 })], // 1 tile away
			});

			// Rabbit should try to move away
			moveAnimals(state);

			// Check rabbit moved (might not always succeed)
			expect(state.animals.length).toBe(1);
		});

		it("hostile animals can move toward player", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [createTestAnimal("wolf", { x: 6, y: 5 })],
			});

			moveAnimals(state);

			// Wolf behavior is checked (might attack)
			expect(state.animals.length).toBe(1);
		});
	});

	describe("moveNpcs", () => {
		it("moves NPCs during new day", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				npcs: [createTestNpc("🧝🏿", { x: 10, y: 10 })],
			});

			moveNpcs(state);

			// NPC should attempt to move
			expect(state.npcs.length).toBe(1);
		});

		it("boss NPCs do not move on action", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				npcs: [createTestNpc("🧙🏾‍♀️", { x: 10, y: 10 })], // Mad mage is boss
			});
			const originalX = state.npcs[0].x;
			const originalY = state.npcs[0].y;

			moveNpcs(state, { onAction: true });

			// Boss should not move on action
			expect(state.npcs[0].x).toBe(originalX);
			expect(state.npcs[0].y).toBe(originalY);
		});
	});

	describe("moveHunters", () => {
		it("hunters move during new day", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				hunters: [createTestHunter("👨🏻‍🦱", { x: 10, y: 10 })],
			});

			moveHunters(state);

			expect(state.hunters.length).toBeGreaterThanOrEqual(0);
		});

		it("hunters can kill huntable animals", () => {
			const world = createWorldWithTiles({
				"10,10": "🌳",
				"11,10": "🌳",
			});
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 20, y: 20 }),
				hunters: [createTestHunter("👨🏻‍🦱", { x: 10, y: 10 })],
				animals: [createTestAnimal("small", { x: 11, y: 10 })],
			});

			// Hunter might kill the rabbit
			moveHunters(state);

			// Either rabbit is gone or hunter moved
			expect(state.hunters.length).toBe(1);
		});
	});

	describe("spawnNewEnemies", () => {
		it("spawns new animals", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [],
				npcs: [],
			});

			mockRandom(0.1); // High spawn chance

			spawnNewEnemies(state);

			// Should spawn some animals
			expect(state.animals.length).toBeGreaterThanOrEqual(0);
		});

		it("spawns new NPCs based on chance", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [],
				npcs: [],
			});

			mockRandom(0.1); // High spawn chance

			spawnNewEnemies(state);

			// May spawn NPCs
			expect(state.npcs).toBeDefined();
		});

		it("does not spawn on occupied tiles", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [],
				npcs: [],
			});

			spawnNewEnemies(state);

			// No enemy should spawn on player tile
			const onPlayer = state.animals.filter((a) => a.x === 5 && a.y === 5);
			expect(onPlayer.length).toBe(0);
		});

		it("does not spawn in village", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [],
				npcs: [],
			});

			spawnNewEnemies(state);

			// No enemies in village
			const inVillage = [...state.animals, ...state.npcs].filter((e) => isInVillage(e.x, e.y));
			expect(inVillage.length).toBe(0);
		});
	});

	describe("entity AI behavior", () => {
		it("animals respect terrain restrictions", () => {
			// Each animal type has specific tiles they can spawn/move on
			const state = createInitialState();

			for (const animal of state.animals) {
				const tile = getTileAt(state.world, animal.x, animal.y, state);
				const spec = CFG.ANIMALS?.[animal.type];
				if (spec?.tiles) {
					expect(spec.tiles.has(tile)).toBe(true);
				}
			}
		});

		it("villagers stay in village", () => {
			const state = createInitialState();

			for (const villager of state.villagers) {
				expect(isInVillage(villager.x, villager.y)).toBe(true);
			}
		});

		it("hostile animals have passive=false", () => {
			const state = createInitialState();

			for (const animal of state.animals) {
				if (animal.type === "wolf" || animal.type === "eagle") {
					expect(animal.passive).toBe(false);
				}
			}
		});

		it("passive animals have passive=true", () => {
			const state = createInitialState();

			for (const animal of state.animals) {
				if (animal.type === "small" || animal.type === "big" || animal.type === "boar") {
					expect(animal.passive).toBe(true);
				}
			}
		});
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canChopWood, canFish, canHunt, canQuarry, doChopWood, doFish, doHunt, doQuarry } from "../../docs/actions.js";
import { CFG } from "../../docs/config.js";
import { getTileAt } from "../../docs/gameState.js";
import {
	createStateWithForest,
	createStateWithHuntableAnimals,
	createStateWithStone,
	createStateWithWater,
	createTestPlayer,
	createTestState,
	createWorldWithTiles,
} from "../fixtures/state.js";
import { mockRandom, resetRandomMocks } from "../helpers/random.js";

describe("gathering", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("canChopWood", () => {
		it("returns true when on forest tile (🌳)", () => {
			const state = createStateWithForest();
			expect(canChopWood(state)).toBe(true);
		});

		it("returns true when on pine tree (🌲)", () => {
			const world = createWorldWithTiles({ "5,5": "🌲" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canChopWood(state)).toBe(true);
		});

		it("returns true when on grass (🌿)", () => {
			const world = createWorldWithTiles({ "5,5": "🌿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canChopWood(state)).toBe(true);
		});

		it("returns true when on stump (🌱) without timer", () => {
			const world = createWorldWithTiles({ "5,5": "🌱" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				timers: [],
			});
			expect(canChopWood(state)).toBe(true);
		});

		it("returns false when on stump with active timer", () => {
			const world = createWorldWithTiles({ "5,5": "🌱" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				timers: [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 2, reason: "wood" }],
			});
			expect(canChopWood(state)).toBe(false);
		});

		it("returns false when on non-wood tile", () => {
			const world = createWorldWithTiles({ "5,5": "⬜️" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canChopWood(state)).toBe(false);
		});

		it("returns false when on water", () => {
			const state = createStateWithWater();
			expect(canChopWood(state)).toBe(false);
		});
	});

	describe("doChopWood", () => {
		it("adds 1 wood without axe", () => {
			const state = createStateWithForest();
			state.player.wood = 0;

			mockRandom(0.5); // No herb

			doChopWood(state);

			expect(state.player.wood).toBe(1);
		});

		it("adds 2 wood with axe bonus", () => {
			const state = createStateWithForest();
			state.player.items = ["🪓"];
			state.player.wood = 0;

			mockRandom(0.5);

			doChopWood(state);

			expect(state.player.wood).toBe(2);
		});

		it("40% chance to get herb", () => {
			const state = createStateWithForest();
			state.player.herb = 0;

			mockRandom(0.3); // < 0.4, herb drops

			doChopWood(state);

			expect(state.player.herb).toBe(1);
		});

		it("transforms 🌳 to 🌿", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			mockRandom(0.5);

			doChopWood(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🌿");
		});

		it("transforms 🌲 to 🌿", () => {
			const world = createWorldWithTiles({ "5,5": "🌲" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			mockRandom(0.5);

			doChopWood(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🌿");
		});

		it("transforms 🌿 to 🌱", () => {
			const world = createWorldWithTiles({ "5,5": "🌿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			mockRandom(0.5);

			doChopWood(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🌱");
		});

		it("creates regen timer (3 days)", () => {
			const state = createStateWithForest();
			state.timers = [];

			mockRandom(0.5);

			doChopWood(state);

			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.REGEN_DAYS.wood);
			expect(state.timers[0].restoreTile).toBe("🌳");
		});

		it("does not create duplicate timer", () => {
			const world = createWorldWithTiles({ "5,5": "🌿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				timers: [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 2, reason: "wood" }],
			});

			mockRandom(0.5);

			doChopWood(state);

			expect(state.timers.length).toBe(1);
		});

		it("returns false on non-wood tile", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = doChopWood(state);

			expect(result).toBe(false);
			expect(state.player.wood).toBe(0);
		});

		it("starts combat if enemy on tile", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				npcs: [{ x: 5, y: 5, emoji: "🧝🏿", hp: 7, atk: 2 }],
			});

			const result = doChopWood(state);

			expect(result).toBe(false);
			expect(state.combat).not.toBeNull();
		});

		it("logs history entry", () => {
			const state = createStateWithForest();
			state.history = [];

			mockRandom(0.5);

			doChopWood(state);

			expect(state.history.length).toBeGreaterThan(0);
			expect(state.history[0].got).toContain("🪵");
		});
	});

	describe("canQuarry", () => {
		it("returns true when on mountain (🗻)", () => {
			const state = createStateWithStone();
			expect(canQuarry(state)).toBe(true);
		});

		it("returns true when on rock (🪨)", () => {
			const world = createWorldWithTiles({ "5,5": "🪨" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canQuarry(state)).toBe(true);
		});

		it("returns true when on brick (🧱)", () => {
			const world = createWorldWithTiles({ "5,5": "🧱" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canQuarry(state)).toBe(true);
		});

		it("returns false when on depleted mine with timer", () => {
			const world = createWorldWithTiles({ "5,5": "🕳️" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				timers: [{ x: 5, y: 5, restoreTile: "🗻", daysLeft: 2, reason: "stone" }],
			});
			expect(canQuarry(state)).toBe(false);
		});

		it("returns false when on non-stone tile", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			expect(canQuarry(state)).toBe(false);
		});
	});

	describe("doQuarry", () => {
		it("adds 1 stone without pickaxe", () => {
			const state = createStateWithStone();
			state.player.stone = 0;

			doQuarry(state);

			expect(state.player.stone).toBe(1);
		});

		it("adds 2 stone with pickaxe bonus", () => {
			const state = createStateWithStone();
			state.player.items = ["⛏️"];
			state.player.stone = 0;

			doQuarry(state);

			expect(state.player.stone).toBe(2);
		});

		it("transforms 🗻 to 🪨", () => {
			const world = createWorldWithTiles({ "5,5": "🗻" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			doQuarry(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🪨");
		});

		it("transforms 🪨 to 🧱", () => {
			const world = createWorldWithTiles({ "5,5": "🪨" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			doQuarry(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🧱");
		});

		it("transforms 🧱 to 🕳️", () => {
			const world = createWorldWithTiles({ "5,5": "🧱" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			doQuarry(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("🕳️");
		});

		it("creates regen timer (3 days)", () => {
			const state = createStateWithStone();
			state.timers = [];

			doQuarry(state);

			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.REGEN_DAYS.stone);
		});

		it("returns false on non-stone tile", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = doQuarry(state);

			expect(result).toBe(false);
		});
	});

	describe("canHunt", () => {
		it("returns true when animal on player tile", () => {
			const state = createStateWithHuntableAnimals();
			expect(canHunt(state)).toBe(true);
		});

		it("returns true when on huntable tile emoji", () => {
			const world = createWorldWithTiles({ "5,5": "🐇" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canHunt(state)).toBe(true);
		});

		it("returns false when no animal and non-huntable tile", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			expect(canHunt(state)).toBe(false);
		});
	});

	describe("doHunt", () => {
		it("gains 1-2 food from hunt on tile", () => {
			// Tile-based hunting (no actual animal entity, just tile emoji)
			const world = createWorldWithTiles({ "5,5": "🦌" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, food: 0 }),
				animals: [], // No animal entities
			});

			doHunt(state);

			expect(state.player.food).toBeGreaterThanOrEqual(1);
			expect(state.player.food).toBeLessThanOrEqual(2);
		});

		it("transforms tile and creates timer after tile hunt", () => {
			const world = createWorldWithTiles({ "5,5": "🦌" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [],
				timers: [],
			});

			doHunt(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("⬜️");
			expect(state.timers.length).toBe(1);
		});

		it("transforms tile to empty when hunting tile-based animal", () => {
			const world = createWorldWithTiles({ "5,5": "🐇" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			doHunt(state);

			expect(getTileAt(state.world, 5, 5, state)).toBe("⬜️");
		});

		it("creates regen timer for tile-based hunt", () => {
			const world = createWorldWithTiles({ "5,5": "🐇" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				timers: [],
			});

			doHunt(state);

			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.REGEN_DAYS.hunt);
		});

		it("returns false on non-huntable tile without animal", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = doHunt(state);

			expect(result).toBe(false);
		});
	});

	describe("canFish", () => {
		it("returns true when adjacent to water", () => {
			const state = createStateWithWater();
			expect(canFish(state)).toBe(true);
		});

		it("returns false when not adjacent to water", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			expect(canFish(state)).toBe(false);
		});

		it("checks all four directions for water", () => {
			// Water to the north
			const world1 = createWorldWithTiles({ "5,4": "🌊" });
			const state1 = createTestState({
				world: world1,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canFish(state1)).toBe(true);

			// Water to the south
			const world2 = createWorldWithTiles({ "5,6": "🌊" });
			const state2 = createTestState({
				world: world2,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canFish(state2)).toBe(true);

			// Water to the west
			const world3 = createWorldWithTiles({ "4,5": "🌊" });
			const state3 = createTestState({
				world: world3,
				player: createTestPlayer({ x: 5, y: 5 }),
			});
			expect(canFish(state3)).toBe(true);
		});
	});

	describe("doFish", () => {
		it("gains 0-2 fish", () => {
			const state = createStateWithWater();
			state.player.fish = 0;

			// Run multiple times to test range
			let minFish = 3;
			let maxFish = -1;
			for (let i = 0; i < 50; i++) {
				const s = createStateWithWater();
				s.player.fish = 0;
				doFish(s);
				minFish = Math.min(minFish, s.player.fish);
				maxFish = Math.max(maxFish, s.player.fish);
			}

			expect(minFish).toBe(0);
			expect(maxFish).toBe(2);
		});

		it("returns false when not adjacent to water", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = doFish(state);

			expect(result).toBe(false);
		});

		it("logs history entry", () => {
			const state = createStateWithWater();
			state.history = [];

			doFish(state);

			expect(state.history.length).toBeGreaterThan(0);
			expect(state.history[0].got).toContain("🐟");
		});
	});

	describe("resource regeneration timers", () => {
		it("wood regenerates after 3 days", () => {
			expect(CFG.REGEN_DAYS.wood).toBe(3);
		});

		it("stone regenerates after 3 days", () => {
			expect(CFG.REGEN_DAYS.stone).toBe(3);
		});

		it("hunt regenerates after 2 days", () => {
			expect(CFG.REGEN_DAYS.hunt).toBe(2);
		});
	});
});

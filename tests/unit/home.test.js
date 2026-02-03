import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CFG } from "../../docs/config.js";
import {
	addPig,
	collect,
	createHomeState,
	getCropAt,
	getHomeLayout,
	getHomeTileAt,
	getPigAt,
	isCropReady,
	isPigReady,
	moveInHome,
	placePlot,
	plantFruit,
	plantVeg,
	processHomeDay,
	setHomeTileAt,
} from "../../docs/home.js";
import { createTestState } from "../fixtures/state.js";
import { resetRandomMocks } from "../helpers/random.js";

describe("home", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("getHomeLayout", () => {
		it("returns 10x10 grid", () => {
			const layout = getHomeLayout();
			expect(layout.length).toBe(10);
			for (const row of layout) {
				expect(row.length).toBe(10);
			}
		});

		it("has house at bottom center", () => {
			const layout = getHomeLayout();
			expect(layout[9][4]).toBe("🏡"); // Position (5, 10) in 1-based
		});

		it("returns a copy (not reference)", () => {
			const layout1 = getHomeLayout();
			const layout2 = getHomeLayout();
			layout1[0][0] = "TEST";
			expect(layout2[0][0]).not.toBe("TEST");
		});
	});

	describe("createHomeState", () => {
		it("creates home with correct dimensions", () => {
			const home = createHomeState();
			expect(home.width).toBe(10);
			expect(home.height).toBe(10);
		});

		it("initializes empty crops and pigs arrays", () => {
			const home = createHomeState();
			expect(home.crops).toEqual([]);
			expect(home.pigs).toEqual([]);
		});

		it("sets player position at house", () => {
			const home = createHomeState();
			expect(home.playerX).toBe(5);
			expect(home.playerY).toBe(9);
		});

		it("initializes lastDayProcessed to 0", () => {
			const home = createHomeState();
			expect(home.lastDayProcessed).toBe(0);
		});
	});

	describe("getHomeTileAt", () => {
		it("returns tile at valid position", () => {
			const home = createHomeState();
			const tile = getHomeTileAt(home, 5, 10);
			expect(tile).toBe("🏡");
		});

		it("returns null for out of bounds", () => {
			const home = createHomeState();
			expect(getHomeTileAt(home, 0, 5)).toBeNull();
			expect(getHomeTileAt(home, 11, 5)).toBeNull();
			expect(getHomeTileAt(home, 5, 0)).toBeNull();
			expect(getHomeTileAt(home, 5, 11)).toBeNull();
		});
	});

	describe("setHomeTileAt", () => {
		it("sets tile at valid position", () => {
			const home = createHomeState();
			setHomeTileAt(home, 5, 5, "🟫");
			expect(getHomeTileAt(home, 5, 5)).toBe("🟫");
		});

		it("does nothing for out of bounds", () => {
			const home = createHomeState();
			setHomeTileAt(home, 0, 0, "🟫");
			// Should not throw
		});
	});

	describe("moveInHome", () => {
		it("moves player north", () => {
			const state = createTestState();
			state.home = createHomeState();
			state.home.playerX = 5;
			state.home.playerY = 5;

			const result = moveInHome(state, "N");

			expect(result).toBe(true);
			expect(state.home.playerY).toBe(4);
		});

		it("moves player south", () => {
			const state = createTestState();
			state.home = createHomeState();
			state.home.playerX = 5;
			state.home.playerY = 5;

			const result = moveInHome(state, "S");

			expect(result).toBe(true);
			expect(state.home.playerY).toBe(6);
		});

		it("moves player east", () => {
			const state = createTestState();
			state.home = createHomeState();
			state.home.playerX = 5;
			state.home.playerY = 5;

			const result = moveInHome(state, "E");

			expect(result).toBe(true);
			expect(state.home.playerX).toBe(6);
		});

		it("moves player west", () => {
			const state = createTestState();
			state.home = createHomeState();
			state.home.playerX = 5;
			state.home.playerY = 5;

			const result = moveInHome(state, "W");

			expect(result).toBe(true);
			expect(state.home.playerX).toBe(4);
		});

		it("blocks movement outside bounds", () => {
			const state = createTestState();
			state.home = createHomeState();
			state.home.playerX = 1;
			state.home.playerY = 1;

			expect(moveInHome(state, "N")).toBe(false);
			expect(moveInHome(state, "W")).toBe(false);
		});

		it("returns false when no home", () => {
			const state = createTestState();
			state.home = null;

			expect(moveInHome(state, "N")).toBe(false);
		});
	});

	describe("placePlot", () => {
		it("places plot on empty tile", () => {
			const state = createTestState();
			state.home = createHomeState();

			// Find an empty tile
			let emptyX = 0;
			let emptyY = 0;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}

			const result = placePlot(state, emptyX, emptyY);

			expect(result).toBe(true);
			expect(getHomeTileAt(state.home, emptyX, emptyY)).toBe("🟫");
		});

		it("fails on non-empty tile", () => {
			const state = createTestState();
			state.home = createHomeState();

			// Try to place on house tile
			const result = placePlot(state, 5, 10);

			expect(result).toBe(false);
		});

		it("fails if crop already exists", () => {
			const state = createTestState();
			state.home = createHomeState();

			// Find empty and place plot + crop
			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}

			placePlot(state, emptyX, emptyY);
			state.home.crops.push({ x: emptyX, y: emptyY, type: "veg", plantedAt: 1 });

			// Try to place another plot
			const result = placePlot(state, emptyX, emptyY);
			expect(result).toBe(false);
		});

		it("creates home if not exists", () => {
			const state = createTestState();
			state.home = null;

			// Find what would be an empty tile in default layout
			placePlot(state, 4, 4); // Should create home first

			expect(state.home).not.toBeNull();
		});
	});

	describe("plantVeg", () => {
		it("plants vegetable on plot", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();

			// Place a plot first
			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}
			placePlot(state, emptyX, emptyY);

			const result = plantVeg(state, emptyX, emptyY);

			expect(result).toBe(true);
			expect(state.home.crops.length).toBe(1);
			expect(state.home.crops[0].type).toBe("veg");
		});

		it("fails on non-plot tile", () => {
			const state = createTestState();
			state.home = createHomeState();

			const result = plantVeg(state, 5, 5);

			expect(result).toBe(false);
		});

		it("fails if crop already planted", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();

			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}
			placePlot(state, emptyX, emptyY);
			plantVeg(state, emptyX, emptyY);

			const result = plantVeg(state, emptyX, emptyY);
			expect(result).toBe(false);
		});
	});

	describe("plantFruit", () => {
		it("plants fruit on plot", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();

			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}
			placePlot(state, emptyX, emptyY);

			const result = plantFruit(state, emptyX, emptyY);

			expect(result).toBe(true);
			expect(state.home.crops[0].type).toBe("fruit");
		});
	});

	describe("addPig", () => {
		it("adds pig on empty tile", () => {
			const state = createTestState({ dayNumber: 1 });
			state.player.wood = 10;
			state.home = createHomeState();

			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}

			const result = addPig(state, emptyX, emptyY);

			expect(result).toBe(true);
			expect(state.home.pigs.length).toBe(1);
			expect(getHomeTileAt(state.home, emptyX, emptyY)).toBe("🐷");
		});

		it("deducts wood cost", () => {
			const state = createTestState({ dayNumber: 1 });
			state.player.wood = 5;
			state.home = createHomeState();

			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}

			addPig(state, emptyX, emptyY);

			expect(state.player.wood).toBe(4); // 5 - 1
		});

		it("fails without enough wood", () => {
			const state = createTestState({ dayNumber: 1 });
			state.player.wood = 0;
			state.home = createHomeState();

			let emptyX = 4;
			let emptyY = 4;
			for (let y = 1; y <= 10; y++) {
				for (let x = 1; x <= 10; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						emptyX = x;
						emptyY = y;
						break;
					}
				}
				if (emptyX) break;
			}

			const result = addPig(state, emptyX, emptyY);

			expect(result).toBe(false);
		});

		it("respects max pig limit", () => {
			const state = createTestState({ dayNumber: 1 });
			state.player.wood = 100;
			state.home = createHomeState();

			// Add max pigs
			const maxPigs = CFG.HOME?.PIG_MAX ?? 5;
			let count = 0;
			for (let y = 1; y <= 10 && count < maxPigs + 1; y++) {
				for (let x = 1; x <= 10 && count < maxPigs + 1; x++) {
					if (getHomeTileAt(state.home, x, y) === "⬜️") {
						const result = addPig(state, x, y);
						if (result) count++;
					}
				}
			}

			expect(state.home.pigs.length).toBeLessThanOrEqual(maxPigs);
		});
	});

	describe("getCropAt", () => {
		it("returns crop at position", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();
			state.home.crops = [{ x: 5, y: 5, type: "veg", plantedAt: 1 }];

			const crop = getCropAt(state.home, 5, 5);

			expect(crop).not.toBeNull();
			expect(crop.type).toBe("veg");
		});

		it("returns undefined when no crop", () => {
			const state = createTestState();
			state.home = createHomeState();

			const crop = getCropAt(state.home, 5, 5);

			expect(crop).toBeUndefined();
		});
	});

	describe("getPigAt", () => {
		it("returns pig at position", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();
			state.home.pigs = [{ x: 5, y: 5, createdAt: 1, lastCollectedAt: 1 }];

			const pig = getPigAt(state.home, 5, 5);

			expect(pig).not.toBeNull();
		});

		it("returns undefined when no pig", () => {
			const state = createTestState();
			state.home = createHomeState();

			const pig = getPigAt(state.home, 5, 5);

			expect(pig).toBeUndefined();
		});
	});

	describe("isCropReady", () => {
		it("veg is ready after 2 days", () => {
			const crop = { x: 5, y: 5, type: "veg", plantedAt: 1 };

			expect(isCropReady(crop, 1, "veg")).toBe(false);
			expect(isCropReady(crop, 2, "veg")).toBe(false);
			expect(isCropReady(crop, 3, "veg")).toBe(true);
		});

		it("fruit is ready after 3 days", () => {
			const crop = { x: 5, y: 5, type: "fruit", plantedAt: 1 };

			expect(isCropReady(crop, 1, "fruit")).toBe(false);
			expect(isCropReady(crop, 3, "fruit")).toBe(false);
			expect(isCropReady(crop, 4, "fruit")).toBe(true);
		});
	});

	describe("isPigReady", () => {
		it("pig is ready after 2 days from last collection", () => {
			const pig = { x: 5, y: 5, createdAt: 1, lastCollectedAt: 1 };

			expect(isPigReady(pig, 1)).toBe(false);
			expect(isPigReady(pig, 2)).toBe(false);
			expect(isPigReady(pig, 3)).toBe(true);
		});
	});

	describe("collect", () => {
		it("collects ready veg crop", () => {
			const state = createTestState({ dayNumber: 5 });
			state.player.food = 0;
			state.home = createHomeState();
			state.home.crops = [{ x: 5, y: 5, type: "veg", plantedAt: 1 }];

			const result = collect(state, 5, 5);

			expect(result).toBe(true);
			expect(state.player.food).toBeGreaterThanOrEqual(1);
			expect(state.home.crops.length).toBe(0);
		});

		it("collects ready fruit crop", () => {
			const state = createTestState({ dayNumber: 5 });
			state.player.food = 0;
			state.home = createHomeState();
			state.home.crops = [{ x: 5, y: 5, type: "fruit", plantedAt: 1 }];

			const result = collect(state, 5, 5);

			expect(result).toBe(true);
			expect(state.player.food).toBeGreaterThanOrEqual(1);
		});

		it("veg yields 1-2 food", () => {
			// VEG_YIELD: [1, 2]
			expect(CFG.HOME?.VEG_YIELD).toEqual([1, 2]);
		});

		it("fruit yields 1 food", () => {
			expect(CFG.HOME?.FRUIT_YIELD).toBe(1);
		});

		it("collects from ready pig", () => {
			const state = createTestState({ dayNumber: 5 });
			state.player.food = 0;
			state.home = createHomeState();
			state.home.pigs = [{ x: 5, y: 5, createdAt: 1, lastCollectedAt: 1 }];

			const result = collect(state, 5, 5);

			expect(result).toBe(true);
			expect(state.player.food).toBe(1);
			expect(state.home.pigs[0].lastCollectedAt).toBe(5);
		});

		it("fails to collect unready crop", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();
			state.home.crops = [{ x: 5, y: 5, type: "veg", plantedAt: 1 }];

			const result = collect(state, 5, 5);

			expect(result).toBe(false);
		});

		it("fails to collect unready pig", () => {
			const state = createTestState({ dayNumber: 1 });
			state.home = createHomeState();
			state.home.pigs = [{ x: 5, y: 5, createdAt: 1, lastCollectedAt: 1 }];

			const result = collect(state, 5, 5);

			expect(result).toBe(false);
		});

		it("returns false when no home", () => {
			const state = createTestState();
			state.home = null;

			const result = collect(state, 5, 5);

			expect(result).toBe(false);
		});
	});

	describe("processHomeDay", () => {
		it("updates lastDayProcessed", () => {
			const state = createTestState({ dayNumber: 5 });
			state.home = createHomeState();
			state.home.lastDayProcessed = 4;

			processHomeDay(state);

			expect(state.home.lastDayProcessed).toBe(5);
		});

		it("does nothing if already processed", () => {
			const state = createTestState({ dayNumber: 5 });
			state.home = createHomeState();
			state.home.lastDayProcessed = 5;

			processHomeDay(state);

			expect(state.home.lastDayProcessed).toBe(5);
		});

		it("does nothing without home", () => {
			const state = createTestState({ dayNumber: 5 });
			state.home = null;

			processHomeDay(state); // Should not throw
		});
	});

	describe("config values", () => {
		it("home dimensions are 10x10", () => {
			expect(CFG.HOME?.W).toBe(10);
			expect(CFG.HOME?.H).toBe(10);
		});

		it("veg takes 2 days", () => {
			expect(CFG.HOME?.VEG_DAYS).toBe(2);
		});

		it("fruit takes 3 days", () => {
			expect(CFG.HOME?.FRUIT_DAYS).toBe(3);
		});

		it("pig food interval is 2 days", () => {
			expect(CFG.HOME?.PIG_FOOD_INTERVAL).toBe(2);
		});

		it("pig cost is 1 wood", () => {
			expect(CFG.HOME?.PIG_COST).toEqual({ wood: 1 });
		});

		it("max pigs is 5", () => {
			expect(CFG.HOME?.PIG_MAX).toBe(5);
		});
	});
});

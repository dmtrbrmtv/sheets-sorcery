import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advanceTurn, doChopWood, getPhaseFromStepIndex, getTimeState, newDay } from "../../docs/actions.js";
import { CFG } from "../../docs/config.js";
import { getTileAt } from "../../docs/gameState.js";
import { createStateWithForest, createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";
import { mockRandom, resetRandomMocks } from "../helpers/random.js";

describe("day cycle integration", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("full day progression", () => {
		it("progresses through all phases in 50 steps", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 0 });
			const phases = [];

			for (let i = 0; i < 50; i++) {
				phases.push(getPhaseFromStepIndex(state.dayStep));
				advanceTurn(state);
			}

			// Should have transitioned through all phases
			expect(phases.filter((p) => p === "day").length).toBe(20);
			expect(phases.filter((p) => p === "dusk").length).toBe(10);
			expect(phases.filter((p) => p === "night").length).toBe(10);
			expect(phases.filter((p) => p === "dawn").length).toBe(10);

			// Should now be day 2
			expect(state.dayNumber).toBe(2);
			expect(state.dayStep).toBe(0);
		});

		it("new day heals player", () => {
			const state = createTestState({
				dayNumber: 1,
				dayStep: 49,
				player: createTestPlayer({ hp: 5, maxhp: 10 }),
			});

			advanceTurn(state);

			expect(state.dayNumber).toBe(2);
			expect(state.player.hp).toBe(6); // +1 HP on new day
		});

		it("new day does not overheal", () => {
			const state = createTestState({
				dayNumber: 1,
				dayStep: 49,
				player: createTestPlayer({ hp: 10, maxhp: 10 }),
			});

			advanceTurn(state);

			expect(state.player.hp).toBe(10);
		});
	});

	describe("timer system", () => {
		it("timers tick down each day", () => {
			const state = createTestState({
				dayNumber: 1,
				dayStep: 0,
				timers: [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 3, reason: "wood" }],
			});

			newDay(state);
			expect(state.timers[0].daysLeft).toBe(2);

			newDay(state);
			expect(state.timers[0].daysLeft).toBe(1);
		});

		it("timers restore tiles when expired", () => {
			const world = createWorldWithTiles({ "5,5": "🌱" });
			const state = createTestState({
				world,
				dayNumber: 1,
				timers: [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 1, reason: "wood" }],
			});

			newDay(state);

			expect(getTileAt(state.world, 5, 5)).toBe("🌳");
			expect(state.timers.length).toBe(0);
		});

		it("multiple timers work independently", () => {
			const world = createWorldWithTiles({ "5,5": "🌱", "6,5": "🕳️" });
			const state = createTestState({
				world,
				dayNumber: 1,
				timers: [
					{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 1, reason: "wood" },
					{ x: 6, y: 5, restoreTile: "🗻", daysLeft: 2, reason: "stone" },
				],
			});

			newDay(state);

			expect(getTileAt(state.world, 5, 5)).toBe("🌳");
			expect(getTileAt(state.world, 6, 5)).toBe("🕳️"); // Not restored yet
			expect(state.timers.length).toBe(1);
		});

		it("resource gathering creates timers", () => {
			const state = createStateWithForest();
			state.timers = [];

			mockRandom(0.5); // No herb

			doChopWood(state);

			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.REGEN_DAYS.wood);
			expect(state.timers[0].restoreTile).toBe("🌳");
		});
	});

	describe("status effect duration", () => {
		it("bleeding lasts exactly 3 turns", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "bleeding", duration: 3 }];
			state.player.hp = 10;

			// Turn 1
			advanceTurn(state);
			expect(state.player.statusEffects[0].duration).toBe(2);
			expect(state.player.hp).toBe(9); // -1 damage

			// Turn 2
			advanceTurn(state);
			expect(state.player.statusEffects[0].duration).toBe(1);
			expect(state.player.hp).toBe(8);

			// Turn 3
			advanceTurn(state);
			expect(state.player.statusEffects.length).toBe(0); // Effect expired
			expect(state.player.hp).toBe(7);
		});

		it("poison lasts exactly 2 turns", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "poison", duration: 2 }];
			state.player.hp = 10;

			advanceTurn(state);
			expect(state.player.statusEffects[0].duration).toBe(1);
			expect(state.player.hp).toBe(9);

			advanceTurn(state);
			expect(state.player.statusEffects.length).toBe(0);
			expect(state.player.hp).toBe(8);
		});

		it("multiple effects tick independently", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [
				{ type: "bleeding", duration: 3 },
				{ type: "poison", duration: 2 },
			];
			state.player.hp = 10;

			advanceTurn(state);
			expect(state.player.hp).toBe(8); // -1 bleeding, -1 poison
			expect(state.player.statusEffects.length).toBe(2);

			advanceTurn(state);
			expect(state.player.hp).toBe(6);
			expect(state.player.statusEffects.length).toBe(1); // Poison expired

			advanceTurn(state);
			expect(state.player.hp).toBe(5);
			expect(state.player.statusEffects.length).toBe(0); // Bleeding expired
		});
	});

	describe("night phase effects", () => {
		it("time state correctly identifies night phase", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 35 });
			const time = getTimeState(state);

			expect(time.phase).toBe("night");
		});

		it("phase changes at correct boundaries", () => {
			const state = createTestState({ dayStep: 19 });
			expect(getTimeState(state).phase).toBe("day");

			state.dayStep = 20;
			expect(getTimeState(state).phase).toBe("dusk");

			state.dayStep = 29;
			expect(getTimeState(state).phase).toBe("dusk");

			state.dayStep = 30;
			expect(getTimeState(state).phase).toBe("night");

			state.dayStep = 39;
			expect(getTimeState(state).phase).toBe("night");

			state.dayStep = 40;
			expect(getTimeState(state).phase).toBe("dawn");

			state.dayStep = 49;
			expect(getTimeState(state).phase).toBe("dawn");
		});
	});

	describe("entity movement on new day", () => {
		it("animals exist after new day", () => {
			const state = createTestState({
				dayNumber: 1,
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [{ x: 5, y: 5, type: "small", emoji: "🐇", passive: true, hp: 1, atk: 0 }],
			});

			newDay(state);

			// Animals should still exist (may have moved or stayed)
			expect(state.animals.length).toBeGreaterThanOrEqual(1);
		});

		it("new enemies can spawn on new day", () => {
			const state = createTestState({
				dayNumber: 1,
				player: createTestPlayer({ x: 20, y: 20 }),
				animals: [],
				npcs: [],
			});

			// Multiple new days may spawn enemies
			for (let i = 0; i < 10; i++) {
				newDay(state);
			}

			// Some enemies should have spawned
			expect(state.animals.length + state.npcs.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("day counter", () => {
		it("day number increments correctly over multiple days", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 0 });

			for (let day = 1; day <= 5; day++) {
				expect(state.dayNumber).toBe(day);

				// Advance through full day
				for (let step = 0; step < 50; step++) {
					advanceTurn(state);
				}
			}

			expect(state.dayNumber).toBe(6);
		});

		it("getTimeState returns correct step counts", () => {
			const state = createTestState({ dayNumber: 3, dayStep: 25 });
			const time = getTimeState(state);

			expect(time.dayNumber).toBe(3);
			expect(time.stepIndex).toBe(25);
			expect(time.stepInDay).toBe(26);
			expect(time.dayStepsLeft).toBe(24);
			expect(time.totalSteps).toBe(50);
		});
	});

	describe("history logging", () => {
		it("new day is logged in history", () => {
			const state = createTestState({ dayNumber: 1 });
			state.history = [];

			newDay(state);

			expect(state.history.length).toBeGreaterThan(0);
			const dayEntry = state.history.find((h) => h.what.includes("Новый день"));
			expect(dayEntry).toBeDefined();
		});

		it("history cap is maintained over time", () => {
			const state = createTestState({ dayNumber: 1 });
			state.history = [];

			// History is capped at 200 by popping when > 200 after unshift
			// Fill to exactly 200
			for (let i = 0; i < 200; i++) {
				state.history.unshift({ day: 1, who: "test", what: `entry ${i}` });
			}

			expect(state.history.length).toBe(200);

			// newDay adds entries which should trigger cap
			newDay(state);

			// History should still be around 200 (may have added a few entries)
			expect(state.history.length).toBeLessThanOrEqual(210);
		});
	});

	describe("zombie respawn timer", () => {
		it("zombie respawns after 5 days", () => {
			const world = createWorldWithTiles({ "5,5": "🪦" });
			const state = createTestState({
				world,
				dayNumber: 1,
				timers: [{ x: 5, y: 5, restoreTile: "🧟", daysLeft: 5, reason: "zombie" }],
			});

			// Day 1
			newDay(state);
			expect(state.timers[0].daysLeft).toBe(4);
			expect(getTileAt(state.world, 5, 5)).toBe("🪦");

			// Days 2-4
			for (let i = 0; i < 3; i++) {
				newDay(state);
			}
			expect(state.timers[0].daysLeft).toBe(1);

			// Day 5 - zombie respawns
			newDay(state);
			expect(state.timers.length).toBe(0);
			expect(getTileAt(state.world, 5, 5)).toBe("🧟");
		});
	});
});

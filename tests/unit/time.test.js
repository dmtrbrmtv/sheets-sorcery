import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advanceTurn, getPhaseFromStepIndex, getTimeState, newDay } from "../../docs/actions.js";
import { createTestState } from "../fixtures/state.js";

describe("time", () => {
	describe("getPhaseFromStepIndex", () => {
		it("returns day for steps 0-19", () => {
			for (let i = 0; i < 20; i++) {
				expect(getPhaseFromStepIndex(i)).toBe("day");
			}
		});

		it("returns dusk for steps 20-29", () => {
			for (let i = 20; i < 30; i++) {
				expect(getPhaseFromStepIndex(i)).toBe("dusk");
			}
		});

		it("returns night for steps 30-39", () => {
			for (let i = 30; i < 40; i++) {
				expect(getPhaseFromStepIndex(i)).toBe("night");
			}
		});

		it("returns dawn for steps 40-49", () => {
			for (let i = 40; i < 50; i++) {
				expect(getPhaseFromStepIndex(i)).toBe("dawn");
			}
		});

		it("clamps negative values to day", () => {
			expect(getPhaseFromStepIndex(-1)).toBe("day");
			expect(getPhaseFromStepIndex(-100)).toBe("day");
		});

		it("clamps values over 49 to dawn", () => {
			expect(getPhaseFromStepIndex(50)).toBe("dawn");
			expect(getPhaseFromStepIndex(100)).toBe("dawn");
		});

		it("handles null/undefined as 0 (day)", () => {
			expect(getPhaseFromStepIndex(null)).toBe("day");
			expect(getPhaseFromStepIndex(undefined)).toBe("day");
		});
	});

	describe("getTimeState", () => {
		it("returns correct values for start of day 1", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 0 });
			const timeState = getTimeState(state);

			expect(timeState.dayNumber).toBe(1);
			expect(timeState.stepIndex).toBe(0);
			expect(timeState.stepInDay).toBe(1);
			expect(timeState.phase).toBe("day");
			expect(timeState.dayStepsLeft).toBe(49);
			expect(timeState.totalSteps).toBe(50);
		});

		it("returns correct values for mid-day", () => {
			const state = createTestState({ dayNumber: 5, dayStep: 15 });
			const timeState = getTimeState(state);

			expect(timeState.dayNumber).toBe(5);
			expect(timeState.stepIndex).toBe(15);
			expect(timeState.stepInDay).toBe(16);
			expect(timeState.phase).toBe("day");
			expect(timeState.dayStepsLeft).toBe(34);
		});

		it("returns correct values for dusk", () => {
			const state = createTestState({ dayNumber: 2, dayStep: 25 });
			const timeState = getTimeState(state);

			expect(timeState.dayNumber).toBe(2);
			expect(timeState.stepIndex).toBe(25);
			expect(timeState.phase).toBe("dusk");
		});

		it("returns correct values for night", () => {
			const state = createTestState({ dayNumber: 3, dayStep: 35 });
			const timeState = getTimeState(state);

			expect(timeState.phase).toBe("night");
		});

		it("returns correct values for dawn", () => {
			const state = createTestState({ dayNumber: 4, dayStep: 45 });
			const timeState = getTimeState(state);

			expect(timeState.phase).toBe("dawn");
		});

		it("returns correct values for last step of day", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 49 });
			const timeState = getTimeState(state);

			expect(timeState.stepInDay).toBe(50);
			expect(timeState.dayStepsLeft).toBe(0);
			expect(timeState.phase).toBe("dawn");
		});

		it("falls back to day property if dayNumber is missing", () => {
			const state = createTestState({ dayNumber: undefined, day: 7, dayStep: 10 });
			delete state.dayNumber;
			state.day = 7;
			const timeState = getTimeState(state);

			expect(timeState.dayNumber).toBe(7);
		});
	});

	describe("advanceTurn", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("increments dayStep by 1", () => {
			const state = createTestState({ dayStep: 0 });
			advanceTurn(state);
			expect(state.dayStep).toBe(1);
		});

		it("advances through day phases correctly", () => {
			const state = createTestState({ dayStep: 19 });
			expect(getPhaseFromStepIndex(state.dayStep)).toBe("day");

			advanceTurn(state);
			expect(state.dayStep).toBe(20);
			expect(getPhaseFromStepIndex(state.dayStep)).toBe("dusk");
		});

		it("triggers new day at step 50", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 49 });
			advanceTurn(state);

			expect(state.dayNumber).toBe(2);
			expect(state.dayStep).toBe(0);
		});

		it("does not trigger new day before step 50", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 48 });
			advanceTurn(state);

			expect(state.dayNumber).toBe(1);
			expect(state.dayStep).toBe(49);
		});

		it("processes status effects each turn", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "bleeding", duration: 2 }];

			advanceTurn(state);

			// Duration should decrease by 1
			expect(state.player.statusEffects[0].duration).toBe(1);
		});

		it("removes expired status effects", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "bleeding", duration: 1 }];

			advanceTurn(state);

			expect(state.player.statusEffects.length).toBe(0);
		});
	});

	describe("newDay", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("increments day number", () => {
			const state = createTestState({ dayNumber: 1 });
			newDay(state);
			expect(state.dayNumber).toBe(2);
		});

		it("resets dayStep to 0", () => {
			const state = createTestState({ dayStep: 49 });
			newDay(state);
			expect(state.dayStep).toBe(0);
		});

		it("heals player by 1 HP", () => {
			const state = createTestState();
			state.player.hp = 5;
			state.player.maxhp = 10;

			newDay(state);

			expect(state.player.hp).toBe(6);
		});

		it("does not heal above max HP", () => {
			const state = createTestState();
			state.player.hp = 10;
			state.player.maxhp = 10;

			newDay(state);

			expect(state.player.hp).toBe(10);
		});

		it("processes timers", () => {
			const state = createTestState();
			state.timers = [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 1, reason: "wood" }];

			newDay(state);

			// Timer with 1 day left should be processed and removed
			expect(state.timers.length).toBe(0);
		});

		it("decrements timer days", () => {
			const state = createTestState();
			state.timers = [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 3, reason: "wood" }];

			newDay(state);

			expect(state.timers[0].daysLeft).toBe(2);
		});

		it("restores tiles when timer expires", () => {
			const state = createTestState();
			state.world[4][4] = "🌱"; // Position (5,5)
			state.timers = [{ x: 5, y: 5, restoreTile: "🌳", daysLeft: 1, reason: "wood" }];

			newDay(state);

			expect(state.world[4][4]).toBe("🌳");
		});

		it("adds history entry for new day", () => {
			const state = createTestState({ dayNumber: 1 });
			newDay(state);

			expect(state.history.length).toBeGreaterThan(0);
			const entry = state.history[0];
			expect(entry.who).toContain("Мастер");
			expect(entry.what).toContain("Новый день");
		});

		it("handles both day and dayNumber properties", () => {
			const state = createTestState({ dayNumber: 1 });
			state.day = 1;

			newDay(state);

			expect(state.dayNumber).toBe(2);
			expect(state.day).toBe(2);
		});
	});

	describe("full day cycle", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("completes a full 50-step day cycle", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 0 });

			// Advance through all 50 steps
			for (let i = 0; i < 50; i++) {
				const expectedPhase = i < 20 ? "day" : i < 30 ? "dusk" : i < 40 ? "night" : "dawn";
				expect(getPhaseFromStepIndex(state.dayStep)).toBe(expectedPhase);
				advanceTurn(state);
			}

			// Should now be day 2, step 0
			expect(state.dayNumber).toBe(2);
			expect(state.dayStep).toBe(0);
		});

		it("phases transition correctly", () => {
			const state = createTestState({ dayNumber: 1, dayStep: 0 });

			// Day phase (20 steps)
			for (let i = 0; i < 20; i++) {
				expect(getPhaseFromStepIndex(state.dayStep)).toBe("day");
				advanceTurn(state);
			}

			// Dusk phase (10 steps)
			for (let i = 0; i < 10; i++) {
				expect(getPhaseFromStepIndex(state.dayStep)).toBe("dusk");
				advanceTurn(state);
			}

			// Night phase (10 steps)
			for (let i = 0; i < 10; i++) {
				expect(getPhaseFromStepIndex(state.dayStep)).toBe("night");
				advanceTurn(state);
			}

			// Dawn phase (10 steps)
			for (let i = 0; i < 10; i++) {
				expect(getPhaseFromStepIndex(state.dayStep)).toBe("dawn");
				advanceTurn(state);
			}

			// Should now be new day
			expect(state.dayNumber).toBe(2);
		});
	});
});

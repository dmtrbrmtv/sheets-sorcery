import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRAFT_SPECS } from "../../docs/actions.js";
import { CFG } from "../../docs/config.js";
import {
	CRAFT_COST_ICONS,
	getActiveQuests,
	getCombatDisplayData,
	getCombatEnemyInfo,
	getContextHints,
	getCraftSpecsWithState,
	getPlayerStats,
} from "../../docs/ui.js";
import { createAnimalCombat, createNpcCombat, createZombieCombat } from "../fixtures/entities.js";
import { createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";
import { resetRandomMocks } from "../helpers/random.js";

describe("ui", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("getCombatEnemyInfo", () => {
		it("returns null when not in combat", () => {
			const state = createTestState({ combat: null });
			expect(getCombatEnemyInfo(state)).toBeNull();
		});

		it("returns zombie info", () => {
			const state = createTestState({ combat: createZombieCombat(4) });
			const info = getCombatEnemyInfo(state);

			expect(info.emoji).toBe("🧟");
			expect(info.name).toBe("Зомби");
			expect(info.hp).toBe(4);
			expect(info.maxHp).toBe(CFG.ZOMBIE.hp);
		});

		it("returns NPC info", () => {
			const state = createTestState({ combat: createNpcCombat("🧝🏿") });
			const info = getCombatEnemyInfo(state);

			expect(info.emoji).toBe("🧝🏿");
			expect(info.name).toBe("Тёмный эльф");
			expect(info.maxHp).toBe(7);
		});

		it("returns animal info", () => {
			const state = createTestState({ combat: createAnimalCombat("wolf") });
			const info = getCombatEnemyInfo(state);

			expect(info.emoji).toBe("🐺");
			expect(info.name).toBe("Волк");
			expect(info.maxHp).toBe(8);
		});
	});

	describe("getCombatDisplayData", () => {
		it("returns null when not in combat", () => {
			const state = createTestState({ combat: null });
			expect(getCombatDisplayData(state)).toBeNull();
		});

		it("returns player and enemy data", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 8, maxhp: 10 }),
				combat: createZombieCombat(),
			});

			const data = getCombatDisplayData(state);

			expect(data.player).toBeDefined();
			expect(data.enemy).toBeDefined();
			expect(data.combatLog).toBeDefined();
		});

		it("includes player HP bar", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 3, maxhp: 5 }),
				combat: createZombieCombat(),
			});

			const data = getCombatDisplayData(state);

			expect(data.player.hpBar).toBe("❤️❤️❤️💔💔");
		});

		it("includes enemy HP bar", () => {
			const state = createTestState({
				combat: createZombieCombat(4), // 4/6 HP
			});

			const data = getCombatDisplayData(state);

			expect(data.enemy.hpBar).toBe("❤️❤️❤️❤️💔💔");
		});

		it("includes player armor bar", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🛡️"] }),
				combat: createZombieCombat(),
			});

			const data = getCombatDisplayData(state);

			expect(data.player.armorBar.length).toBeGreaterThan(0);
		});

		it("includes status effects in player data", () => {
			const state = createTestState({
				combat: createZombieCombat(),
			});
			state.player.statusEffects = [{ type: "bleeding", duration: 2 }];

			const data = getCombatDisplayData(state);

			expect(data.player.effects.length).toBeGreaterThan(0);
			expect(data.player.effects[0]).toContain("🩸");
		});
	});

	describe("getContextHints", () => {
		it("shows fight hint when enemy present", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.hints.length).toBeGreaterThan(0);
			expect(hints.hints[0]).toContain("⚔️");
		});

		it("shows chop hint on forest tile", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("🪓"))).toBe(true);
		});

		it("shows quarry hint on stone tile", () => {
			const world = createWorldWithTiles({ "5,5": "🗻" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("⛏️"))).toBe(true);
		});

		it("shows fight hint when animal present", () => {
			// Animals on the same tile trigger combat, showing fight hint
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [{ x: 5, y: 5, type: "small", emoji: "🐇", passive: true }],
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("⚔️"))).toBe(true);
		});

		it("shows hunt hint on huntable tile without animal", () => {
			// Tile-based hunting (huntable tile emoji, no animal entity)
			const world = createWorldWithTiles({ "5,5": "🦌" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [],
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("🏹"))).toBe(true);
		});

		it("shows fish hint near water", () => {
			const world = createWorldWithTiles({ "5,5": "⬜️", "6,5": "🌊" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("🎣"))).toBe(true);
		});

		it("shows talk hint when villager present", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 3, y: 5 }),
				villagers: [{ x: 3, y: 5, emoji: "🧙‍♂️", name: "Мастер квестов", role: "quest" }],
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("💬"))).toBe(true);
		});

		it("shows house purchase hint on 🪧 tile", () => {
			const world = createWorldWithTiles({ "5,5": "🪧" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.hints.some((h) => h.includes("🏡"))).toBe(true);
		});

		it("returns tile info", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const hints = getContextHints(state);

			expect(hints.tileEmoji).toBe("🌳");
			expect(hints.tileName).toBeDefined();
		});
	});

	describe("getPlayerStats", () => {
		it("returns all resource counts", () => {
			const state = createTestState({
				player: createTestPlayer({
					wood: 5,
					stone: 3,
					gold: 10,
					food: 2,
					fish: 1,
					herb: 4,
				}),
			});

			const stats = getPlayerStats(state);

			expect(stats.wood).toBe(5);
			expect(stats.stone).toBe(3);
			expect(stats.gold).toBe(10);
			expect(stats.food).toBe(2);
			expect(stats.fish).toBe(1);
		});

		it("returns HP values", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 7, maxhp: 10 }),
			});

			const stats = getPlayerStats(state);

			expect(stats.hp).toBe(7);
			expect(stats.maxhp).toBe(10);
		});

		it("returns position", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 15, y: 20 }),
			});

			const stats = getPlayerStats(state);

			expect(stats.x).toBe(15);
			expect(stats.y).toBe(20);
		});

		it("returns time info", () => {
			const state = createTestState({
				dayNumber: 5,
				dayStep: 25,
			});

			const stats = getPlayerStats(state);

			expect(stats.dayNumber).toBe(5);
			expect(stats.phase).toBe("dusk");
			expect(stats.stepInDay).toBe(26);
		});

		it("returns phase icons and names", () => {
			const state = createTestState({ dayStep: 0 });
			const statsDay = getPlayerStats(state);
			expect(statsDay.phaseIcon).toBe("🌝");
			expect(statsDay.phaseName).toBe("День");

			state.dayStep = 25;
			const statsDusk = getPlayerStats(state);
			expect(statsDusk.phaseIcon).toBe("🌘");
			expect(statsDusk.phaseName).toBe("Сумерки");

			state.dayStep = 35;
			const statsNight = getPlayerStats(state);
			expect(statsNight.phaseIcon).toBe("🌚");
			expect(statsNight.phaseName).toBe("Ночь");

			state.dayStep = 45;
			const statsDawn = getPlayerStats(state);
			expect(statsDawn.phaseIcon).toBe("🌔");
			expect(statsDawn.phaseName).toBe("Рассвет");
		});

		it("includes equipment effects", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🪓", "🗡️"] }),
			});

			const stats = getPlayerStats(state);

			expect(stats.effects.some((e) => e.includes("🪓"))).toBe(true);
			expect(stats.effects.some((e) => e.includes("⚔️"))).toBe(true);
		});

		it("includes status effects", () => {
			const state = createTestState();
			state.player.statusEffects = [{ type: "bleeding", duration: 2 }];

			const stats = getPlayerStats(state);

			expect(stats.effects.some((e) => e.includes("🩸"))).toBe(true);
		});

		it("counts potions", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🧪", "🧪", "🗡️"] }),
			});

			const stats = getPlayerStats(state);

			expect(stats.potionCount).toBe(2);
		});
	});

	describe("getCraftSpecsWithState", () => {
		it("returns all craft specs", () => {
			const state = createTestState();
			const specs = getCraftSpecsWithState(state);

			expect(specs.length).toBe(CRAFT_SPECS.length);
		});

		it("marks items as craftable when resources available", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 10, stone: 10, gold: 10 }),
			});

			const specs = getCraftSpecsWithState(state);
			const axeSpec = specs.find((s) => s.item === "🪓");

			expect(axeSpec.canCraft).toBe(true);
		});

		it("marks items as not craftable when resources missing", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 0, stone: 0, gold: 0 }),
			});

			const specs = getCraftSpecsWithState(state);
			const swordSpec = specs.find((s) => s.item === "🗡️");

			expect(swordSpec.canCraft).toBe(false);
		});

		it("includes cost parts with missing indicators", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 1, stone: 0 }),
			});

			const specs = getCraftSpecsWithState(state);
			const axeSpec = specs.find((s) => s.item === "🪓");

			// Axe costs wood: 2, stone: 1
			const woodPart = axeSpec.costParts.find((p) => p.text.includes("🪵"));
			const stonePart = axeSpec.costParts.find((p) => p.text.includes("🪨"));

			expect(woodPart.missing).toBe(true); // 1 < 2
			expect(stonePart.missing).toBe(true); // 0 < 1
		});

		it("checks item requirements (bow needs rope)", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 10, stone: 10, gold: 10, items: [] }),
			});

			const specs = getCraftSpecsWithState(state);
			const bowSpec = specs.find((s) => s.item === "🏹");

			expect(bowSpec.canCraft).toBe(false);

			// With rope
			state.player.items = ["🪢"];
			const specs2 = getCraftSpecsWithState(state);
			const bowSpec2 = specs2.find((s) => s.item === "🏹");

			expect(bowSpec2.canCraft).toBe(true);
		});
	});

	describe("getActiveQuests", () => {
		it("returns empty array when no quests", () => {
			const state = createTestState({ activeQuests: [] });
			const quests = getActiveQuests(state);

			expect(quests).toEqual([]);
		});

		it("returns quest with progress", () => {
			const state = createTestState({
				activeQuests: [{ id: "wood3", progress: { wood: 1 } }],
			});

			const quests = getActiveQuests(state);

			expect(quests.length).toBe(1);
			expect(quests[0].id).toBe("wood3");
			expect(quests[0].name).toBe("3🪵 → 2💰");
			expect(quests[0].progressText).toContain("1/3");
		});

		it("filters out invalid quest IDs", () => {
			const state = createTestState({
				activeQuests: [{ id: "invalid_quest", progress: {} }],
			});

			const quests = getActiveQuests(state);

			expect(quests).toEqual([]);
		});

		it("handles multiple quests", () => {
			const state = createTestState({
				activeQuests: [
					{ id: "wood3", progress: { wood: 2 } },
					{ id: "food2", progress: { food: 0 } },
				],
			});

			const quests = getActiveQuests(state);

			expect(quests.length).toBe(2);
		});
	});

	describe("CRAFT_COST_ICONS", () => {
		it("has icons for all resource types", () => {
			expect(CRAFT_COST_ICONS.wood).toBe("🪵");
			expect(CRAFT_COST_ICONS.stone).toBe("🪨");
			expect(CRAFT_COST_ICONS.gold).toBe("💰");
			expect(CRAFT_COST_ICONS.food).toBe("🍖");
			expect(CRAFT_COST_ICONS.fish).toBe("🐟");
			expect(CRAFT_COST_ICONS.herb).toBe("🌿");
		});
	});

	describe("time display", () => {
		it("calculates step in phase correctly for day", () => {
			const state = createTestState({ dayStep: 5 });
			const stats = getPlayerStats(state);

			expect(stats.stepInPhase).toBe(6); // 0-indexed + 1
			expect(stats.phaseStepsInPhase).toBe(20);
		});

		it("calculates step in phase correctly for dusk", () => {
			const state = createTestState({ dayStep: 25 });
			const stats = getPlayerStats(state);

			expect(stats.stepInPhase).toBe(6); // 25 - 20 + 1
			expect(stats.phaseStepsInPhase).toBe(10);
		});

		it("calculates step in phase correctly for night", () => {
			const state = createTestState({ dayStep: 35 });
			const stats = getPlayerStats(state);

			expect(stats.stepInPhase).toBe(6); // 35 - 30 + 1
			expect(stats.phaseStepsInPhase).toBe(10);
		});

		it("calculates step in phase correctly for dawn", () => {
			const state = createTestState({ dayStep: 45 });
			const stats = getPlayerStats(state);

			expect(stats.stepInPhase).toBe(6); // 45 - 40 + 1
			expect(stats.phaseStepsInPhase).toBe(10);
		});

		it("includes all phases", () => {
			const state = createTestState();
			const stats = getPlayerStats(state);

			expect(stats.allPhases).toEqual(["day", "dusk", "night", "dawn"]);
		});
	});
});

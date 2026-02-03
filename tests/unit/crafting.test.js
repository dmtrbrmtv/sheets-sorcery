import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRAFT_SPECS, countItem, craft, useConsumable } from "../../docs/actions.js";
import { createTestPlayer, createTestState } from "../fixtures/state.js";
import { resetRandomMocks } from "../helpers/random.js";

describe("crafting", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("CRAFT_SPECS", () => {
		it("has all expected items", () => {
			const items = CRAFT_SPECS.map((s) => s.item);
			expect(items).toContain("🪓"); // Axe
			expect(items).toContain("⛏️"); // Pickaxe
			expect(items).toContain("🗡️"); // Sword
			expect(items).toContain("⚔️"); // Double blades
			expect(items).toContain("⚒️"); // Hammer
			expect(items).toContain("🔱"); // Trident
			expect(items).toContain("🏹"); // Bow
			expect(items).toContain("🛡️"); // Shield
			expect(items).toContain("🔰"); // Strong shield
			expect(items).toContain("🧥"); // Armor
			expect(items).toContain("🪖"); // Helmet
			expect(items).toContain("⛵"); // Boat
			expect(items).toContain("🧪"); // Potion
			expect(items).toContain("🍱"); // Rations
			expect(items).toContain("🪢"); // Rope
			expect(items).toContain("💍"); // Ring
		});

		it("all specs have required fields", () => {
			for (const spec of CRAFT_SPECS) {
				expect(spec.item).toBeDefined();
				expect(spec.name).toBeDefined();
				expect(spec.cost).toBeDefined();
				expect(typeof spec.cost).toBe("object");
			}
		});
	});

	describe("countItem", () => {
		it("returns 0 when no items", () => {
			const state = createTestState();
			expect(countItem(state, "🗡️")).toBe(0);
		});

		it("counts single item", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🗡️"] }),
			});
			expect(countItem(state, "🗡️")).toBe(1);
		});

		it("counts multiple of same item", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🧪", "🧪", "🧪"] }),
			});
			expect(countItem(state, "🧪")).toBe(3);
		});

		it("counts correctly with mixed items", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🗡️", "🧪", "🧪", "🛡️"] }),
			});
			expect(countItem(state, "🧪")).toBe(2);
			expect(countItem(state, "🗡️")).toBe(1);
			expect(countItem(state, "🛡️")).toBe(1);
		});
	});

	describe("craft function", () => {
		it("crafts item when resources available", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 2, stone: 1 }),
			});
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			const result = craft(state, axeSpec);

			expect(result).toBe(true);
			expect(state.player.items).toContain("🪓");
		});

		it("deducts resources on craft", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 5, stone: 3 }),
			});
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			craft(state, axeSpec);

			expect(state.player.wood).toBe(3); // 5 - 2
			expect(state.player.stone).toBe(2); // 3 - 1
		});

		it("fails when resources insufficient", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 0, stone: 0 }),
			});
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			const result = craft(state, axeSpec);

			expect(result).toBe(false);
			expect(state.player.items).not.toContain("🪓");
		});

		it("fails when partially insufficient resources", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 2, stone: 0 }),
			});
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			const result = craft(state, axeSpec);

			expect(result).toBe(false);
			expect(state.player.wood).toBe(2); // Unchanged
		});

		it("bow requires rope item", () => {
			const bowSpec = CRAFT_SPECS.find((s) => s.item === "🏹");
			expect(bowSpec.costItems).toEqual({ "🪢": 1 });

			const state = createTestState({
				player: createTestPlayer({ wood: 2, stone: 1, gold: 1, items: ["🪢"] }),
			});

			const result = craft(state, bowSpec);

			expect(result).toBe(true);
			expect(state.player.items).toContain("🏹");
			expect(state.player.items).not.toContain("🪢");
		});

		it("fails bow craft without rope", () => {
			const bowSpec = CRAFT_SPECS.find((s) => s.item === "🏹");
			const state = createTestState({
				player: createTestPlayer({ wood: 2, stone: 1, gold: 1, items: [] }),
			});

			const result = craft(state, bowSpec);

			expect(result).toBe(false);
		});

		it("logs history on successful craft", () => {
			const state = createTestState({
				player: createTestPlayer({ wood: 2, stone: 1 }),
			});
			state.history = [];
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			craft(state, axeSpec);

			expect(state.history.length).toBeGreaterThan(0);
		});

		it("starts combat if enemy on tile", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, wood: 2, stone: 1 }),
				npcs: [{ x: 5, y: 5, emoji: "🧝🏿", hp: 7, atk: 2 }],
			});
			const axeSpec = CRAFT_SPECS.find((s) => s.item === "🪓");

			const result = craft(state, axeSpec);

			expect(result).toBe(false);
			expect(state.combat).not.toBeNull();
		});
	});

	describe("individual item crafts", () => {
		it("crafts axe (wood: 2, stone: 1)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🪓");
			expect(spec.cost).toEqual({ wood: 2, stone: 1 });
		});

		it("crafts pickaxe (wood: 1, stone: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "⛏️");
			expect(spec.cost).toEqual({ wood: 1, stone: 2 });
		});

		it("crafts sword (wood: 2, stone: 2, gold: 1)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🗡️");
			expect(spec.cost).toEqual({ wood: 2, stone: 2, gold: 1 });
			expect(spec.stat.atk).toBe(2);
		});

		it("crafts double blades (wood: 4, stone: 3, gold: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "⚔️");
			expect(spec.cost).toEqual({ wood: 4, stone: 3, gold: 2 });
			expect(spec.stat.atk).toBe(4);
			expect(spec.isNoShield).toBe(true);
		});

		it("crafts shield (wood: 2, stone: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🛡️");
			expect(spec.cost).toEqual({ wood: 2, stone: 2 });
			expect(spec.stat.armor).toBe(2);
			expect(spec.isShield).toBe(true);
		});

		it("crafts strong shield (wood: 4, stone: 4, gold: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🔰");
			expect(spec.cost).toEqual({ wood: 4, stone: 4, gold: 2 });
			expect(spec.stat.armor).toBe(4);
			expect(spec.isShield).toBe(true);
		});

		it("crafts armor (wood: 4, stone: 3, gold: 3)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🧥");
			expect(spec.cost).toEqual({ wood: 4, stone: 3, gold: 3 });
			expect(spec.stat.armor).toBe(5);
			expect(spec.isShield).toBeUndefined();
		});

		it("crafts boat (wood: 3, stone: 1)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "⛵");
			expect(spec.cost).toEqual({ wood: 3, stone: 1 });
		});

		it("crafts rope (wood: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🪢");
			expect(spec.cost).toEqual({ wood: 2 });
		});

		it("crafts ring (stone: 1, gold: 2)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "💍");
			expect(spec.cost).toEqual({ stone: 1, gold: 2 });
		});
	});

	describe("consumables", () => {
		it("potion is consumable", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🧪");
			expect(spec.consumable).toBe(true);
			expect(spec.heal).toBe(2);
		});

		it("rations is consumable", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🍱");
			expect(spec.consumable).toBe(true);
			expect(spec.heal).toBe(2);
		});

		it("potion costs (herb: 2, fish: 1, gold: 1)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🧪");
			expect(spec.cost).toEqual({ herb: 2, fish: 1, gold: 1 });
		});

		it("rations costs (food: 2, wood: 1)", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🍱");
			expect(spec.cost).toEqual({ food: 2, wood: 1 });
		});
	});

	describe("useConsumable", () => {
		it("heals player when using potion", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: ["🧪"] }),
			});

			const result = useConsumable(state, "🧪");

			expect(result).toBe(true);
			expect(state.player.hp).toBe(7); // 5 + 2
		});

		it("removes consumed item", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: ["🧪", "🧪"] }),
			});

			useConsumable(state, "🧪");

			expect(countItem(state, "🧪")).toBe(1);
		});

		it("does not heal above max HP", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 9, maxhp: 10, items: ["🧪"] }),
			});

			useConsumable(state, "🧪");

			expect(state.player.hp).toBe(10);
		});

		it("returns false when item not in inventory", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: [] }),
			});

			const result = useConsumable(state, "🧪");

			expect(result).toBe(false);
		});

		it("returns false for non-consumable item", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: ["🗡️"] }),
			});

			const result = useConsumable(state, "🗡️");

			expect(result).toBe(false);
		});

		it("heals with rations", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: ["🍱"] }),
			});

			const result = useConsumable(state, "🍱");

			expect(result).toBe(true);
			expect(state.player.hp).toBe(7);
		});

		it("logs history on use", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 5, maxhp: 10, items: ["🧪"] }),
			});
			state.history = [];

			useConsumable(state, "🧪");

			expect(state.history.length).toBeGreaterThan(0);
			expect(state.history[0].what).toContain("🧪");
		});

		it("starts combat if enemy on tile", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, hp: 5, maxhp: 10, items: ["🧪"] }),
				npcs: [{ x: 5, y: 5, emoji: "🧝🏿", hp: 7, atk: 2 }],
			});

			const result = useConsumable(state, "🧪");

			expect(result).toBe(false);
			expect(state.combat).not.toBeNull();
			expect(state.player.hp).toBe(5); // Not healed
		});
	});

	describe("equipment bonuses", () => {
		it("axe gives +1 wood bonus", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "🪓");
			expect(spec.woodBonus).toBe(1);
		});

		it("pickaxe gives +1 stone bonus", () => {
			const spec = CRAFT_SPECS.find((s) => s.item === "⛏️");
			expect(spec.stoneBonus).toBe(1);
		});
	});

	describe("item categories", () => {
		it("tools have item category", () => {
			const axe = CRAFT_SPECS.find((s) => s.item === "🪓");
			const pickaxe = CRAFT_SPECS.find((s) => s.item === "⛏️");
			expect(axe.category).toBe("item");
			expect(pickaxe.category).toBe("item");
		});

		it("weapons have weapon category", () => {
			const sword = CRAFT_SPECS.find((s) => s.item === "🗡️");
			const blades = CRAFT_SPECS.find((s) => s.item === "⚔️");
			expect(sword.category).toBe("weapon");
			expect(blades.category).toBe("weapon");
		});
	});

	describe("item tags", () => {
		it("basic items are common", () => {
			const axe = CRAFT_SPECS.find((s) => s.item === "🪓");
			const pickaxe = CRAFT_SPECS.find((s) => s.item === "⛏️");
			const sword = CRAFT_SPECS.find((s) => s.item === "🗡️");
			expect(axe.tag).toBe("common");
			expect(pickaxe.tag).toBe("common");
			expect(sword.tag).toBe("common");
		});

		it("advanced items are rare", () => {
			const blades = CRAFT_SPECS.find((s) => s.item === "⚔️");
			const armor = CRAFT_SPECS.find((s) => s.item === "🧥");
			const ring = CRAFT_SPECS.find((s) => s.item === "💍");
			expect(blades.tag).toBe("rare");
			expect(armor.tag).toBe("rare");
			expect(ring.tag).toBe("rare");
		});
	});
});

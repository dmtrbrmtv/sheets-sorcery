import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { move } from "../../docs/actions.js";
import { CFG, GRID_H, GRID_W } from "../../docs/config.js";
import { buildVisibleSet, getTileAt } from "../../docs/gameState.js";
import { createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";

describe("movement", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("move function", () => {
		it("moves player north", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = move(state, "N");

			expect(result).toBe(true);
			expect(state.player.y).toBe(4);
			expect(state.player.x).toBe(5);
		});

		it("moves player south", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = move(state, "S");

			expect(result).toBe(true);
			expect(state.player.y).toBe(6);
			expect(state.player.x).toBe(5);
		});

		it("moves player east", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = move(state, "E");

			expect(result).toBe(true);
			expect(state.player.x).toBe(6);
			expect(state.player.y).toBe(5);
		});

		it("moves player west", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = move(state, "W");

			expect(result).toBe(true);
			expect(state.player.x).toBe(4);
			expect(state.player.y).toBe(5);
		});

		it("returns false for invalid direction", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			const result = move(state, "X");

			expect(result).toBe(false);
			expect(state.player.x).toBe(5);
			expect(state.player.y).toBe(5);
		});

		it("blocks movement outside map bounds (north)", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 1 }) });
			const result = move(state, "N");

			expect(result).toBe(true); // Returns true but doesn't move (logs boundary)
			expect(state.player.y).toBe(1);
		});

		it("blocks movement outside map bounds (west)", () => {
			const state = createTestState({ player: createTestPlayer({ x: 1, y: 5 }) });
			const result = move(state, "W");

			expect(result).toBe(true);
			expect(state.player.x).toBe(1);
		});

		it("blocks movement into water without boat", () => {
			const world = createWorldWithTiles({ "6,5": "🌊" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const result = move(state, "E");

			expect(result).toBe(true);
			expect(state.player.x).toBe(5); // Did not move
		});

		it("allows movement into water with boat", () => {
			const world = createWorldWithTiles({ "6,5": "🌊" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, items: ["⛵"] }),
			});

			const result = move(state, "E");

			expect(result).toBe(true);
			expect(state.player.x).toBe(6);
		});

		it("blocks movement into blocked tiles (rock)", () => {
			const world = createWorldWithTiles({ "6,5": "🗿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const result = move(state, "E");

			expect(result).toBe(true);
			expect(state.player.x).toBe(5);
		});

		it("allows movement into rocky tiles with rope", () => {
			const world = createWorldWithTiles({ "6,5": "🗿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, items: ["🪢"] }),
			});

			const result = move(state, "E");

			expect(result).toBe(true);
			expect(state.player.x).toBe(6);
		});

		it("blocks movement when in combat", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				combat: { type: "zombie", hp: 6 },
			});

			const result = move(state, "N");

			expect(result).toBe(false);
			expect(state.player.y).toBe(5);
		});

		it("updates revealed set on movement", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				revealed: new Set(["5,5"]),
			});

			move(state, "N");

			// New position and surrounding tiles should be revealed
			expect(state.revealed.has("5,4")).toBe(true);
		});

		it("logs history on movement", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			state.history = [];

			move(state, "N");

			expect(state.history.length).toBeGreaterThan(0);
		});

		it("starts combat when moving onto zombie tile", () => {
			const world = createWorldWithTiles({ "6,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.combat).not.toBeNull();
			expect(state.combat.type).toBe("zombie");
		});

		it("starts combat when moving onto NPC", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				npcs: [{ x: 6, y: 5, emoji: "🧝🏿", hp: 7, atk: 2 }],
			});

			move(state, "E");

			expect(state.combat).not.toBeNull();
			expect(state.combat.type).toBe("npc");
		});

		it("starts combat when moving onto hostile animal", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [{ x: 6, y: 5, type: "wolf", emoji: "🐺", passive: false, hp: 8, atk: 2 }],
			});

			move(state, "E");

			expect(state.combat).not.toBeNull();
			expect(state.combat.type).toBe("animal");
		});
	});

	describe("buildVisibleSet", () => {
		it("creates visible set with default radius", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player);

			// Default radius is 3 from CFG
			const radius = CFG.FOG.radius;
			expect(visible.has("10,10")).toBe(true); // Player position
			expect(visible.has(`${10 + radius},10`)).toBe(true); // Max east
			expect(visible.has(`${10 - radius},10`)).toBe(true); // Max west
			expect(visible.has(`10,${10 + radius}`)).toBe(true); // Max south
			expect(visible.has(`10,${10 - radius}`)).toBe(true); // Max north
		});

		it("creates visible set with custom radius", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player, 2);

			expect(visible.has("10,10")).toBe(true);
			expect(visible.has("12,10")).toBe(true); // 2 tiles east
			expect(visible.has("13,10")).toBe(false); // 3 tiles east - outside
		});

		it("does not include tiles outside map bounds", () => {
			const player = createTestPlayer({ x: 1, y: 1 });
			const visible = buildVisibleSet(player, 3);

			// Should not include negative coordinates
			expect(visible.has("0,1")).toBe(false);
			expect(visible.has("-1,1")).toBe(false);
			expect(visible.has("1,0")).toBe(false);
		});

		it("handles player at map edge", () => {
			const player = createTestPlayer({ x: GRID_W, y: GRID_H });
			const visible = buildVisibleSet(player, 3);

			expect(visible.has(`${GRID_W},${GRID_H}`)).toBe(true);
			// Should not include tiles past east boundary
			expect(visible.has(`${GRID_W + 1},${GRID_H}`)).toBe(false);
		});

		it("visibility set is a square around player", () => {
			const player = createTestPlayer({ x: 10, y: 10 });
			const visible = buildVisibleSet(player, 2);

			// Count tiles - should be (2*radius+1)^2 = 5*5 = 25 max
			// But may be less if near boundaries
			let count = 0;
			for (let dy = -2; dy <= 2; dy++) {
				for (let dx = -2; dx <= 2; dx++) {
					const x = 10 + dx;
					const y = 10 + dy;
					if (x >= 1 && x <= GRID_W && y >= 1) {
						expect(visible.has(`${x},${y}`)).toBe(true);
						count++;
					}
				}
			}
			expect(visible.size).toBe(count);
		});
	});

	describe("getTileAt", () => {
		it("returns tile at valid position", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const tile = getTileAt(world, 5, 5);
			expect(tile).toBe("🌳");
		});

		it("returns null for out of bounds position", () => {
			const world = createWorldWithTiles({});
			expect(getTileAt(world, 0, 0)).toBeNull();
			expect(getTileAt(world, -1, 5)).toBeNull();
			expect(getTileAt(world, GRID_W + 1, 5)).toBeNull();
		});

		it("uses worldChanges when state is provided", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = { worldChanges: { "5,5": "🌱" } };

			const tile = getTileAt(world, 5, 5, state);
			expect(tile).toBe("🌱");
		});

		it("falls back to world when no worldChange exists", () => {
			const world = createWorldWithTiles({ "5,5": "🌳" });
			const state = { worldChanges: {} };

			const tile = getTileAt(world, 5, 5, state);
			expect(tile).toBe("🌳");
		});
	});

	describe("terrain blocking", () => {
		it("mountain is blocked", () => {
			const world = createWorldWithTiles({ "6,5": "⛰️" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.player.x).toBe(5);
		});

		it("volcano is blocked", () => {
			const world = createWorldWithTiles({ "6,5": "🌋" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.player.x).toBe(5);
		});

		it("forest tiles are passable", () => {
			const world = createWorldWithTiles({ "6,5": "🌳" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.player.x).toBe(6);
		});

		it("plain tiles are passable", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.player.x).toBe(6);
		});

		it("buildings are passable", () => {
			const world = createWorldWithTiles({ "6,5": "🏠" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			move(state, "E");

			expect(state.player.x).toBe(6);
		});
	});
});

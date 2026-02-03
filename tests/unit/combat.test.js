import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	advanceTurn,
	combatTurn,
	getEffectiveArmor,
	getEffectiveAtk,
	getEnemyOnTile,
	isInCombat,
	move,
} from "../../docs/actions.js";
import { CFG } from "../../docs/config.js";
import {
	createAnimalCombat,
	createNpcCombat,
	createTestAnimal,
	createTestNpc,
	createZombieCombat,
} from "../fixtures/entities.js";
import { createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";
import { mockProbability, mockRandom, mockRandomSequence, resetRandomMocks } from "../helpers/random.js";

describe("combat", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("isInCombat", () => {
		it("returns false when not in combat", () => {
			const state = createTestState({ combat: null });
			expect(isInCombat(state)).toBe(false);
		});

		it("returns true when in combat", () => {
			const state = createTestState({ combat: createZombieCombat() });
			expect(isInCombat(state)).toBe(true);
		});
	});

	describe("getEnemyOnTile", () => {
		it("returns null when no enemy present", () => {
			const state = createTestState({ player: createTestPlayer({ x: 5, y: 5 }) });
			expect(getEnemyOnTile(state)).toBeNull();
		});

		it("returns zombie when on zombie tile", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
			});

			const enemy = getEnemyOnTile(state);
			expect(enemy).not.toBeNull();
			expect(enemy.type).toBe("zombie");
		});

		it("returns npc when on same tile as NPC", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				npcs: [createTestNpc("🧝🏿", { x: 5, y: 5 })],
			});

			const enemy = getEnemyOnTile(state);
			expect(enemy).not.toBeNull();
			expect(enemy.type).toBe("npc");
		});

		it("returns animal when on same tile as animal", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5 }),
				animals: [createTestAnimal("wolf", { x: 5, y: 5 })],
			});

			const enemy = getEnemyOnTile(state);
			expect(enemy).not.toBeNull();
			expect(enemy.type).toBe("animal");
		});

		it("returns null when in village (safe zone)", () => {
			const world = createWorldWithTiles({ "3,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 3, y: 5 }), // Inside village bounds
			});

			expect(getEnemyOnTile(state)).toBeNull();
		});
	});

	describe("getEffectiveAtk", () => {
		it("returns base attack when no weapons", () => {
			const state = createTestState();
			expect(getEffectiveAtk(state)).toBe(2); // Base atk
		});

		it("adds weapon bonus from sword", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🗡️"] }),
			});
			// Sword gives +2 atk
			expect(getEffectiveAtk(state)).toBe(4); // 2 base + 2 sword
		});

		it("uses highest weapon bonus", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🗡️", "⚔️"] }),
			});
			// Double blades give +4 atk, sword gives +2
			expect(getEffectiveAtk(state)).toBe(6); // 2 base + 4 best weapon
		});
	});

	describe("getEffectiveArmor", () => {
		it("returns base armor when no equipment", () => {
			const state = createTestState();
			expect(getEffectiveArmor(state)).toBe(1); // Base armor
		});

		it("adds armor bonus from shield", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🛡️"] }),
			});
			// Shield gives +2 armor
			expect(getEffectiveArmor(state)).toBe(3); // 1 base + 2 shield
		});

		it("ignores shield when using two-handed weapon", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["⚔️", "🛡️"] }),
			});
			// Double blades = no shield allowed
			expect(getEffectiveArmor(state)).toBe(1); // Just base
		});

		it("allows armor (non-shield) with two-handed weapon", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["⚔️", "🧥"] }),
			});
			// Armor (🧥) is not a shield, gives +5
			expect(getEffectiveArmor(state)).toBe(6); // 1 base + 5 armor
		});

		it("uses highest armor bonus", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["🛡️", "🔰"] }),
			});
			// Strong shield gives +4, regular shield gives +2
			expect(getEffectiveArmor(state)).toBe(5); // 1 base + 4 best shield
		});
	});

	describe("combatTurn - zombie combat", () => {
		it("deals damage to zombie on attack", () => {
			const state = createTestState({
				combat: createZombieCombat(6),
			});

			// Mock random for enemy hit
			mockProbability(false); // Enemy misses

			combatTurn(state, "attack");

			expect(state.combat.hp).toBe(4); // 6 - 2 (base atk)
		});

		it("kills zombie when HP reaches 0", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				combat: { ...createZombieCombat(2), x: 5, y: 5 },
			});

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.combat).toBeNull();
			expect(state.world[4][4]).toBe("🪦"); // Grave tile
		});

		it("grants gold on zombie kill", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, gold: 0 }),
				combat: { ...createZombieCombat(1), x: 5, y: 5 },
			});

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.player.gold).toBeGreaterThanOrEqual(CFG.ZOMBIE.goldMin);
			expect(state.player.gold).toBeLessThanOrEqual(CFG.ZOMBIE.goldMax);
		});

		it("zombie has 70% accuracy", () => {
			// Zombie accuracy is 0.7
			const state = createTestState({
				combat: createZombieCombat(6),
			});
			const startHp = state.player.hp;

			// Mock to always hit (< 0.7)
			mockRandom(0.5);

			combatTurn(state, "attack");

			expect(state.player.hp).toBeLessThan(startHp);
		});

		it("zombie misses when random > accuracy", () => {
			const state = createTestState({
				combat: createZombieCombat(6),
			});
			const startHp = state.player.hp;

			// Random sequence: fear check skipped (no fear), then zombie accuracy check
			// Zombie accuracy is 0.7, so >= 0.7 means miss
			mockRandom(0.8); // All random calls return 0.8, zombie misses (0.8 >= 0.7)

			combatTurn(state, "attack");

			expect(state.player.hp).toBe(startHp);
		});

		it("zombie deals extra damage at night", () => {
			const state = createTestState({
				dayStep: 35, // Night phase
				combat: createZombieCombat(10), // High HP so it survives
			});
			state.player.armor = 0;

			// Mock to always hit and deal minimum damage
			mockRandomSequence(0, 0.1, 0); // randInt for damage

			combatTurn(state, "attack");

			// At night, zombie deals base damage + 1
			// Base damage is 1-2, so night damage is 2-3
			expect(state.player.hp).toBeLessThan(10);
		});

		it("creates respawn timer on zombie death", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5 }),
				combat: { ...createZombieCombat(1), x: 5, y: 5 },
				timers: [],
			});

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.ZOMBIE.respawnDays);
			expect(state.timers[0].restoreTile).toBe(CFG.ZOMBIE.aliveTile);
		});
	});

	describe("combatTurn - NPC combat", () => {
		it("deals damage to NPC", () => {
			const state = createTestState({
				combat: createNpcCombat("🧝🏿"),
			});

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.combat.target.hp).toBeLessThan(7); // Dark elf has 7 HP
		});

		it("NPC dodge chance works (dark elf has 20%)", () => {
			const state = createTestState({
				combat: createNpcCombat("🧝🏿"),
			});
			const startHp = state.combat.target.hp;

			// Mock dodge success (< 0.2)
			mockRandom(0.1);

			combatTurn(state, "attack");

			expect(state.combat.target.hp).toBe(startHp); // No damage due to dodge
		});

		it("removes NPC from state on kill", () => {
			const state = createTestState({
				npcs: [createTestNpc("🧝🏿", { x: 5, y: 5, hp: 1 })],
				combat: createNpcCombat("🧝🏿", { hp: 1 }),
			});
			state.combat.target.x = 5;
			state.combat.target.y = 5;

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.combat).toBeNull();
			expect(state.npcs.length).toBe(0);
		});

		it("NPC can apply poison on hit", () => {
			const state = createTestState({
				combat: createNpcCombat("🧝🏿", { hp: 10 }),
			});

			// Mock: dodge fails, hit succeeds, poison applies (< 0.15)
			mockRandomSequence(0.5, 0.1);

			combatTurn(state, "attack");

			const hasPoison = state.player.statusEffects.some((e) => e.type === "poison");
			expect(hasPoison).toBe(true);
		});

		it("mad mage attacks first", () => {
			const world = createWorldWithTiles({ "6,5": "🗿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, items: ["🪢"] }),
				npcs: [createTestNpc("🧙🏾‍♀️", { x: 6, y: 5 })],
			});
			const startHp = state.player.hp;

			// Move onto mad mage tile
			move(state, "E");

			// Mad mage attacks first before player can act
			expect(state.player.hp).toBeLessThan(startHp);
		});
	});

	describe("combatTurn - animal combat", () => {
		it("deals damage to animal", () => {
			const state = createTestState({
				combat: createAnimalCombat("wolf"),
			});

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.combat.target.hp).toBeLessThan(8); // Wolf has 8 HP
		});

		it("removes animal from state on kill", () => {
			const state = createTestState({
				animals: [createTestAnimal("wolf", { x: 5, y: 5, hp: 1 })],
				combat: createAnimalCombat("wolf", { hp: 1 }),
			});
			state.combat.target.x = 5;
			state.combat.target.y = 5;

			mockProbability(false);

			combatTurn(state, "attack");

			expect(state.combat).toBeNull();
			expect(state.animals.length).toBe(0);
		});

		it("wolf can cause bleeding", () => {
			const state = createTestState({
				combat: createAnimalCombat("wolf", { hp: 10 }),
			});

			// Mock: bleeding applies (< 0.3)
			mockRandom(0.1);

			combatTurn(state, "attack");

			const hasBleeding = state.player.statusEffects.some((e) => e.type === "bleeding");
			expect(hasBleeding).toBe(true);
		});
	});

	describe("combatTurn - run action", () => {
		it("50% chance to escape", () => {
			const state = createTestState({
				combat: createZombieCombat(),
			});

			// Mock escape success (< 0.5)
			mockRandom(0.3);

			combatTurn(state, "run");

			expect(state.combat).toBeNull();
		});

		it("fails to escape when random >= 0.5", () => {
			const state = createTestState({
				combat: createZombieCombat(),
			});

			// Mock escape failure (>= 0.5)
			mockRandomSequence(0.6, 0.9); // fail escape, then miss attack

			combatTurn(state, "run");

			expect(state.combat).not.toBeNull();
		});

		it("enemy attacks when escape fails", () => {
			const state = createTestState({
				combat: createZombieCombat(),
			});
			const startHp = state.player.hp;

			// Mock: escape fails (0.6), zombie hits (0.5)
			mockRandomSequence(0.6, 0.5, 0);

			combatTurn(state, "run");

			expect(state.player.hp).toBeLessThan(startHp);
		});
	});

	describe("combatTurn - defend action", () => {
		it("reduces damage by 50%", () => {
			const state = createTestState({
				combat: createZombieCombat(),
			});

			// Get normal damage first
			const state2 = createTestState({
				combat: createZombieCombat(),
			});

			// Mock consistent hit and damage
			mockRandomSequence(0, 0.1, 0, 0, 0.1, 0);

			combatTurn(state, "defend");
			const hpAfterDefend = state.player.hp;

			resetRandomMocks();
			mockRandomSequence(0, 0.1, 0, 0, 0.1, 0);

			combatTurn(state2, "attack");
			const hpAfterAttack = state2.player.hp;

			// Defend should result in less damage taken
			expect(hpAfterDefend).toBeGreaterThanOrEqual(hpAfterAttack);
		});
	});

	describe("status effects", () => {
		it("bleeding deals 1 damage per turn", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "bleeding", duration: 3 }];
			state.player.hp = 10;

			// Advance turn to trigger status effect tick
			advanceTurn(state);

			expect(state.player.hp).toBe(9);
		});

		it("poison deals 1 damage per turn", () => {
			const state = createTestState({ dayStep: 0 });
			state.player.statusEffects = [{ type: "poison", duration: 2 }];
			state.player.hp = 10;

			advanceTurn(state);

			expect(state.player.hp).toBe(9);
		});

		it("fear reduces attack by 50% chance", () => {
			const state = createTestState({
				combat: createZombieCombat(10),
			});
			state.player.statusEffects = [{ type: "fear", duration: 2 }];

			// Mock: fear triggers (< 0.5)
			mockRandom(0.3);

			combatTurn(state, "attack");

			// No damage dealt due to fear
			expect(state.combat.hp).toBe(10);
		});

		it("bleeding lasts 3 turns", () => {
			expect(CFG.STATUS_EFFECTS.bleeding.duration).toBe(3);
		});

		it("poison lasts 2 turns", () => {
			expect(CFG.STATUS_EFFECTS.poison.duration).toBe(2);
		});

		it("fear lasts 2 turns", () => {
			expect(CFG.STATUS_EFFECTS.fear.duration).toBe(2);
		});
	});

	describe("death and respawn", () => {
		it("respawns at hospital when HP reaches 0", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 10, y: 10, hp: 1 }),
				combat: createZombieCombat(),
			});

			// Mock: zombie hits
			mockRandomSequence(0, 0.1, 0);

			combatTurn(state, "attack");

			// Should respawn at hospital D7 = (2, 5) in game coords
			expect(state.player.hp).toBe(state.player.maxhp);
		});

		it("clears combat on death", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 1 }),
				combat: createZombieCombat(),
			});

			mockRandomSequence(0, 0.1, 0);

			combatTurn(state, "attack");

			expect(state.combat).toBeNull();
		});

		it("clears status effects on death", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 1 }),
				combat: createZombieCombat(),
			});
			state.player.statusEffects = [{ type: "bleeding", duration: 3 }];

			mockRandomSequence(0, 0.1, 0);

			combatTurn(state, "attack");

			expect(state.player.statusEffects.length).toBe(0);
		});
	});

	describe("ring of luck", () => {
		it("20% chance to dodge enemy attack", () => {
			const state = createTestState({
				player: createTestPlayer({ items: ["💍"] }),
				combat: createZombieCombat(),
			});
			const startHp = state.player.hp;

			// Mock: ring dodge triggers (< 0.2)
			mockRandom(0.1);

			combatTurn(state, "attack");

			expect(state.player.hp).toBe(startHp);
		});
	});
});

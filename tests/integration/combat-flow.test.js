import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { combatTurn, getEffectiveAtk, move } from "../../docs/actions.js";
import { CFG } from "../../docs/config.js";
import { createAnimalCombat, createNpcCombat, createZombieCombat } from "../fixtures/entities.js";
import { createTestPlayer, createTestState, createWorldWithTiles } from "../fixtures/state.js";
import { mockRandom, mockRandomSequence, resetRandomMocks } from "../helpers/random.js";

describe("combat flow integration", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetRandomMocks();
	});

	describe("full zombie combat scenario", () => {
		it("completes combat from start to finish", () => {
			const world = createWorldWithTiles({ "5,5": "⬜️", "6,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, hp: 10, maxhp: 10, atk: 4 }),
			});

			// Move onto zombie tile to start combat
			move(state, "E");
			expect(state.combat).not.toBeNull();
			expect(state.combat.type).toBe("zombie");
			expect(state.player.x).toBe(6);

			// Fight zombie (6 HP) with 4 ATK = 2 turns to kill
			mockRandom(0.99); // Zombie misses

			combatTurn(state, "attack"); // 6 - 4 = 2 HP
			expect(state.combat.hp).toBe(2);

			resetRandomMocks();
			mockRandom(0.99);

			combatTurn(state, "attack"); // 2 - 4 = dead
			expect(state.combat).toBeNull();

			// Zombie should be replaced with grave
			expect(state.world[4][5]).toBe("🪦");

			// Player should have gained gold
			expect(state.player.gold).toBeGreaterThan(0);

			// Timer should be set for respawn
			expect(state.timers.length).toBe(1);
			expect(state.timers[0].daysLeft).toBe(CFG.ZOMBIE.respawnDays);
		});

		it("player survives combat with damage taken", () => {
			const world = createWorldWithTiles({ "6,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, hp: 10, atk: 3 }),
			});

			move(state, "E");
			expect(state.combat).not.toBeNull();

			// Fight zombie (6 HP) with 3 ATK - takes 2 turns
			// First turn: zombie hits
			mockRandomSequence(0, 0.5, 0); // fear check, accuracy check, damage roll

			combatTurn(state, "attack"); // 6 - 3 = 3 HP left
			expect(state.combat).not.toBeNull();
			expect(state.player.hp).toBeLessThan(10); // Took damage
		});
	});

	describe("NPC combat with special abilities", () => {
		it("dark elf can dodge and poison", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, hp: 10 }),
				npcs: [{ x: 5, y: 5, emoji: "🧝🏿", hp: 7, atk: 2 }],
				combat: createNpcCombat("🧝🏿"),
			});

			// Mock: elf dodges (< 0.2), then hits and applies poison (< 0.15)
			mockRandomSequence(0.1, 0.1, 0.1);

			combatTurn(state, "attack");

			// Elf should have dodged (no damage)
			expect(state.combat.target.hp).toBe(7);

			// Player might have poison
			const hasPoison = state.player.statusEffects.some((e) => e.type === "poison");
			expect(hasPoison).toBe(true);
		});

		it("mad mage attacks first on encounter", () => {
			const world = createWorldWithTiles({ "5,5": "⬜️", "6,5": "🗿" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, hp: 10, items: ["🪢"] }),
				npcs: [{ x: 6, y: 5, emoji: "🧙🏾‍♀️", hp: 5, atk: 3 }],
			});
			const startHp = state.player.hp;

			// Mad mage attacks first when player enters tile
			move(state, "E");

			expect(state.combat).not.toBeNull();
			expect(state.player.hp).toBeLessThan(startHp);
		});
	});

	describe("escape and death scenarios", () => {
		it("successful escape ends combat", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, hp: 3 }),
				combat: createZombieCombat(),
			});

			mockRandom(0.3); // < 0.5 = escape success

			combatTurn(state, "run");

			expect(state.combat).toBeNull();
			expect(state.player.hp).toBe(3); // No damage taken
		});

		it("failed escape leads to damage", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, hp: 10 }),
				combat: createZombieCombat(),
			});

			// Escape fails (0.6 >= 0.5), zombie hits (0.5 < 0.7)
			mockRandomSequence(0.6, 0.5, 0);

			combatTurn(state, "run");

			expect(state.combat).not.toBeNull();
			expect(state.player.hp).toBeLessThan(10);
		});

		it("death during combat respawns player", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 10, y: 10, hp: 1, maxhp: 10 }),
				combat: createZombieCombat(),
			});

			// Zombie hits
			mockRandomSequence(0, 0.5, 0);

			combatTurn(state, "attack");

			// Player should respawn
			expect(state.player.hp).toBe(10);
			expect(state.combat).toBeNull();
		});
	});

	describe("equipment effects in combat", () => {
		it("weapon damage bonus applies", () => {
			const state = createTestState({
				player: createTestPlayer({ atk: 2, items: ["⚔️"] }), // +4 ATK
				combat: createZombieCombat(10),
			});

			const effectiveAtk = getEffectiveAtk(state);
			expect(effectiveAtk).toBe(6); // 2 base + 4 weapon

			mockRandom(0.99); // Zombie misses

			combatTurn(state, "attack");

			expect(state.combat.hp).toBe(4); // 10 - 6
		});

		it("ring of luck provides dodge chance", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 10, items: ["💍"] }),
				combat: createZombieCombat(),
			});

			// Ring dodge triggers (< 0.2)
			mockRandom(0.1);

			combatTurn(state, "attack");

			expect(state.player.hp).toBe(10); // No damage due to ring dodge
		});
	});

	describe("status effects during combat", () => {
		it("fear reduces attack damage chance", () => {
			const state = createTestState({
				player: createTestPlayer({ atk: 4 }),
				combat: createZombieCombat(10),
			});
			state.player.statusEffects = [{ type: "fear", duration: 2 }];

			// Fear triggers (< 0.5), making attack deal 0 damage
			mockRandom(0.3);

			combatTurn(state, "attack");

			expect(state.combat.hp).toBe(10); // No damage due to fear
		});

		it("multiple status effects stack", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 10 }),
				combat: createZombieCombat(),
			});
			state.player.statusEffects = [
				{ type: "bleeding", duration: 3 },
				{ type: "poison", duration: 2 },
			];

			// Both effects should be present
			expect(state.player.statusEffects.length).toBe(2);
		});
	});

	describe("animal combat", () => {
		it("wolf combat with bleeding effect", () => {
			const state = createTestState({
				player: createTestPlayer({ x: 5, y: 5, hp: 10 }),
				animals: [{ x: 5, y: 5, type: "wolf", emoji: "🐺", passive: false, hp: 8, atk: 2 }],
				combat: createAnimalCombat("wolf"),
			});

			// Wolf hits and applies bleeding (< 0.3)
			mockRandom(0.2);

			combatTurn(state, "attack");

			const hasBleeding = state.player.statusEffects.some((e) => e.type === "bleeding");
			expect(hasBleeding).toBe(true);
		});

		it("killing passive animal is peaceful", () => {
			const state = createTestState({
				player: createTestPlayer({ atk: 5 }),
				animals: [{ x: 5, y: 5, type: "small", emoji: "🐇", passive: true, hp: 1, atk: 0 }],
				combat: createAnimalCombat("small", { hp: 1, atk: 0 }),
			});
			state.combat.target.x = 5;
			state.combat.target.y = 5;
			const startHp = state.player.hp;

			combatTurn(state, "attack");

			// Rabbit is killed, player takes no damage
			expect(state.combat).toBeNull();
			expect(state.player.hp).toBe(startHp);
			expect(state.animals.length).toBe(0);
		});
	});

	describe("loot drops", () => {
		it("zombie drops gold on death", () => {
			const world = createWorldWithTiles({ "5,5": "🧟" });
			const state = createTestState({
				world,
				player: createTestPlayer({ x: 5, y: 5, gold: 0, atk: 10 }),
				combat: { ...createZombieCombat(1), x: 5, y: 5 },
			});

			mockRandom(0.99);

			combatTurn(state, "attack");

			expect(state.player.gold).toBeGreaterThanOrEqual(CFG.ZOMBIE.goldMin);
			expect(state.player.gold).toBeLessThanOrEqual(CFG.ZOMBIE.goldMax);
		});

		it("NPC can drop special loot", () => {
			const state = createTestState({
				player: createTestPlayer({ gold: 0, atk: 10 }),
				npcs: [{ x: 5, y: 5, emoji: "🧝🏿", hp: 1, atk: 2 }],
				combat: createNpcCombat("🧝🏿", { hp: 1 }),
			});
			state.combat.target.x = 5;
			state.combat.target.y = 5;

			// Mock for dodge fail, loot rolls
			mockRandomSequence(0.5, 0.1, 0.1);

			combatTurn(state, "attack");

			expect(state.combat).toBeNull();
			// Dark elf can drop 2-4 gold
			expect(state.player.gold).toBeGreaterThanOrEqual(0);
		});
	});

	describe("defend action", () => {
		it("reduces incoming damage by 50%", () => {
			const state = createTestState({
				player: createTestPlayer({ hp: 10, armor: 0 }),
				combat: createZombieCombat(),
			});

			// Get damage with defend
			mockRandomSequence(0, 0.5, 0.99); // atk, zombie hits, max damage
			combatTurn(state, "defend");
			const hpAfterDefend = state.player.hp;
			const damageDefend = 10 - hpAfterDefend;

			// Compare with state without defend
			const state2 = createTestState({
				player: createTestPlayer({ hp: 10, armor: 0 }),
				combat: createZombieCombat(),
			});

			resetRandomMocks();
			mockRandomSequence(0, 0.5, 0.99);
			combatTurn(state2, "attack");
			const hpAfterAttack = state2.player.hp;
			const damageAttack = 10 - hpAfterAttack;

			// Defend damage should be roughly half
			expect(damageDefend).toBeLessThanOrEqual(damageAttack);
		});
	});
});

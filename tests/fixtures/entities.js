// Test fixtures for entities (animals, NPCs, combat)

import { CFG } from "../../docs/config.js";

/**
 * Create a test animal
 * @param {string} type - Animal type (small, big, boar, wolf, eagle)
 * @param {object} overrides - Properties to override
 * @returns {object} Animal entity
 */
export function createTestAnimal(type = "small", overrides = {}) {
	const spec = CFG.ANIMALS?.[type] || {
		emoji: "🐇",
		hp: 1,
		atk: 0,
		passive: true,
	};

	return {
		x: 5,
		y: 5,
		type,
		emoji: spec.emoji,
		passive: spec.passive !== false,
		hp: spec.hp,
		atk: spec.atk,
		...overrides,
	};
}

/**
 * Create a test NPC
 * @param {string} emoji - NPC emoji identifier
 * @param {object} overrides - Properties to override
 * @returns {object} NPC entity
 */
export function createTestNpc(emoji = "🧝🏿", overrides = {}) {
	const spec = CFG.NPCS?.[emoji] || {
		name: "Unknown",
		hp: 4,
		atk: 1,
	};

	return {
		x: 5,
		y: 5,
		emoji,
		hp: spec.hp || 4,
		atk: spec.atk || 1,
		maxHp: spec.hp || 4,
		...overrides,
	};
}

/**
 * Create a test villager
 * @param {string} emoji - Villager emoji identifier
 * @param {object} overrides - Properties to override
 * @returns {object} Villager entity
 */
export function createTestVillager(emoji = "🧙‍♂️", overrides = {}) {
	const spec = CFG.VILLAGERS?.[emoji] || {
		name: "Unknown",
		role: "resident",
		dialog: "...",
	};

	return {
		x: 3,
		y: 5,
		emoji,
		name: spec.name || emoji,
		role: spec.role || "resident",
		dialog: spec.dialog || "...",
		...overrides,
	};
}

/**
 * Create a test hunter
 * @param {string} emoji - Hunter emoji identifier
 * @param {object} overrides - Properties to override
 * @returns {object} Hunter entity
 */
export function createTestHunter(emoji = "👨🏻‍🦱", overrides = {}) {
	const spec = CFG.HUNTERS?.[emoji] || {
		name: "Hunter",
	};

	return {
		x: 10,
		y: 10,
		emoji,
		name: spec.name || emoji,
		...overrides,
	};
}

/**
 * Create a combat state for zombie combat
 * @param {number} hp - Zombie HP (default: CFG value)
 * @returns {object} Combat state
 */
export function createZombieCombat(hp = CFG.ZOMBIE?.hp ?? 6) {
	return {
		type: "zombie",
		x: 5,
		y: 5,
		hp,
	};
}

/**
 * Create a combat state for NPC combat
 * @param {string} emoji - NPC emoji
 * @param {object} overrides - Properties to override
 * @returns {object} Combat state
 */
export function createNpcCombat(emoji = "🧝🏿", overrides = {}) {
	const spec = CFG.NPCS?.[emoji] || { hp: 4, atk: 1 };
	return {
		type: "npc",
		target: {
			x: 5,
			y: 5,
			emoji,
			hp: spec.hp || 4,
			atk: spec.atk || 1,
			maxHp: spec.hp || 4,
			...overrides,
		},
	};
}

/**
 * Create a combat state for animal combat
 * @param {string} type - Animal type
 * @param {object} overrides - Properties to override
 * @returns {object} Combat state
 */
export function createAnimalCombat(type = "wolf", overrides = {}) {
	const spec = CFG.ANIMALS?.[type] || { hp: 3, atk: 1, emoji: "🐺" };
	return {
		type: "animal",
		target: {
			x: 5,
			y: 5,
			type,
			emoji: spec.emoji,
			hp: spec.hp || 3,
			atk: spec.atk || 1,
			passive: spec.passive !== false,
			...overrides,
		},
	};
}

/**
 * Get all hostile NPC types
 * @returns {string[]} Array of hostile NPC emojis
 */
export function getHostileNpcTypes() {
	return Object.keys(CFG.NPCS || {});
}

/**
 * Get all animal types
 * @returns {string[]} Array of animal type names
 */
export function getAnimalTypes() {
	return ["small", "big", "boar", "wolf", "eagle"].filter((t) => CFG.ANIMALS?.[t]);
}

/**
 * Get passive animal types
 * @returns {string[]} Array of passive animal type names
 */
export function getPassiveAnimalTypes() {
	return getAnimalTypes().filter((t) => CFG.ANIMALS?.[t]?.passive !== false);
}

/**
 * Get hostile animal types
 * @returns {string[]} Array of hostile animal type names
 */
export function getHostileAnimalTypes() {
	return getAnimalTypes().filter((t) => CFG.ANIMALS?.[t]?.passive === false);
}

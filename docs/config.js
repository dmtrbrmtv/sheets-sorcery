// ===== Sheets & Sorcery: Web Config =====
// Rebalanced per spec: Player 10 HP, 2 dmg, 1 def, 5 moves; Zombie 6 HP, 1-2 dmg, 70% acc

export const GRID_W = 26;
export const GRID_H = 32;
export const CELL_SIZE_PX = 42;

/** When true, map shows biome letters (G=grass, F=forest, P=field, M=mountain, W=water, S=shore) */
export const DEBUG_SHOW_BIOMES = false;

export const CFG = {
	FOG: { radius: 3, fogChar: "🌫️", baseEmpty: "⬜️" },
	BLOCKED: new Set(["🗿", "⛰️", "🌋"]),
	ROCKY_TILES: new Set(["🗿", "⛰️", "🌋"]),
	BLOCKED_NO_BOAT: new Set(["🌊", "🗿", "⛰️", "🌋"]),
	RESOURCES: {
		HUNT_TILES: new Set(["🦌", "🐗", "🐇"]),
		WOOD_TILES: new Set(["🌳", "🌲", "🌿", "🌱"]),
		WOOD_DEPLETED: "🌱",
		WOOD_REGEN_TO: "🌳",
		STONE_TILES: new Set(["🗻", "🪨", "🧱", "🕳️"]),
		STONE_DEPLETED: "🕳️",
		STONE_REGEN_TO: "🗻",
	},
	// Day-night cycle: day 20, dusk 10, night 10, dawn 10 steps. Movement is FREE (endless walking).
	PHASE_STEPS: { day: 20, dusk: 10, night: 10, dawn: 10 },
	REGEN_DAYS: { wood: 3, stone: 3, hunt: 2 },
	// Night phase = zombie damage +1
	ZOMBIE: {
		aliveTile: "🧟",
		graveTile: "🪦",
		respawnDays: 5,
		atk: 1, // base; damage 1-2 (rand 1-2)
		atkMax: 2,
		hp: 6,
		accuracy: 0.7, // 70% hit chance
		goldMin: 1,
		goldMax: 3,
		itemChance: 0.2,
		lootItems: ["💉", "🧪", "🗡️", "🛡️"],
	},
	RESPAWN: { hospitalA1: "D7" },
	// Village safe zone: (2,4) to (4,9) — houses, hospital, traders, quest givers
	VILLAGE: { xMin: 2, xMax: 4, yMin: 4, yMax: 9 },
	// Friendly hunters — roam forest, hunt animals only, avoid NPCs/zombies/hostile animals
	HUNTERS: {
		"👨🏻‍🦱": { name: "Охотник", tiles: new Set(["🌳", "🌲", "🌿", "🌱"]) },
		"🧔🏻‍♂️": { name: "Лесник", tiles: new Set(["🌳", "🌲", "🌿", "🌱"]) },
		"👩🏻‍🦱": { name: "Охотница", tiles: new Set(["🌳", "🌲", "🌿", "🌱"]) },
	},
	// Friendly villagers (spawn only in village, can talk)
	VILLAGERS: {
		"🧙‍♂️": { name: "Мастер квестов", role: "quest", dialog: "Ищу смельчаков для заданий. Готов помочь?" },
		"🧑‍🌾": { name: "Торговец", role: "trader", dialog: "Добро пожаловать! Есть дерево, камень — обменяю на золото." },
		"🧒": { name: "Хоббит", role: "resident", dialog: "Привет, путник! В деревне тихо и безопасно." },
		"👩‍🌾": { name: "Травница", role: "trader", dialog: "Травы и зелья — заходи, если нужно подлечиться." },
		"🧑‍💼": { name: "Купец", role: "trader", dialog: "Торгую всем понемногу. Удачной охоты!" },
	},
	BUILD: {
		HOUSE_COST: { wood: 5, stone: 3, gold: 2 },
		HOUSE_ALLOWED_TILES: new Set(["🪧"]),
		HOUSE_TILE: "🏡",
		HOME_POSITION: { x: 3, y: 9 },
	},
	HOME: {
		W: 10,
		H: 10,
		VEG_DAYS: 2,
		FRUIT_DAYS: 3,
		VEG_YIELD: [1, 2],
		FRUIT_YIELD: 1,
		PIG_FOOD_INTERVAL: 2,
		PIG_COST: { wood: 1 },
		PIG_MAX: 5,
	},
	ANIMALS: {
		small: {
			emoji: "🐇",
			tiles: new Set(["⬜️", "🌿"]),
			passive: true,
			hp: 1,
			atk: 0,
			name: "Заяц",
			loot: { food: [1, 1] },
		},
		big: {
			emoji: "🦌",
			tiles: new Set(["🌳", "🌲", "🌿"]),
			passive: true,
			hp: 2,
			atk: 0,
			name: "Олень",
			loot: { food: [1, 2] },
		},
		boar: {
			emoji: "🐗",
			tiles: new Set(["🌳", "🌲", "🌿"]),
			passive: true,
			hp: 2,
			atk: 1,
			name: "Кабан",
			loot: { food: [1, 2] },
		},
		wolf: {
			emoji: "🐺",
			tiles: new Set(["🌳", "🌲", "🌿"]),
			passive: false,
			hp: 8,
			atk: 2,
			name: "Волк",
			loot: { food: [2, 3], gold: [0, 1], special: 0.1 },
			effectOnHit: { bleeding: 0.3 },
		},
		eagle: {
			emoji: "🦅",
			tiles: new Set(["🗿", "⛰️", "🌋"]),
			passive: false,
			hp: 2,
			atk: 1,
			name: "Орёл",
			loot: { food: [1, 1], special: 0.05 },
		},
		maxCount: 6,
	},
	NPCS: {
		"🧝🏿": {
			name: "Тёмный эльф",
			tiles: new Set(["🌳", "🌲", "🌿"]),
			atk: 2,
			hp: 7,
			dodgeChance: 0.2,
			loot: { gold: [2, 4], special: 0.2 },
			effectOnHit: { poison: 0.15 },
		},
		"🧑🏾‍🌾": {
			name: "Заражённый фермер",
			tiles: new Set(["⬜️"]),
			atk: 1,
			hp: 4,
			spawnChance: 0.6,
			loot: { gold: [0, 2], food: [0, 1] },
			effectOnHit: { poison: 0.3 },
		},
		"🧙🏾‍♀️": {
			name: "Безумный маг",
			tiles: new Set(["🗿", "⛰️", "🌋"]),
			atk: 3,
			hp: 5,
			attacksFirst: true,
			loot: { gold: [3, 6], special: 0.25 },
			effectOnHit: { fear: 0.2 },
			boss: true,
		},
	},
	LOOT_SPECIAL: ["💉", "🧪", "🗡️", "🛡️", "🌿"],
	STATUS_EFFECTS: {
		bleeding: { icon: "🩸", name: "Кровотечение", dmg: 1, duration: 3 },
		poison: { icon: "☠️", name: "Яд", dmg: 1, duration: 2 },
		fear: { icon: "😱", name: "Страх", atkPenalty: 0.5, duration: 2 },
	},
	EVENTS: [
		{ text: "Купцы проезжают мимо — рынок оживает.", weight: 1 },
		{ text: "На горизонте видны тучи. Скоро дождь.", weight: 1 },
		{ text: "Странник оставил посылку у ворот.", weight: 0.5, loot: { gold: [0, 2] } },
		{ text: "Лесные звери особенно активны сегодня.", weight: 1 },
		{ text: "Кто-то поёт вдалеке. Успокаивающе.", weight: 0.8 },
		{ text: "Задание: найти 3🪵 в лесу. Награда: 2💰", weight: 0.6, quest: "wood3" },
		{ text: "Задание: принести 2🍖. Награда: 1💰", weight: 0.5, quest: "food2" },
		{ text: "Задание: добыть 2🪨. Награда: 1💰", weight: 0.5, quest: "stone2" },
		{ text: "Задание: поймать 3🐟. Награда: 2💰", weight: 0.4, quest: "fish3" },
	],
	QUESTS: {
		wood3: { objectives: { wood: 3 }, reward: { gold: 2 }, name: "3🪵 → 2💰" },
		food2: { objectives: { food: 2 }, reward: { gold: 1 }, name: "2🍖 → 1💰" },
		stone2: { objectives: { stone: 2 }, reward: { gold: 1 }, name: "2🪨 → 1💰" },
		fish3: { objectives: { fish: 3 }, reward: { gold: 2 }, name: "3🐟 → 2💰" },
	},
	BOAT: { cost: { wood: 3, stone: 1 }, item: "⛵" },
};

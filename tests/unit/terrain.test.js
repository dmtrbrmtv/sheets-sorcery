import { describe, expect, it } from "vitest";
import { getTerrainBg, getTerrainName, TERRAIN_BG, TERRAIN_NAMES } from "../../docs/terrain.js";

describe("terrain", () => {
	describe("getTerrainBg", () => {
		it("returns correct color for forest tiles", () => {
			expect(getTerrainBg("🌳")).toBe("#5a7a58");
			expect(getTerrainBg("🌲")).toBe("#4a6a50");
			expect(getTerrainBg("🌿")).toBe("#6a8a6a");
			expect(getTerrainBg("🌱")).toBe("#6b8a68");
		});

		it("returns correct color for water", () => {
			expect(getTerrainBg("🌊")).toBe("#8aa8b8");
		});

		it("returns correct color for mountains", () => {
			expect(getTerrainBg("🗻")).toBe("#8a8a82");
			expect(getTerrainBg("⛰️")).toBe("#8a8a82");
			expect(getTerrainBg("🌋")).toBe("#6a5a52");
		});

		it("returns correct color for stone tiles", () => {
			expect(getTerrainBg("🪨")).toBe("#8e8e86");
			expect(getTerrainBg("🧱")).toBe("#9a9a92");
			expect(getTerrainBg("🕳️")).toBe("#7a7a72");
		});

		it("returns correct color for buildings", () => {
			expect(getTerrainBg("🏠")).toBe("#a08870");
			expect(getTerrainBg("🏡")).toBe("#a08870");
			expect(getTerrainBg("🏥")).toBe("#b09878");
		});

		it("returns correct color for special tiles", () => {
			expect(getTerrainBg("🧟")).toBe("#5a6a58");
			expect(getTerrainBg("🪦")).toBe("#7a7a72");
		});

		it("returns default color for empty/plain tiles", () => {
			expect(getTerrainBg("⬜️")).toBe("#d4c8a8");
		});

		it("returns default color for null/undefined", () => {
			expect(getTerrainBg(null)).toBe("#d4c8a8");
			expect(getTerrainBg(undefined)).toBe("#d4c8a8");
		});

		it("returns default color for unknown tiles", () => {
			expect(getTerrainBg("❓")).toBe("#d4c8a8");
			expect(getTerrainBg("xyz")).toBe("#d4c8a8");
		});
	});

	describe("getTerrainName", () => {
		it("returns correct name for forest tiles", () => {
			expect(getTerrainName("🌳")).toBe("Лес");
			expect(getTerrainName("🌲")).toBe("Лес");
			expect(getTerrainName("🌿")).toBe("Поляна");
			expect(getTerrainName("🌱")).toBe("Пень");
		});

		it("returns correct name for water", () => {
			expect(getTerrainName("🌊")).toBe("Вода");
		});

		it("returns correct name for mountains", () => {
			expect(getTerrainName("🗻")).toBe("Гора");
			expect(getTerrainName("⛰️")).toBe("Гора");
			expect(getTerrainName("🌋")).toBe("Вулкан");
		});

		it("returns correct name for stone tiles", () => {
			expect(getTerrainName("🪨")).toBe("Камень");
			expect(getTerrainName("🧱")).toBe("Скала");
			expect(getTerrainName("🕳️")).toBe("Шахта");
		});

		it("returns correct name for buildings", () => {
			expect(getTerrainName("🏠")).toBe("Дом");
			expect(getTerrainName("🏡")).toBe("Дом");
			expect(getTerrainName("🏥")).toBe("Больница");
		});

		it("returns correct name for special tiles", () => {
			expect(getTerrainName("🧟")).toBe("Зомби");
			expect(getTerrainName("🪦")).toBe("Могила");
			expect(getTerrainName("🪧")).toBe("Дом мечты!!");
		});

		it("returns correct name for plain tile", () => {
			expect(getTerrainName("⬜️")).toBe("Поле");
		});

		it('returns "—" for null/undefined', () => {
			expect(getTerrainName(null)).toBe("—");
			expect(getTerrainName(undefined)).toBe("—");
		});

		it("returns truncated string for unknown tiles", () => {
			// Unknown tiles return first 2 chars or "—"
			expect(getTerrainName("❓")).toBe("❓");
		});
	});

	describe("TERRAIN_BG constant", () => {
		it("has entries for all common terrain types", () => {
			const expectedTiles = ["🌳", "🌲", "🌿", "🌱", "⬜️", "🌊", "🗻", "🪨", "🧱", "🏠", "🏡", "🏥", "🧟", "🪦"];
			for (const tile of expectedTiles) {
				expect(TERRAIN_BG[tile]).toBeDefined();
			}
		});

		it("all values are valid hex colors", () => {
			const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
			for (const [tile, color] of Object.entries(TERRAIN_BG)) {
				expect(color).toMatch(hexColorRegex);
			}
		});
	});

	describe("TERRAIN_NAMES constant", () => {
		it("has entries for all common terrain types", () => {
			const expectedTiles = ["🌳", "🌲", "🌿", "🌱", "⬜️", "🌊", "🗻", "🪨", "🧱", "🏠", "🏡", "🏥", "🧟", "🪦"];
			for (const tile of expectedTiles) {
				expect(TERRAIN_NAMES[tile]).toBeDefined();
			}
		});

		it("all values are non-empty strings", () => {
			for (const [tile, name] of Object.entries(TERRAIN_NAMES)) {
				expect(typeof name).toBe("string");
				expect(name.length).toBeGreaterThan(0);
			}
		});
	});
});

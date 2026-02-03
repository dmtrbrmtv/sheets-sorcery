import { describe, expect, it } from "vitest";
import { a1ToXY, baseTile, dirToDelta, randInt } from "../../docs/utils.js";

describe("utils", () => {
	describe("dirToDelta", () => {
		it("returns correct delta for North", () => {
			expect(dirToDelta("N")).toEqual({ dx: 0, dy: -1 });
		});

		it("returns correct delta for South", () => {
			expect(dirToDelta("S")).toEqual({ dx: 0, dy: 1 });
		});

		it("returns correct delta for East", () => {
			expect(dirToDelta("E")).toEqual({ dx: 1, dy: 0 });
		});

		it("returns correct delta for West", () => {
			expect(dirToDelta("W")).toEqual({ dx: -1, dy: 0 });
		});

		it("returns null for invalid direction", () => {
			expect(dirToDelta("X")).toBeNull();
			expect(dirToDelta("")).toBeNull();
			expect(dirToDelta(null)).toBeNull();
			expect(dirToDelta(undefined)).toBeNull();
		});

		it("is case-sensitive (lowercase returns null)", () => {
			expect(dirToDelta("n")).toBeNull();
			expect(dirToDelta("s")).toBeNull();
		});
	});

	describe("randInt", () => {
		it("returns a number within the range [a, b]", () => {
			for (let i = 0; i < 100; i++) {
				const result = randInt(1, 10);
				expect(result).toBeGreaterThanOrEqual(1);
				expect(result).toBeLessThanOrEqual(10);
			}
		});

		it("returns the only value when a equals b", () => {
			expect(randInt(5, 5)).toBe(5);
		});

		it("handles negative ranges", () => {
			for (let i = 0; i < 50; i++) {
				const result = randInt(-10, -5);
				expect(result).toBeGreaterThanOrEqual(-10);
				expect(result).toBeLessThanOrEqual(-5);
			}
		});

		it("handles ranges crossing zero", () => {
			for (let i = 0; i < 50; i++) {
				const result = randInt(-5, 5);
				expect(result).toBeGreaterThanOrEqual(-5);
				expect(result).toBeLessThanOrEqual(5);
			}
		});

		it("returns an integer", () => {
			for (let i = 0; i < 50; i++) {
				const result = randInt(1, 100);
				expect(Number.isInteger(result)).toBe(true);
			}
		});
	});

	describe("baseTile", () => {
		it("returns the first emoji from a string", () => {
			expect(baseTile("🌳")).toBe("🌳");
			expect(baseTile("🌊")).toBe("🌊");
		});

		it("returns empty tile for null/undefined", () => {
			expect(baseTile(null)).toBe("⬜️");
			expect(baseTile(undefined)).toBe("⬜️");
		});

		it("returns empty tile for empty string", () => {
			expect(baseTile("")).toBe("⬜️");
			expect(baseTile("   ")).toBe("⬜️");
		});

		it("handles variation selector (FE0F)", () => {
			// Some emojis have a variation selector
			expect(baseTile("⬜️")).toBe("⬜️");
		});

		it("extracts first emoji from multi-character string", () => {
			// Should just get the first grapheme
			const result = baseTile("🌳🌊");
			expect(result).toBe("🌳");
		});

		it("converts numbers to tiles", () => {
			expect(baseTile(123)).toBe("1");
		});
	});

	describe("a1ToXY", () => {
		it("converts A1 notation to x,y coordinates", () => {
			// Grid starts at C3 = (1,1), so D7 = (2,5) in absolute, but relative:
			// D = column 4, row 7 => x = 4-2 = 2, y = 7-2 = 5
			expect(a1ToXY("D7")).toEqual({ x: 2, y: 5 });
		});

		it("handles single letter columns", () => {
			expect(a1ToXY("C3")).toEqual({ x: 1, y: 1 });
			expect(a1ToXY("C4")).toEqual({ x: 1, y: 2 });
		});

		it("handles double letter columns", () => {
			// AA = 27, so AA3 would be (27-2, 3-2) = (25, 1)
			expect(a1ToXY("AA3")).toEqual({ x: 25, y: 1 });
		});

		it("returns null for invalid input", () => {
			expect(a1ToXY("")).toBeNull();
			expect(a1ToXY(null)).toBeNull();
			expect(a1ToXY(undefined)).toBeNull();
			expect(a1ToXY("123")).toBeNull();
			expect(a1ToXY("ABC")).toBeNull();
		});

		it("is case-insensitive", () => {
			expect(a1ToXY("d7")).toEqual({ x: 2, y: 5 });
			expect(a1ToXY("D7")).toEqual({ x: 2, y: 5 });
		});
	});
});

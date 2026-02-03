// Test helpers for mocking random behavior

import { vi } from "vitest";

/**
 * Mock Math.random to return predictable values
 * @param {number|number[]} values - Value(s) to return (0-1 range)
 * @returns {function} Cleanup function to restore Math.random
 */
export function mockRandom(values) {
	const original = Math.random;
	const valueArray = Array.isArray(values) ? values : [values];
	let index = 0;

	vi.spyOn(Math, "random").mockImplementation(() => {
		const value = valueArray[index % valueArray.length];
		index++;
		return value;
	});

	return () => {
		vi.spyOn(Math, "random").mockImplementation(original);
	};
}

/**
 * Mock random to always succeed (return 0)
 * @returns {function} Cleanup function
 */
export function mockRandomSuccess() {
	return mockRandom(0);
}

/**
 * Mock random to always fail (return 0.99)
 * @returns {function} Cleanup function
 */
export function mockRandomFail() {
	return mockRandom(0.99);
}

/**
 * Mock random for probability checks
 * @param {boolean} shouldPass - Whether the probability check should pass
 * @returns {function} Cleanup function
 */
export function mockProbability(shouldPass) {
	return mockRandom(shouldPass ? 0 : 0.99);
}

/**
 * Mock random for a specific probability threshold
 * @param {number} threshold - Probability threshold (0-1)
 * @param {boolean} shouldPass - Whether to pass the check
 * @returns {function} Cleanup function
 */
export function mockProbabilityThreshold(threshold, shouldPass) {
	// For checks like `Math.random() < threshold`, we want:
	// - Pass: return a value less than threshold
	// - Fail: return a value >= threshold
	const value = shouldPass ? threshold - 0.01 : threshold + 0.01;
	return mockRandom(Math.max(0, Math.min(0.99, value)));
}

/**
 * Mock random for randInt calls
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} desiredResult - The result you want randInt to return
 * @returns {function} Cleanup function
 */
export function mockRandInt(min, max, desiredResult) {
	// randInt(a, b) = Math.floor(Math.random() * (b - a + 1)) + a
	// To get desiredResult: Math.random() must return (desiredResult - min) / (max - min + 1)
	const range = max - min + 1;
	const value = (desiredResult - min) / range;
	return mockRandom(value);
}

/**
 * Create a sequence of random values for complex scenarios
 * @param {...number} values - Sequence of random values
 * @returns {function} Cleanup function
 */
export function mockRandomSequence(...values) {
	return mockRandom(values);
}

/**
 * Reset all random mocks
 */
export function resetRandomMocks() {
	vi.restoreAllMocks();
}

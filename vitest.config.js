import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.js"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["docs/**/*.js"],
			exclude: ["docs/game.js", "docs/world_base.js", "docs/procedural.js"],
			thresholds: {
				statements: 70,
				branches: 60,
				functions: 75,
				lines: 70,
			},
		},
	},
});

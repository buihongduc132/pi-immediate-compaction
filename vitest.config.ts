import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			thresholds: {
				lines: 80,
				branches: 65,
				functions: 75,
				statements: 80,
			},
			include: [
				"config.ts",
				"coordinator.ts",
				"delivery-policy.ts",
				"state.ts",
				"usage-cache.ts",
				"thresholds/*.ts",
			],
			exclude: ["index.ts", "types.ts", "engine/types.ts"],
		},
	},
});

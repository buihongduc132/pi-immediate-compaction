import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import type { ImmediateCompactionConfig } from "./types";

const DEFAULT_CONTEXT_WINDOW = 190_000;
const DEFAULT_RESERVE_TOKENS = 16_384;

export const DEFAULT_CONFIG: ImmediateCompactionConfig = {
	enabled: true,
	triggerMode: "arm-during-streaming",
	cooldown: {
		minMsBetweenCompactions: 15_000,
		requirePercentIncreaseBeforeRetrigger: 1,
	},
	immediate: {
		enabled: true,
		offsetPercentFromAuto: 1,
		customInstructions:
			"Preserve active code changes, pending tasks, and exact next actions.",
		postCompactPrompt:
			"Continue immediately from the compacted state and resume the highest-priority unfinished work.",
		deliverAs: "followUp",
		triggerTurn: true,
	},
	overflow: {
		enabled: true,
		percent: 100,
		customInstructions:
			"Preserve only critical continuation context for safe recovery.",
		postCompactPrompt:
			"Context overflow threshold was exceeded. Continue with strict brevity and finish the active objective before expanding scope.",
		deliverAs: "followUp",
		triggerTurn: true,
	},
	engine: {
		kind: "auto",
		command: null,
	},
};

function deepMerge<T>(base: T, override: Partial<T> | null | undefined): T {
	if (!override) return structuredClone(base);
	if (Array.isArray(base) || Array.isArray(override)) {
		return structuredClone(override as T);
	}
	if (
		base &&
		override &&
		typeof base === "object" &&
		typeof override === "object"
	) {
		const result: Record<string, unknown> = {
			...(base as Record<string, unknown>),
		};
		for (const [key, value] of Object.entries(
			override as Record<string, unknown>,
		)) {
			const current = (base as Record<string, unknown>)[key];
			if (
				current &&
				value &&
				typeof current === "object" &&
				typeof value === "object" &&
				!Array.isArray(current) &&
				!Array.isArray(value)
			) {
				result[key] = deepMerge(current, value);
			} else {
				result[key] = structuredClone(value);
			}
		}
		return result as T;
	}
	return structuredClone(override as T);
}

function loadJson(path: string): Partial<ImmediateCompactionConfig> | null {
	if (!existsSync(path)) return null;
	try {
		const raw = readFileSync(path, "utf-8").trim();
		if (!raw) return null;
		return JSON.parse(raw) as Partial<ImmediateCompactionConfig>;
	} catch (error) {
		console.error("[immediate-compaction/config] loadJson failed:", error);
		return null;
	}
}

export function computeAutoCompactPercent(input: {
	contextWindow?: number;
	reserveTokens?: number;
}): number {
	const contextWindow = input.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
	const reserveTokens = input.reserveTokens ?? DEFAULT_RESERVE_TOKENS;
	if (contextWindow <= 0) return 0;
	return ((contextWindow - reserveTokens) / contextWindow) * 100;
}

export function computeImmediatePercent(input: {
	contextWindow?: number;
	reserveTokens?: number;
	offsetPercentFromAuto?: number;
}): number {
	return (
		computeAutoCompactPercent(input) + (input.offsetPercentFromAuto ?? 1)
	);
}

export const deriveAutoCompactPercent = computeAutoCompactPercent;
export const calculateAutoCompactPercent = computeAutoCompactPercent;

export function loadConfig(cwd: string): ImmediateCompactionConfig & {
	autoCompactPercent: number;
} {
	const globalPath = resolve(homedir(), ".pi", "immediate-compaction.json");
	const projectPath = resolve(cwd, ".pi", "immediate-compaction.json");
	const merged = deepMerge(
		deepMerge(DEFAULT_CONFIG, loadJson(globalPath)),
		loadJson(projectPath),
	);
	return {
		...merged,
		autoCompactPercent: computeAutoCompactPercent({}),
	};
}

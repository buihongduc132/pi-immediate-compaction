import { DEFAULT_CONFIG } from "./config";
import { createCoordinatorState } from "./state";
import type {
	CoordinatorState,
	ImmediateCompactionConfig,
	UsageSnapshot,
} from "./types";
import { updateUsageSnapshot } from "./usage-cache";
import { evaluateImmediateThreshold } from "./thresholds/immediate";
import { evaluateOverflowThreshold } from "./thresholds/overflow";

export class CompactionCoordinator {
	private readonly config: ImmediateCompactionConfig & { autoCompactPercent?: number };
	private readonly runtime: {
		isStreaming: () => boolean;
		now: () => number;
		requestCompaction: (request: Record<string, unknown>) => void;
		deliverPrompt?: () => void;
	};
	private readonly current = createCoordinatorState();

	constructor(
		config: ImmediateCompactionConfig & { autoCompactPercent?: number },
		runtime: {
			isStreaming: () => boolean;
			now: () => number;
			requestCompaction: (request: Record<string, unknown>) => void;
			deliverPrompt?: () => void;
		},
	) {
		this.config = config;
		this.runtime = runtime;
	}

	get state(): CoordinatorState["phase"] {
		return this.current.phase;
	}

	get awaitingFreshUsage(): boolean {
		return this.current.awaitingFreshUsage;
	}

	get details(): CoordinatorState {
		return this.current;
	}

	evaluate(
		snapshot: UsageSnapshot,
		state: CoordinatorState = this.current,
		autoCompactPercent = this.config.autoCompactPercent ?? 91.37684210526316,
	): { triggered: boolean; state: string; reason?: string } | null {
		if (!snapshot.valid || state.awaitingFreshUsage) {
			return null;
		}
		if (state.inFlight) {
			return { triggered: false, state: state.phase };
		}
		const config = { ...this.config, autoCompactPercent };
		const decision =
			evaluateImmediateThreshold(snapshot, config, state) ??
			evaluateOverflowThreshold(snapshot, config, state);
		if (!decision) {
			state.lastPercent = snapshot.percent;
			return { triggered: false, state: state.phase, reason: "no-threshold-cross" };
		}
		state.inFlight = true;
		state.phase = "compacting";
		state.lastTriggeredKind = decision.kind;
		state.lastTriggeredPercent = snapshot.percent;
		state.lastTriggeredAt = this.runtime.now();
		this.runtime.requestCompaction({ decision, snapshot });
		return { triggered: true, state: state.phase };
	}

	handleSessionCompact(state: CoordinatorState = this.current): void {
		state.inFlight = false;
		state.awaitingFreshUsage = true;
		state.phase = "awaiting_fresh_usage";
		state.compactionEpoch += 1;
		state.cooldownUntil =
			this.runtime.now() + this.config.cooldown.minMsBetweenCompactions;
	}

	handleFreshUsage(
		state: CoordinatorState = this.current,
		usage: { percent?: number | null },
	): void {
		state.lastPercent = usage.percent ?? null;
		state.awaitingFreshUsage = false;
		if (state.phase === "awaiting_fresh_usage") {
			state.phase = "idle";
		}
	}

	markCompactionFinished(input: { now: number; cooldownMs: number }): void {
		this.current.inFlight = false;
		this.current.awaitingFreshUsage = true;
		this.current.phase = "awaiting_fresh_usage";
		this.current.compactionEpoch += 1;
		this.current.cooldownUntil = input.now + input.cooldownMs;
	}
}

export function createCoordinator(
	pi?: { appendEntry?: (type: string, data: unknown) => void },
	ctx?: {
		sessionManager?: { getSessionFile?: () => string };
		getContextUsage?: () => {
			percent?: number | null;
			tokens?: number | null;
			contextWindow?: number | null;
		};
		compact?: (request: { onComplete?: () => void; onError?: (error: Error) => void }) => void;
	},
	config: ImmediateCompactionConfig & { autoCompactPercent?: number } = DEFAULT_CONFIG,
) {
	const sessionId = ctx?.sessionManager?.getSessionFile?.() ?? "session";
	const coordinator = new CompactionCoordinator(config, {
		isStreaming: () => false,
		now: () => Date.now(),
		requestCompaction: () => undefined,
	});

	return {
		get state() {
			return coordinator.state;
		},
		get details() {
			return coordinator.details;
		},
		get awaitingFreshUsage() {
			return coordinator.awaitingFreshUsage;
		},
		get inFlight() {
			return coordinator.details.inFlight;
		},
		handleSessionCompact(targetState = coordinator.details) {
			coordinator.handleSessionCompact(targetState);
		},
		handleFreshUsage(
			targetState = coordinator.details,
			usage?: { percent?: number | null },
		) {
			coordinator.handleFreshUsage(targetState, usage ?? {});
		},
		evaluate(
			snapshot: UsageSnapshot,
			targetState = coordinator.details,
			autoCompactPercent = config.autoCompactPercent ?? 91.37684210526316,
		) {
			return coordinator.evaluate(snapshot, targetState, autoCompactPercent);
		},
		getState() {
			return {
				...coordinator.details,
				mode: coordinator.state,
			};
		},
		refreshUsage(usage: {
			percent?: number | null;
			tokens?: number | null;
			contextWindow?: number | null;
		}) {
			const snapshot = updateUsageSnapshot(sessionId, {
				valid:
					typeof usage.percent === "number" &&
					typeof usage.tokens === "number",
				percent: usage.percent ?? null,
				tokens: usage.tokens ?? null,
				contextWindow: usage.contextWindow ?? null,
				source: "assistant-usage",
			});
			if (snapshot.valid) coordinator.handleFreshUsage(coordinator.details, snapshot);
			return snapshot;
		},
		markCompacted() {
			coordinator.markCompactionFinished({
				now: Date.now(),
				cooldownMs: config.cooldown.minMsBetweenCompactions,
			});
		},
		async sampleAndMaybeCompact() {
			const usage = ctx?.getContextUsage?.() ?? {
				percent: null,
				tokens: null,
				contextWindow: null,
			};
			const snapshot = this.refreshUsage(usage);
			if (
				coordinator.awaitingFreshUsage ||
				coordinator.details.inFlight ||
				!snapshot.valid
			) {
				return;
			}
			const result = coordinator.evaluate(snapshot);
			if (!result?.triggered) return;
			ctx?.compact?.({
				onComplete: () => this.markCompacted(),
				onError: () => {
					coordinator.details.inFlight = false;
					coordinator.details.phase = "error";
				},
			});
		},
	};
}

export function maybeTriggerCompaction(
	coordinator: ReturnType<typeof createCoordinator> | CoordinatorState,
	input: {
		config: ImmediateCompactionConfig & { autoCompactPercent?: number };
		snapshot: UsageSnapshot;
		engine: { requestCompaction: (snapshot: UsageSnapshot) => void };
		isStreaming: boolean;
	},
): { triggered: boolean; state: string; reason?: string } {
	const state = "phase" in coordinator ? coordinator : coordinator.details;
	const awaitingFreshUsage =
		"phase" in coordinator ? coordinator.awaitingFreshUsage : coordinator.awaitingFreshUsage;
	if (!input.snapshot.valid || awaitingFreshUsage) {
		return { triggered: false, state: state.phase, reason: "awaiting-fresh-usage" };
	}
	if (state.inFlight) {
		return { triggered: false, state: state.phase };
	}
	const decision =
		evaluateImmediateThreshold(input.snapshot, input.config, state) ??
		evaluateOverflowThreshold(input.snapshot, input.config, state);
	if (!decision) {
		state.lastPercent = input.snapshot.percent;
		return { triggered: false, state: state.phase, reason: "no-threshold-cross" };
	}
	state.inFlight = true;
	state.phase = "compacting";
	state.lastTriggeredKind = decision.kind;
	state.lastTriggeredPercent = input.snapshot.percent;
	state.lastTriggeredAt = Date.now();
	input.engine.requestCompaction(input.snapshot);
	return { triggered: true, state: state.phase };
}

export function markCompactionFinished(
	coordinator: ReturnType<typeof createCoordinator> | CompactionCoordinator | CoordinatorState,
	input: { now: number; cooldownMs: number },
): void {
	if (coordinator instanceof CompactionCoordinator) {
		coordinator.markCompactionFinished(input);
		return;
	}
	const state = "phase" in coordinator ? coordinator : coordinator.details;
	state.inFlight = false;
	state.awaitingFreshUsage = true;
	state.phase = "awaiting_fresh_usage";
	state.compactionEpoch += 1;
	state.cooldownUntil = input.now + input.cooldownMs;
}

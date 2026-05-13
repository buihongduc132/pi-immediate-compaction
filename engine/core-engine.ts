import type { CompactionEngine } from "./types";

export const coreCompactionEngine: CompactionEngine = {
	id: "core",
	async detect() {
		return true;
	},
	requestCompaction(ctx, request) {
		ctx.compact(request);
	},
};

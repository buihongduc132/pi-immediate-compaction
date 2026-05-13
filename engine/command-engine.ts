import type { CompactionEngine } from "./types";

export const commandCompactionEngine: CompactionEngine = {
	id: "command",
	async detect() {
		return false;
	},
	requestCompaction(ctx, request) {
		ctx.compact(request);
	},
};

export interface CompactionRequest {
	customInstructions?: string;
	onComplete?: () => void;
	onError?: (error: Error) => void;
}

export interface CompactionContextLike {
	compact: (request: CompactionRequest) => void;
}

export interface CompactionEngine {
	id: string;
	detect(ctx: unknown): Promise<boolean>;
	requestCompaction(ctx: CompactionContextLike, request: CompactionRequest): void;
}

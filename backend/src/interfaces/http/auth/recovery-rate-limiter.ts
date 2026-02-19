type Bucket = {
	count: number;
	resetAtMs: number;
};

export class RecoveryRateLimiter {
	private readonly buckets = new Map<string, Bucket>();

	constructor(
		private readonly maxAttempts: number,
		private readonly windowMs: number
	) {}

	consume(key: string, nowMs = Date.now()): boolean {
		const current = this.buckets.get(key);
		if (!current || current.resetAtMs <= nowMs) {
			this.buckets.set(key, { count: 1, resetAtMs: nowMs + this.windowMs });
			return true;
		}

		if (current.count >= this.maxAttempts) {
			return false;
		}

		current.count += 1;
		return true;
	}
}


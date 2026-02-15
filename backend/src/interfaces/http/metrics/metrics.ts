type RouteMetrics = {
	count: number;
	errors4xx: number;
	errors5xx: number;
	totalDurationMs: number;
	samples: number[];
};

type MetricsStore = {
	startedAt: number;
	totalCount: number;
	errors4xx: number;
	errors5xx: number;
	routes: Record<string, RouteMetrics>;
};

const MAX_SAMPLES = 200;

const store: MetricsStore = {
	startedAt: Date.now(),
	totalCount: 0,
	errors4xx: 0,
	errors5xx: 0,
	routes: {},
};

function getOrCreateRoute(key: string): RouteMetrics {
	store.routes[key] ??= {
		count: 0,
		errors4xx: 0,
		errors5xx: 0,
		totalDurationMs: 0,
		samples: [],
	};
	return store.routes[key];
}

function pushSample(route: RouteMetrics, durationMs: number) {
	route.samples.push(durationMs);
	if (route.samples.length > MAX_SAMPLES) {
		route.samples.shift();
	}
}

function percentile(samples: number[], p: number): number {
	if (samples.length === 0) {
		return 0;
	}
	const sorted = [...samples].sort((a, b) => a - b);
	const idx = Math.max(0, Math.ceil(sorted.length * p) - 1);
	return sorted[idx] ?? 0;
}

export function recordRequest(params: {
	method: string;
	route: string;
	statusCode: number;
	durationMs: number;
}) {
	store.totalCount += 1;
	if (params.statusCode >= 500) {
		store.errors5xx += 1;
	} else if (params.statusCode >= 400) {
		store.errors4xx += 1;
	}

	const key = `${params.method.toUpperCase()} ${params.route}`;
	const route = getOrCreateRoute(key);
	route.count += 1;
	if (params.statusCode >= 500) {
		route.errors5xx += 1;
	} else if (params.statusCode >= 400) {
		route.errors4xx += 1;
	}
	route.totalDurationMs += params.durationMs;
	pushSample(route, params.durationMs);
}

export function getMetricsSnapshot() {
	const uptimeSeconds = Math.floor((Date.now() - store.startedAt) / 1000);
	const routes = Object.fromEntries(
		Object.entries(store.routes).map(([key, route]) => {
			const avg = route.count ? route.totalDurationMs / route.count : 0;
			return [
				key,
				{
					count: route.count,
					errors4xx: route.errors4xx,
					errors5xx: route.errors5xx,
					avgMs: Number(avg.toFixed(2)),
					p95Ms: percentile(route.samples, 0.95),
				},
			];
		})
	);

	return {
		startedAt: store.startedAt,
		uptimeSeconds,
		totals: {
			count: store.totalCount,
			errors4xx: store.errors4xx,
			errors5xx: store.errors5xx,
		},
		routes,
	};
}

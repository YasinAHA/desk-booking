import type {
	RuntimeAppSettingsSnapshot,
	RuntimeAppSettingsStore as RuntimeAppSettingsStorePort,
} from "@application/common/ports/runtime-app-settings-store.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type RuntimeSettingsRow = {
	checkin_window_minutes: number;
	default_reservation_duration_minutes: number;
};

function isRuntimeSettingsRow(value: unknown): value is RuntimeSettingsRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		typeof row.checkin_window_minutes === "number" &&
		typeof row.default_reservation_duration_minutes === "number"
	);
}

const DEFAULT_SNAPSHOT: RuntimeAppSettingsSnapshot = {
	checkinWindowMinutes: 15,
	defaultReservationDurationMinutes: 480,
};

export class RuntimeAppSettingsStore implements RuntimeAppSettingsStorePort {
	private snapshot: RuntimeAppSettingsSnapshot = DEFAULT_SNAPSHOT;

	private constructor(private readonly db: DbClient) {}

	static async create(db: DbClient): Promise<RuntimeAppSettingsStore> {
		const store = new RuntimeAppSettingsStore(db);
		await store.refresh();
		return store;
	}

	get(): RuntimeAppSettingsSnapshot {
		return this.snapshot;
	}

	apply(snapshot: Partial<RuntimeAppSettingsSnapshot>): void {
		this.snapshot = {
			...this.snapshot,
			...snapshot,
		};
	}

	async refresh(): Promise<RuntimeAppSettingsSnapshot> {
		const result = await this.db.query(
			"select checkin_window_minutes, default_reservation_duration_minutes " +
				"from app_settings where scope_type = 'global' limit 1"
		);
		const row = result.rows[0];
		if (!isRuntimeSettingsRow(row)) {
			this.snapshot = DEFAULT_SNAPSHOT;
			return this.snapshot;
		}
		this.snapshot = {
			checkinWindowMinutes: row.checkin_window_minutes,
			defaultReservationDurationMinutes: row.default_reservation_duration_minutes,
		};
		return this.snapshot;
	}
}

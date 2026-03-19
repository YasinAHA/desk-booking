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

const ENSURE_GLOBAL_SETTINGS_SQL =
	"insert into app_settings (scope_type, allow_self_registration, guest_mode_enabled, checkin_window_minutes, " +
		"max_advance_days, max_reservations_per_user, cancellation_deadline_minutes, default_reservation_duration_minutes, " +
		"business_hours_start, business_hours_end) " +
		"values ('global', true, true, 15, 7, 1, 120, 480, '08:00', '20:00') on conflict do nothing";

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
		await this.db.query(ENSURE_GLOBAL_SETTINGS_SQL);
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

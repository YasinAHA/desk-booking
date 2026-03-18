import type {
	AdminAuditLogFilters,
	AdminReportFilters,
	AdminRepository,
	AdminReservationFilters,
	AdminReservationRecord,
	AdminReservationStatus,
	AdminSettings,
	AdminSettingsPatch,
	AuditLogReport,
	CancellationsReport,
	CreateAdminReservationInput,
	NoShowReport,
	OccupancyReport,
	SummaryReport,
} from "@application/admin/ports/admin-repository.js";
import type { RuntimeAppSettingsStore } from "@application/common/ports/runtime-app-settings-store.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type AppSettingsRow = {
	id: string;
	allow_self_registration: boolean;
	guest_mode_enabled: boolean;
	checkin_window_minutes: number;
	max_advance_days: number;
	max_reservations_per_user: number;
	cancellation_deadline_minutes: number;
	default_reservation_duration_minutes: number;
	business_hours_start: string;
	business_hours_end: string;
	allowed_email_domains: string[];
};

function isAppSettingsRow(value: unknown): value is AppSettingsRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.allow_self_registration === "boolean" &&
		typeof row.guest_mode_enabled === "boolean" &&
		typeof row.checkin_window_minutes === "number" &&
		typeof row.max_advance_days === "number" &&
		typeof row.max_reservations_per_user === "number" &&
		typeof row.cancellation_deadline_minutes === "number" &&
		typeof row.default_reservation_duration_minutes === "number" &&
		typeof row.business_hours_start === "string" &&
		typeof row.business_hours_end === "string" &&
		Array.isArray(row.allowed_email_domains)
	);
}

function mapSettings(row: AppSettingsRow): AdminSettings {
	return {
		id: row.id,
		allowSelfRegistration: row.allow_self_registration,
		guestModeEnabled: row.guest_mode_enabled,
		checkinWindowMinutes: row.checkin_window_minutes,
		maxAdvanceDays: row.max_advance_days,
		maxReservationsPerUser: row.max_reservations_per_user,
		cancellationDeadlineMinutes: row.cancellation_deadline_minutes,
		defaultReservationDurationMinutes: row.default_reservation_duration_minutes,
		businessHoursStart: row.business_hours_start,
		businessHoursEnd: row.business_hours_end,
		allowedEmailDomains: row.allowed_email_domains,
	};
}

function toStringOrNull(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function toStringOrEmpty(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function toNumberOrZero(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

const SETTINGS_UPDATE_COLUMNS: Record<Exclude<keyof AdminSettingsPatch, "allowedEmailDomains">, string> = {
	allowSelfRegistration: "allow_self_registration",
	guestModeEnabled: "guest_mode_enabled",
	checkinWindowMinutes: "checkin_window_minutes",
	maxAdvanceDays: "max_advance_days",
	maxReservationsPerUser: "max_reservations_per_user",
	cancellationDeadlineMinutes: "cancellation_deadline_minutes",
	defaultReservationDurationMinutes: "default_reservation_duration_minutes",
	businessHoursStart: "business_hours_start",
	businessHoursEnd: "business_hours_end",
};

export class PgAdminRepository implements AdminRepository {
	constructor(
		private readonly db: DbClient,
		private readonly runtimeSettingsStore?: RuntimeAppSettingsStore
	) {}

	private async readGlobalSettings(): Promise<AdminSettings> {
		const result = await this.db.query(
			"select s.id, s.allow_self_registration, s.guest_mode_enabled, s.checkin_window_minutes, " +
				"s.max_advance_days, s.max_reservations_per_user, s.cancellation_deadline_minutes, " +
				"s.default_reservation_duration_minutes, s.business_hours_start::text, s.business_hours_end::text, " +
				"coalesce(array_agg(aed.domain::text order by aed.domain) filter (where aed.domain is not null), '{}') as allowed_email_domains " +
				"from app_settings s " +
				"left join allowed_email_domains aed on aed.app_settings_id = s.id " +
				"where s.scope_type = 'global' " +
				"group by s.id " +
				"limit 1"
		);
		const row = result.rows[0];
		if (!isAppSettingsRow(row)) {
			throw new Error("Global app_settings row not found");
		}
		return mapSettings(row);
	}

	async getGlobalSettings(): Promise<AdminSettings> {
		return this.readGlobalSettings();
	}

	async updateGlobalSettings(patch: AdminSettingsPatch): Promise<AdminSettings> {
		const current = await this.readGlobalSettings();
		const updates: string[] = [];
		const params: unknown[] = [];
		let index = 1;

		for (const [key, column] of Object.entries(SETTINGS_UPDATE_COLUMNS) as Array<
			[keyof typeof SETTINGS_UPDATE_COLUMNS, string]
		>) {
			const value = patch[key];
			if (value === undefined) {
				continue;
			}
			updates.push(`${column} = $${index}`);
			params.push(value);
			index += 1;
		}

		if (updates.length > 0) {
			params.push(current.id);
			await this.db.query(
				`update app_settings set ${updates.join(", ")}, updated_at = now() where id = $${index}`,
				params
			);
		}

		if (patch.allowedEmailDomains) {
			const normalized = [...new Set(
				patch.allowedEmailDomains
					.map(domain => domain.trim().toLowerCase())
					.filter(domain => domain.length > 0)
			)];
			await this.db.query("delete from allowed_email_domains where app_settings_id = $1", [
				current.id,
			]);
			for (const domain of normalized) {
				await this.db.query(
					"insert into allowed_email_domains (app_settings_id, domain) values ($1, $2)",
					[current.id, domain]
				);
			}
		}

		const updated = await this.readGlobalSettings();
		this.runtimeSettingsStore?.apply({
			checkinWindowMinutes: updated.checkinWindowMinutes,
			defaultReservationDurationMinutes: updated.defaultReservationDurationMinutes,
		});
		return updated;
	}

	async listReservations(filters: AdminReservationFilters): Promise<AdminReservationRecord[]> {
		const params: unknown[] = [];
		const where: string[] = [];
		let index = 1;

		if (filters.start) {
			where.push(`r.starts_at >= $${index}::timestamptz`);
			params.push(filters.start);
			index += 1;
		}
		if (filters.end) {
			where.push(`r.starts_at <= $${index}::timestamptz`);
			params.push(filters.end);
			index += 1;
		}
		if (filters.status) {
			where.push(`r.status = $${index}`);
			params.push(filters.status);
			index += 1;
		}
		if (filters.officeId) {
			where.push(`r.office_id = $${index}::uuid`);
			params.push(filters.officeId);
		}

		const whereSql = where.length > 0 ? `where ${where.join(" and ")}` : "";
		const result = await this.db.query(
			"select r.id::text as id, r.reservation_type, r.user_id::text as user_id, r.host_user_id::text as host_user_id, " +
				"r.desk_id::text as desk_id, r.office_id::text as office_id, r.starts_at::text as starts_at, r.ends_at::text as ends_at, " +
				"r.status, r.source, r.guest_name, r.guest_email::text as guest_email, r.guest_company " +
				"from reservations r " +
				`${whereSql} ` +
				"order by r.starts_at desc",
			params
		);

		return result.rows.map(row => {
			const value = row as Record<string, unknown>;
			return {
				id: toStringOrEmpty(value.id),
				reservationType: value.reservation_type === "guest" ? "guest" : "internal",
				userId: toStringOrNull(value.user_id),
				hostUserId: toStringOrNull(value.host_user_id),
				deskId: toStringOrEmpty(value.desk_id),
				officeId: toStringOrEmpty(value.office_id),
				startsAt: toStringOrEmpty(value.starts_at),
				endsAt: toStringOrEmpty(value.ends_at),
				status: (toStringOrNull(value.status) ?? "reserved") as AdminReservationStatus,
				source: (toStringOrNull(value.source) ?? "admin") as
					| "user"
					| "admin"
					| "walk_in"
					| "system",
				guestName: toStringOrNull(value.guest_name),
				guestEmail: toStringOrNull(value.guest_email),
				guestCompany: toStringOrNull(value.guest_company),
			};
		});
	}

	async createReservation(input: CreateAdminReservationInput): Promise<string> {
		const source = input.source ?? "admin";
		const runtime = this.runtimeSettingsStore?.get();
		const checkinWindowMinutes = runtime?.checkinWindowMinutes ?? 15;
		const result = await this.db.query(
			"insert into reservations (" +
				"reservation_type, user_id, host_user_id, desk_id, office_id, starts_at, ends_at, checkin_deadline_at, source, " +
				"guest_name, guest_email, guest_company" +
			") values (" +
				"$1, $2::uuid, $3::uuid, $4::uuid, coalesce($5::uuid, (select office_id from desks where id = $4::uuid)), " +
				"$6::timestamptz, $7::timestamptz, ($6::timestamptz + make_interval(mins => $12::int)), " +
				"$8, $9, $10, $11" +
			") returning id::text as id",
			[
				input.reservationType,
				input.userId ?? null,
				input.hostUserId ?? null,
				input.deskId,
				input.officeId ?? null,
				input.startsAt,
				input.endsAt,
				source,
				input.guestName ?? null,
				input.guestEmail ?? null,
				input.guestCompany ?? null,
				checkinWindowMinutes,
			]
		);
		const row = result.rows[0] as { id?: unknown } | undefined;
		if (typeof row?.id !== "string") {
			throw new Error("Reservation creation failed");
		}
		return row.id;
	}

	async updateReservationStatus(
		reservationId: string,
		status: AdminReservationStatus
	): Promise<boolean> {
		const statusSqlByTarget: Record<AdminReservationStatus, string> = {
			reserved: "status = 'reserved', cancelled_at = null, checked_in_at = null, no_show_at = null",
			checked_in: "status = 'checked_in', checked_in_at = now()",
			cancelled: "status = 'cancelled', cancelled_at = now()",
			no_show: "status = 'no_show', no_show_at = now()",
		};
		const result = await this.db.query(
			`update reservations set ${statusSqlByTarget[status]}, updated_at = now() where id = $1::uuid`,
			[reservationId]
		);
		return (result.rowCount ?? 0) > 0;
	}

	async getOccupancyReport(filters: AdminReportFilters): Promise<OccupancyReport> {
		const result = await this.db.query(
			"with day_span as (" +
				"select greatest(1, ($2::date - $1::date + 1))::int as total_days" +
			"), desks_scope as (" +
				"select d.id, d.code, z.name as zone_name from desks d " +
				"left join zones z on z.id = d.zone_id " +
				"where d.status = 'active' and ($3::uuid is null or d.office_id = $3::uuid)" +
			"), occupied as (" +
				"select r.desk_id, count(*)::int as occupied_slots " +
				"from reservations r " +
				"join offices o on o.id = r.office_id " +
				"where (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date between $1::date and $2::date " +
				"and r.status in ('reserved', 'checked_in') " +
				"and ($3::uuid is null or r.office_id = $3::uuid) " +
				"group by r.desk_id" +
			") " +
			"select ds.id::text as desk_id, ds.code as desk_code, ds.zone_name, " +
				"(select total_days from day_span) as total_slots, " +
				"coalesce(o.occupied_slots, 0) as occupied_slots, " +
				"round((coalesce(o.occupied_slots, 0)::numeric / (select total_days from day_span)::numeric) * 100, 2) as occupancy_rate " +
			"from desks_scope ds " +
			"left join occupied o on o.desk_id = ds.id " +
			"order by ds.code asc",
			[filters.start, filters.end, filters.officeId ?? null]
		);

		return {
			start: filters.start,
			end: filters.end,
			items: result.rows.map(row => {
				const value = row as Record<string, unknown>;
				return {
					deskId: toStringOrEmpty(value.desk_id),
					deskCode: toStringOrEmpty(value.desk_code),
					zoneName: toStringOrNull(value.zone_name),
					totalSlots: toNumberOrZero(value.total_slots),
					occupiedSlots: toNumberOrZero(value.occupied_slots),
					occupancyRate: toNumberOrZero(value.occupancy_rate),
				};
			}),
		};
	}

	async getCancellationsReport(filters: AdminReportFilters): Promise<CancellationsReport> {
		const result = await this.db.query(
			"select (r.cancelled_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date::text as cancellation_date, " +
				"coalesce(r.user_id, r.host_user_id)::text as actor_user_id, " +
				"u.email::text as actor_email, " +
				"count(*)::int as cancellations, " +
				"round(avg(extract(epoch from (r.starts_at - r.cancelled_at)) / 60.0), 2) as avg_cancellation_lead_minutes " +
			"from reservations r " +
			"join offices o on o.id = r.office_id " +
			"left join users u on u.id = coalesce(r.user_id, r.host_user_id) " +
			"where r.status = 'cancelled' " +
				"and r.cancelled_at is not null " +
				"and (r.cancelled_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date between $1::date and $2::date " +
				"and ($3::uuid is null or r.office_id = $3::uuid) " +
			"group by cancellation_date, coalesce(r.user_id, r.host_user_id), u.email " +
			"order by cancellation_date asc, cancellations desc",
			[filters.start, filters.end, filters.officeId ?? null]
		);

		return {
			start: filters.start,
			end: filters.end,
			items: result.rows.map(row => {
				const value = row as Record<string, unknown>;
				return {
					cancellationDate: toStringOrEmpty(value.cancellation_date),
					actorUserId: toStringOrEmpty(value.actor_user_id),
					actorEmail: toStringOrNull(value.actor_email),
					cancellations: toNumberOrZero(value.cancellations),
					avgCancellationLeadMinutes: toNumberOrZero(value.avg_cancellation_lead_minutes),
				};
			}),
		};
	}

	async getNoShowReport(filters: AdminReportFilters): Promise<NoShowReport> {
		const result = await this.db.query(
			"select coalesce(r.user_id, r.host_user_id)::text as actor_user_id, " +
				"u.email::text as actor_email, count(*)::int as no_shows " +
			"from reservations r " +
			"left join users u on u.id = coalesce(r.user_id, r.host_user_id) " +
			"join offices o on o.id = r.office_id " +
			"where (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date between $1::date and $2::date " +
				"and r.status = 'no_show' " +
				"and ($3::uuid is null or r.office_id = $3::uuid) " +
			"group by coalesce(r.user_id, r.host_user_id), u.email " +
			"order by no_shows desc",
			[filters.start, filters.end, filters.officeId ?? null]
		);

		return {
			start: filters.start,
			end: filters.end,
			items: result.rows.map(row => {
				const value = row as Record<string, unknown>;
				return {
					actorUserId: toStringOrEmpty(value.actor_user_id),
					actorEmail: toStringOrNull(value.actor_email),
					noShows: toNumberOrZero(value.no_shows),
				};
			}),
		};
	}

	async getAuditLogReport(filters: AdminAuditLogFilters): Promise<AuditLogReport> {
		const result = await this.db.query(
			"select ae.id::text as id, ae.event_type, ae.actor_type, ae.actor_user_id::text as actor_user_id, " +
				"u.email::text as actor_email, ae.reservation_id::text as reservation_id, ae.desk_id::text as desk_id, " +
				"ae.office_id::text as office_id, ae.reason, ae.metadata, ae.created_at::text as created_at " +
			"from audit_events ae " +
			"left join users u on u.id = ae.actor_user_id " +
			"left join offices o on o.id = ae.office_id " +
			"where (ae.created_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date between $1::date and $2::date " +
				"and ($3::uuid is null or ae.office_id = $3::uuid) " +
				"and ($4::uuid is null or ae.actor_user_id = $4::uuid) " +
			"order by ae.created_at desc",
			[filters.start, filters.end, filters.officeId ?? null, filters.actorId ?? null]
		);

		return {
			start: filters.start,
			end: filters.end,
			items: result.rows.map(row => {
				const value = row as Record<string, unknown>;
				const actorType = toStringOrEmpty(value.actor_type);
				return {
					id: toStringOrEmpty(value.id),
					eventType: toStringOrEmpty(value.event_type),
					actorType: actorType === "admin" || actorType === "system" ? actorType : "user",
					actorUserId: toStringOrNull(value.actor_user_id),
					actorEmail: toStringOrNull(value.actor_email),
					reservationId: toStringOrNull(value.reservation_id),
					deskId: toStringOrNull(value.desk_id),
					officeId: toStringOrNull(value.office_id),
					reason: toStringOrNull(value.reason),
					metadata: value.metadata ?? null,
					createdAt: toStringOrEmpty(value.created_at),
				};
			}),
		};
	}

	async getSummaryReport(filters: AdminReportFilters): Promise<SummaryReport> {
		const result = await this.db.query(
			"select count(*)::int as total_reservations, " +
				"sum(case when r.status = 'checked_in' then 1 else 0 end)::int as checked_in, " +
				"sum(case when r.status = 'cancelled' then 1 else 0 end)::int as cancelled, " +
				"sum(case when r.status = 'no_show' then 1 else 0 end)::int as no_show " +
			"from reservations r " +
			"join offices o on o.id = r.office_id " +
			"where (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date between $1::date and $2::date " +
				"and ($3::uuid is null or r.office_id = $3::uuid)",
			[filters.start, filters.end, filters.officeId ?? null]
		);
		const row = result.rows[0] as Record<string, unknown> | undefined;
		return {
			start: filters.start,
			end: filters.end,
			totalReservations: toNumberOrZero(row?.total_reservations),
			checkedIn: toNumberOrZero(row?.checked_in),
			cancelled: toNumberOrZero(row?.cancelled),
			noShow: toNumberOrZero(row?.no_show),
		};
	}
}

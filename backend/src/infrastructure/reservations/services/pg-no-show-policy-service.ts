import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import {
	evaluateNoShowPolicy,
	RESERVATION_DEFAULT_CHECKIN_CUTOFF_TIME,
} from "@domain/reservations/policies/reservation-policy.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type NoShowCandidateRow = {
	id: string;
	status: "reserved" | "checked_in" | "cancelled" | "no_show";
	reservation_date: string;
	timezone: string;
	checkin_cutoff_time: string;
};

function isNoShowCandidateRow(value: unknown): value is NoShowCandidateRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		(row.status === "reserved" ||
			row.status === "checked_in" ||
			row.status === "cancelled" ||
			row.status === "no_show") &&
		typeof row.reservation_date === "string" &&
		typeof row.timezone === "string" &&
		typeof row.checkin_cutoff_time === "string"
	);
}

export class PgNoShowPolicyService implements NoShowPolicyService {
	constructor(private readonly db: DbClient) {}

	async markNoShowExpiredForDate(date: string): Promise<void> {
		const result = await this.db.query(
			"select r.id, r.status, r.reservation_date::text as reservation_date, o.timezone, " +
				`coalesce(p_office.checkin_cutoff_time, p_org.checkin_cutoff_time, '${RESERVATION_DEFAULT_CHECKIN_CUTOFF_TIME}'::time)::text as checkin_cutoff_time ` +
				"from reservations r " +
				"join offices o on o.id = r.office_id " +
				"left join reservation_policies p_office on p_office.office_id = o.id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.reservation_date = $1 and r.status in ('reserved', 'checked_in', 'cancelled', 'no_show')",
			[date]
		);
		const now = new Date();
		const noShowIds = result.rows
			.map(row => (isNoShowCandidateRow(row) ? row : null))
			.filter((row): row is NoShowCandidateRow => row !== null)
			.filter(
				row =>
					evaluateNoShowPolicy({
						status: row.status,
						reservationDate: row.reservation_date,
						timezone: row.timezone,
						checkinCutoffTime: row.checkin_cutoff_time,
						now,
					}) === "mark_no_show"
			)
			.map(row => row.id);

		if (noShowIds.length === 0) {
			return;
		}

		await this.db.query(
			"update reservations set status = 'no_show', no_show_at = now() where id = any($1::uuid[])",
			[noShowIds]
		);
	}
}

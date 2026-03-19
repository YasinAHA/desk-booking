import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";
import type { AuditEventWriter } from "@application/common/ports/audit-event-writer.js";

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
	desk_id: string;
	office_id: string;
	checkin_deadline_at: string | null;
};

function isNoShowCandidateRow(value: unknown): value is NoShowCandidateRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.desk_id === "string" &&
		typeof row.office_id === "string" &&
		(typeof row.checkin_deadline_at === "string" || row.checkin_deadline_at === null)
	);
}

type NoShowUpdatedRow = {
	id: string;
	desk_id: string;
	office_id: string;
};

function isNoShowUpdatedRow(value: unknown): value is NoShowUpdatedRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.desk_id === "string" &&
		typeof row.office_id === "string"
	);
}

export class PgNoShowPolicyService implements NoShowPolicyService {
	constructor(
		private readonly db: DbClient,
		private readonly auditWriter?: AuditEventWriter
	) {}

	async markNoShowExpiredForDate(date: string): Promise<void> {
		const result = await this.db.query(
			"select r.id::text as id, r.desk_id::text as desk_id, r.office_id::text as office_id, " +
				"r.checkin_deadline_at::text as checkin_deadline_at " +
				"from reservations r " +
				"join offices o on o.id = r.office_id " +
				"where (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date = $1::date " +
				"and r.status = 'reserved'",
			[date]
		);
		const noShowIds = result.rows
			.map(row => (isNoShowCandidateRow(row) ? row : null))
			.filter((row): row is NoShowCandidateRow => row !== null)
			.filter(row => {
				const deadline = row.checkin_deadline_at
					? new Date(row.checkin_deadline_at)
					: null;
				if (!deadline || Number.isNaN(deadline.valueOf())) {
					return false;
				}
				return deadline < new Date();
			})
			.map(row => row.id);

		if (noShowIds.length === 0) {
			return;
		}

		const updated = await this.db.query(
			"update reservations set status = 'no_show', no_show_at = now() " +
				"where id = any($1::uuid[]) " +
				"returning id::text as id, desk_id::text as desk_id, office_id::text as office_id",
			[noShowIds]
		);
		if (!this.auditWriter) {
			return;
		}

		for (const row of updated.rows) {
			if (!isNoShowUpdatedRow(row)) {
				continue;
			}
			await this.auditWriter.append({
				eventType: "reservation_no_show",
				actorType: "system",
				actorUserId: null,
				reservationId: row.id,
				deskId: row.desk_id,
				officeId: row.office_id,
				reason: "checkin_deadline_expired",
			});
		}
	}
}

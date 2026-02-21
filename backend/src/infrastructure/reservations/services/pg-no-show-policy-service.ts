import type { NoShowPolicyService } from "@application/common/ports/no-show-policy-service.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

export class PgNoShowPolicyService implements NoShowPolicyService {
	constructor(private readonly db: DbClient) {}

	async markNoShowExpiredForDate(date: string): Promise<void> {
		await this.db.query(
			"update reservations r " +
				"set status = 'no_show', no_show_at = now() " +
				"from offices o " +
				"left join reservation_policies p_office on p_office.office_id = o.id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.office_id = o.id and r.reservation_date = $1 and r.status = 'reserved' and (" +
				"r.reservation_date < (now() at time zone o.timezone)::date or (" +
				"r.reservation_date = (now() at time zone o.timezone)::date and " +
				"(now() at time zone o.timezone)::time > coalesce(p_office.checkin_cutoff_time, p_org.checkin_cutoff_time, '12:00'::time)" +
				"))",
			[date]
		);
	}
}


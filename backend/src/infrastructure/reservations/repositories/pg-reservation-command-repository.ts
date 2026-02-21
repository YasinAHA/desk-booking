import type { ErrorTranslator } from "@application/common/ports/error-translator.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import {
	deskIdToString,
	type DeskId,
} from "@domain/desks/value-objects/desk-id.js";
import { officeIdToString, type OfficeId } from "@domain/desks/value-objects/office-id.js";
import {
	createReservationId,
	reservationIdToString,
	type ReservationId,
} from "@domain/reservations/value-objects/reservation-id.js";
import {
	userIdToString,
	type UserId,
} from "@domain/auth/value-objects/user-id.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type ReservationIdRow = {
	id: string;
};

type CheckInByQrRow = {
	result: "checked_in" | "already_checked_in" | "not_active" | "not_found";
};

function isReservationIdRow(value: unknown): value is ReservationIdRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return typeof row.id === "string";
}

function toReservationIdRow(value: unknown): ReservationIdRow | null {
	return isReservationIdRow(value) ? value : null;
}

function isCheckInByQrRow(value: unknown): value is CheckInByQrRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return (
		row.result === "checked_in" ||
		row.result === "already_checked_in" ||
		row.result === "not_active" ||
		row.result === "not_found"
	);
}

export class PgReservationCommandRepository implements ReservationCommandRepository {
	constructor(
		private readonly db: DbClient,
		private readonly errorTranslator: ErrorTranslator
	) {}

	async create(
		userId: UserId,
		date: string,
		deskId: DeskId,
		source: string,
		officeId: OfficeId | null
	): Promise<ReservationId> {
		try {
			const result = await this.db.query(
				"insert into reservations (user_id, desk_id, reservation_date, source, office_id) " +
					"values ($1, $2, $3, $4, $5) returning id",
				[
					userIdToString(userId),
					deskIdToString(deskId),
					date,
					source,
					officeId ? officeIdToString(officeId) : null,
				]
			);
				const row = toReservationIdRow(result.rows[0]);
				if (!row) {
					throw new Error("Invalid reservation insert result");
				}
			return createReservationId(row.id);
		} catch (err) {
			throw this.errorTranslator.translateError(err);
		}
	}

	async cancel(reservationId: ReservationId, userId: UserId): Promise<boolean> {
		const result = await this.db.query(
			"update reservations set status = 'cancelled', cancelled_at = now() " +
				"where id = $1 and user_id = $2 and status = 'reserved' " +
				"returning id",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		return (result.rowCount ?? 0) > 0;
	}

	async checkInByQr(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<"checked_in" | "already_checked_in" | "not_active" | "not_found"> {
		const result = await this.db.query(
			"with target as (" +
				"select r.id, r.status, r.reservation_date, o.timezone, " +
				"coalesce(p_office.checkin_allowed_from, p_org.checkin_allowed_from, '06:00'::time) as checkin_allowed_from, " +
				"coalesce(p_office.checkin_cutoff_time, p_org.checkin_cutoff_time, '12:00'::time) as checkin_cutoff_time " +
				"from reservations r " +
				"join desks d on d.id = r.desk_id " +
				"join offices o on o.id = r.office_id " +
				"left join reservation_policies p_office on p_office.office_id = r.office_id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.user_id = $1 and r.reservation_date = $2 and d.qr_public_id = $3 " +
				"and d.status = 'active' " +
				"order by r.created_at desc " +
				"limit 1" +
			"), policy_eval as (" +
				"select t.*, " +
				"(now() at time zone t.timezone)::date as local_date, " +
				"(now() at time zone t.timezone)::time as local_time, " +
				"(t.reservation_date = (now() at time zone t.timezone)::date) as is_same_day, " +
				"(t.reservation_date < (now() at time zone t.timezone)::date) as is_past_day " +
				"from target t " +
			"), mark_no_show as (" +
				"update reservations r " +
				"set status = 'no_show', no_show_at = now() " +
				"from policy_eval p " +
				"where r.id = p.id and p.status = 'reserved' and " +
				"(p.is_past_day or (p.is_same_day and p.local_time > p.checkin_cutoff_time)) " +
				"returning r.id" +
			"), updated as (" +
				"update reservations r " +
				"set status = 'checked_in', check_in_at = now() " +
				"from policy_eval p " +
				"where r.id = p.id and p.status = 'reserved' and p.is_same_day " +
				"and p.local_time >= p.checkin_allowed_from and p.local_time <= p.checkin_cutoff_time " +
				"returning r.id" +
			") " +
			"select case " +
				"when exists (select 1 from updated) then 'checked_in' " +
				"when exists (select 1 from target where status = 'checked_in') then 'already_checked_in' " +
				"when exists (select 1 from target) then 'not_active' " +
				"else 'not_found' " +
			"end as result",
			[userIdToString(userId), date, qrPublicId]
		);

		const row = result.rows[0];
		if (!isCheckInByQrRow(row)) {
			throw new Error("Invalid check-in result");
		}
		return row.result;
	}
}




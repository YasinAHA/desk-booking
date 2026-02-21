import type {
	ReservationQueryRepository,
	ReservationRecord,
	QrCheckInCandidate,
} from "@application/reservations/ports/reservation-query-repository.js";
import { createDeskId, deskIdToString, type DeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
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

type ActiveReservationRow = {
	id: string;
	reservation_date: string;
	status: "reserved" | "checked_in";
	is_same_day_booking_closed: boolean;
};

type ReservationRecordRow = {
	id: string;
	desk_id: string;
	office_id: string;
	desk_name: string;
	reservation_date: string;
	source: ReservationRecord["source"];
	cancelled_at: string | null;
};

type QrCheckInCandidateRow = {
	id: string;
	status: string;
	reservation_date: string;
	timezone: string;
	checkin_allowed_from: string;
	checkin_cutoff_time: string;
};

function isActiveReservationRow(value: unknown): value is ActiveReservationRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.reservation_date === "string" &&
		(row.status === "reserved" || row.status === "checked_in") &&
		typeof row.is_same_day_booking_closed === "boolean"
	);
}

function toActiveReservationRow(value: unknown): ActiveReservationRow | null {
	return isActiveReservationRow(value) ? value : null;
}

function isReservationRecordRow(value: unknown): value is ReservationRecordRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.desk_id === "string" &&
		typeof row.office_id === "string" &&
		typeof row.desk_name === "string" &&
		typeof row.reservation_date === "string" &&
		(row.source === "user" ||
			row.source === "admin" ||
			row.source === "walk_in" ||
			row.source === "system") &&
		(typeof row.cancelled_at === "string" || row.cancelled_at === null)
	);
}

function toReservationRecordRows(rows: unknown[]): ReservationRecordRow[] {
	return rows
		.map(row => (isReservationRecordRow(row) ? row : null))
		.filter((row): row is ReservationRecordRow => row !== null);
}

function isQrCheckInCandidateRow(value: unknown): value is QrCheckInCandidateRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.status === "string" &&
		typeof row.reservation_date === "string" &&
		typeof row.timezone === "string" &&
		typeof row.checkin_allowed_from === "string" &&
		typeof row.checkin_cutoff_time === "string"
	);
}

export class PgReservationQueryRepository implements ReservationQueryRepository {
	constructor(private readonly db: DbClient) {}

	async findByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<{
		id: ReservationId;
		reservationDate: string;
		status: "reserved" | "checked_in";
		isSameDayBookingClosed: boolean;
	} | null> {
		const result = await this.db.query(
			"select r.id, r.reservation_date::text as reservation_date, r.status, (" +
				"r.reservation_date = (now() at time zone o.timezone)::date and " +
				"(now() at time zone o.timezone)::time >= coalesce(p_office.checkin_allowed_from, p_org.checkin_allowed_from, '06:00'::time)" +
			") as is_same_day_booking_closed " +
				"from reservations r " +
				"join offices o on o.id = r.office_id " +
				"left join reservation_policies p_office on p_office.office_id = r.office_id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.id = $1 and r.user_id = $2 and r.status in ('reserved', 'checked_in')",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		const row = toActiveReservationRow(result.rows[0]);
		if (!row) {
			return null;
		}
		return {
			id: createReservationId(row.id),
			reservationDate: row.reservation_date,
			status: row.status,
			isSameDayBookingClosed: row.is_same_day_booking_closed,
		};
	}

	async listForUser(userId: UserId): Promise<ReservationRecord[]> {
		const result = await this.db.query(
			"select r.id, r.desk_id, r.office_id, d.name as desk_name, " +
				"r.reservation_date::text as reservation_date, r.source, r.cancelled_at " +
				"from reservations r " +
				"join desks d on d.id = r.desk_id " +
				"where r.user_id = $1 " +
				"order by r.reservation_date desc",
			[userIdToString(userId)]
		);

		return toReservationRecordRows(result.rows).map(row => ({
			id: createReservationId(row.id),
			deskId: createDeskId(row.desk_id),
			officeId: createOfficeId(row.office_id),
			deskName: row.desk_name,
			reservationDate: row.reservation_date,
			source: row.source,
			cancelledAt: row.cancelled_at,
		}));
	}

	async hasActiveReservationForUserOnDate(userId: UserId, date: string): Promise<boolean> {
		const result = await this.db.query(
			"select 1 from reservations " +
				"where user_id = $1 and reservation_date = $2 and status in ('reserved', 'checked_in') " +
				"limit 1",
			[userIdToString(userId), date]
		);
		return result.rows.length > 0;
	}

	async hasActiveReservationForDeskOnDate(deskId: DeskId, date: string): Promise<boolean> {
		const result = await this.db.query(
			"select 1 from reservations " +
				"where desk_id = $1 and reservation_date = $2 and status in ('reserved', 'checked_in') " +
				"limit 1",
			[deskIdToString(deskId), date]
		);
		return result.rows.length > 0;
	}

	async isSameDayBookingClosedForDesk(deskId: DeskId, date: string): Promise<boolean> {
		const result = await this.db.query(
			"select (" +
				"$2::date = (now() at time zone o.timezone)::date and " +
				"(now() at time zone o.timezone)::time >= coalesce(p_office.checkin_allowed_from, p_org.checkin_allowed_from, '06:00'::time)" +
			") as is_same_day_booking_closed " +
			"from desks d " +
			"join offices o on o.id = d.office_id " +
			"left join reservation_policies p_office on p_office.office_id = o.id " +
			"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
			"where d.id = $1 and d.status = 'active' " +
			"limit 1",
			[deskIdToString(deskId), date]
		);
		const row = result.rows[0] as { is_same_day_booking_closed?: unknown } | undefined;
		return row?.is_same_day_booking_closed === true;
	}

	async findQrCheckInCandidate(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<QrCheckInCandidate | null> {
		const result = await this.db.query(
			"select r.id, r.status, r.reservation_date::text as reservation_date, o.timezone, " +
				"coalesce(p_office.checkin_allowed_from, p_org.checkin_allowed_from, '06:00'::time)::text as checkin_allowed_from, " +
				"coalesce(p_office.checkin_cutoff_time, p_org.checkin_cutoff_time, '12:00'::time)::text as checkin_cutoff_time " +
				"from reservations r " +
				"join desks d on d.id = r.desk_id " +
				"join offices o on o.id = r.office_id " +
				"left join reservation_policies p_office on p_office.office_id = r.office_id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.user_id = $1 and r.reservation_date = $2 and d.qr_public_id = $3 and d.status = 'active' " +
				"order by r.created_at desc " +
				"limit 1",
			[userIdToString(userId), date, qrPublicId]
		);

		const row = result.rows[0];
		if (!isQrCheckInCandidateRow(row)) {
			return null;
		}

		return {
			id: createReservationId(row.id),
			status: row.status,
			reservationDate: row.reservation_date,
			timezone: row.timezone,
			checkinAllowedFrom: row.checkin_allowed_from,
			checkinCutoffTime: row.checkin_cutoff_time,
		};
	}
}

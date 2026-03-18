import type {
	ReservationQueryRepository,
	ReservationRecord,
	QrCheckInCandidate,
} from "@application/reservations/ports/reservation-query-repository.js";
import { createDeskId, deskIdToString, type DeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId, type OfficeId } from "@domain/desks/value-objects/office-id.js";
import {
	createReservationId,
	reservationIdToString,
	type ReservationId,
} from "@domain/reservations/value-objects/reservation-id.js";
import {
	createReservationDate,
	type ReservationDate,
} from "@domain/reservations/value-objects/reservation-date.js";
import {
	createUserId,
	userIdToString,
	type UserId,
} from "@domain/auth/value-objects/user-id.js";
import {
	Reservation as ReservationEntity,
	type Reservation,
	type ReservationSource,
} from "@domain/reservations/entities/reservation.js";
import {
	RESERVATION_DEFAULT_CHECKIN_ALLOWED_FROM,
} from "@domain/reservations/policies/reservation-policy.js";

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
	user_id: string;
	desk_id: string;
	office_id: string;
	reservation_date: string;
	starts_at?: string;
	ends_at?: string;
	status: "reserved" | "checked_in" | "cancelled" | "no_show";
	source: ReservationSource;
	cancelled_at: string | null;
	timezone: string;
	checkin_allowed_from: string;
};

type ReservationRecordRow = {
	id: string;
	desk_id: string;
	office_id: string;
	desk_name: string;
	reservation_date: string;
	starts_at?: string;
	ends_at?: string;
	status: "reserved" | "checked_in" | "cancelled" | "no_show";
	source: ReservationRecord["source"];
	cancelled_at: string | null;
};

type QrCheckInCandidateRow = {
	id: string;
	user_id: string;
	desk_id: string;
	office_id: string;
	status: "reserved" | "checked_in" | "cancelled" | "no_show";
	source: ReservationSource;
	cancelled_at: string | null;
	reservation_date: string;
};

type DeskBookingPolicyRow = {
	timezone: string;
	checkin_allowed_from: string;
};

function isActiveReservationRow(value: unknown): value is ActiveReservationRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.user_id === "string" &&
		typeof row.desk_id === "string" &&
		typeof row.office_id === "string" &&
		typeof row.reservation_date === "string" &&
		(typeof row.starts_at === "string" || typeof row.reservation_date === "string") &&
		(typeof row.ends_at === "string" || typeof row.reservation_date === "string") &&
		(row.status === "reserved" ||
			row.status === "checked_in" ||
			row.status === "cancelled" ||
			row.status === "no_show") &&
		(row.source === "user" ||
			row.source === "admin" ||
			row.source === "walk_in" ||
			row.source === "system") &&
		(typeof row.cancelled_at === "string" || row.cancelled_at === null) &&
		typeof row.timezone === "string" &&
		typeof row.checkin_allowed_from === "string"
	);
}

function toActiveReservationRow(value: unknown): ActiveReservationRow | null {
	return isActiveReservationRow(value) ? value : null;
}

function toReservationEntity(row: ActiveReservationRow): Reservation {
	const reservationDate: ReservationDate = createReservationDate(row.reservation_date);
	const officeId: OfficeId = createOfficeId(row.office_id);
	return new ReservationEntity({
		id: createReservationId(row.id),
		userId: createUserId(row.user_id),
		deskId: createDeskId(row.desk_id),
		officeId,
		reservationDate,
		status: row.status,
		source: row.source,
		cancelledAt: row.cancelled_at,
	});
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
		(typeof row.starts_at === "string" || row.starts_at === undefined) &&
		(typeof row.ends_at === "string" || row.ends_at === undefined) &&
		(row.status === "reserved" ||
			row.status === "checked_in" ||
			row.status === "cancelled" ||
			row.status === "no_show") &&
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
		typeof row.user_id === "string" &&
		typeof row.desk_id === "string" &&
		typeof row.office_id === "string" &&
		(row.status === "reserved" || row.status === "checked_in" || row.status === "cancelled" || row.status === "no_show") &&
		(row.source === "user" ||
			row.source === "admin" ||
			row.source === "walk_in" ||
			row.source === "system") &&
		(typeof row.cancelled_at === "string" || row.cancelled_at === null) &&
		typeof row.reservation_date === "string"
	);
}

function toReservationEntityFromQrCandidateRow(row: QrCheckInCandidateRow): Reservation {
		return new ReservationEntity({
		id: createReservationId(row.id),
		userId: createUserId(row.user_id),
		deskId: createDeskId(row.desk_id),
		officeId: createOfficeId(row.office_id),
			reservationDate: createReservationDate(row.reservation_date),
		status: row.status,
		source: row.source,
		cancelledAt: row.cancelled_at,
	});
}

function isDeskBookingPolicyRow(value: unknown): value is DeskBookingPolicyRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.timezone === "string" &&
		typeof row.checkin_allowed_from === "string"
	);
}

export class PgReservationQueryRepository implements ReservationQueryRepository {
	constructor(private readonly db: DbClient) {}

	async findByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<{
		reservation: Reservation;
		timezone: string;
		checkinAllowedFrom: string;
	} | null> {
		const result = await this.db.query(
				"select r.id, r.user_id, r.desk_id, r.office_id, " +
				"(r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date::text as reservation_date, " +
				"r.starts_at::text as starts_at, r.ends_at::text as ends_at, " +
				"r.status, r.source, r.cancelled_at::text as cancelled_at, o.timezone, " +
				"to_char((r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::time, 'HH24:MI:SS') as checkin_allowed_from " +
				"from reservations r " +
				"join offices o on o.id = r.office_id " +
				"where r.id = $1 and r.user_id = $2",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		const row = toActiveReservationRow(result.rows[0]);
		if (!row) {
			return null;
		}
		return {
			reservation: toReservationEntity(row),
			timezone: row.timezone,
			checkinAllowedFrom: row.checkin_allowed_from,
		};
	}

	async listForUser(userId: UserId): Promise<ReservationRecord[]> {
		const result = await this.db.query(
			"select r.id, r.desk_id, r.office_id, d.name as desk_name, " +
				"(r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date::text as reservation_date, " +
				"r.starts_at::text as starts_at, r.ends_at::text as ends_at, " +
				"r.status, r.source, r.cancelled_at::text as cancelled_at " +
				"from reservations r " +
				"join desks d on d.id = r.desk_id " +
				"join offices o on o.id = r.office_id " +
				"where r.user_id = $1 " +
				"order by r.starts_at desc",
			[userIdToString(userId)]
		);

		return toReservationRecordRows(result.rows).map(row => ({
			id: createReservationId(row.id),
			deskId: createDeskId(row.desk_id),
			officeId: createOfficeId(row.office_id),
			deskName: row.desk_name,
			reservationDate: row.reservation_date,
			...(row.starts_at ? { startsAt: row.starts_at } : {}),
			...(row.ends_at ? { endsAt: row.ends_at } : {}),
			status: row.status,
			source: row.source,
			cancelledAt: row.cancelled_at,
		}));
	}

	async hasActiveReservationForUserOnDate(userId: UserId, date: string): Promise<boolean> {
		const result = await this.db.query(
			"select 1 from reservations r " +
				"join offices o on o.id = r.office_id " +
				"where r.user_id = $1 " +
				"and (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date = $2::date " +
				"and r.status in ('reserved', 'checked_in') " +
				"limit 1",
			[userIdToString(userId), date]
		);
		return result.rows.length > 0;
	}

	async hasActiveReservationForDeskOnDate(deskId: DeskId, date: string): Promise<boolean> {
		const result = await this.db.query(
			"select 1 from reservations r " +
				"join offices o on o.id = r.office_id " +
				"where r.desk_id = $1 " +
				"and (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date = $2::date " +
				"and r.status in ('reserved', 'checked_in') " +
				"limit 1",
			[deskIdToString(deskId), date]
		);
		return result.rows.length > 0;
	}

	async getDeskBookingPolicyContext(
		deskId: DeskId
	): Promise<{ timezone: string; checkinAllowedFrom: string } | null> {
		const result = await this.db.query(
			"select o.timezone, " +
				`'${RESERVATION_DEFAULT_CHECKIN_ALLOWED_FROM}'::text as checkin_allowed_from ` +
			"from desks d " +
			"join offices o on o.id = d.office_id " +
			"where d.id = $1 and d.status = 'active' " +
			"limit 1",
			[deskIdToString(deskId)]
		);
		const row = result.rows[0];
		if (!isDeskBookingPolicyRow(row)) {
			return null;
		}
		return {
			timezone: row.timezone,
			checkinAllowedFrom: row.checkin_allowed_from,
		};
	}

	async findQrCheckInCandidate(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<QrCheckInCandidate | null> {
		const result = await this.db.query(
				"select r.id, r.user_id, r.desk_id, r.office_id, r.status, r.source, r.cancelled_at::text as cancelled_at, " +
				"(r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date::text as reservation_date " +
				"from reservations r " +
				"join desks d on d.id = r.desk_id " +
				"join offices o on o.id = r.office_id " +
				"where r.user_id = $1 " +
				"and (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date = $2::date " +
				"and d.qr_public_id = $3 and d.status = 'active' " +
				"order by r.created_at desc " +
				"limit 1",
			[userIdToString(userId), date, qrPublicId]
		);

		const row = result.rows[0];
		if (!isQrCheckInCandidateRow(row)) {
			return null;
		}

		return {
			reservation: toReservationEntityFromQrCandidateRow(row),
		};
	}
}


import type {
	ReservationQueryRepository,
	ReservationRecord,
} from "@application/ports/reservation-query-repository.js";
import { createDeskId } from "@domain/value-objects/desk-id.js";
import { createOfficeId } from "@domain/value-objects/office-id.js";
import {
	createReservationId,
	reservationIdToString,
	type ReservationId,
} from "@domain/value-objects/reservation-id.js";
import {
	userIdToString,
	type UserId,
} from "@domain/value-objects/user-id.js";

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;

type DbClient = {
	query: DbQuery;
};

export class PgReservationQueryRepository implements ReservationQueryRepository {
	constructor(private readonly db: DbClient) {}

	async findActiveByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<{ id: ReservationId; reservationDate: string } | null> {
		const result = await this.db.query(
			"select id, reservation_date::text as reservation_date " +
				"from reservations " +
				"where id = $1 and user_id = $2 and status in ('reserved', 'checked_in')",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		const row = result.rows[0];
		if (!row) {
			return null;
		}
		return { id: createReservationId(row.id), reservationDate: row.reservation_date };
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

		return result.rows.map(row => ({
			id: createReservationId(row.id),
			deskId: createDeskId(row.desk_id),
			officeId: createOfficeId(row.office_id),
			deskName: row.desk_name,
			reservationDate: row.reservation_date,
			source: row.source,
			cancelledAt: row.cancelled_at,
		}));
	}
}


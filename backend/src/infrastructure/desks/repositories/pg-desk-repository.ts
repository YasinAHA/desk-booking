import type { DeskAvailability, DeskRepository } from "@application/desks/ports/desk-repository.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { userIdToString, type UserId } from "@domain/auth/value-objects/user-id.js";

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;

type DbClient = {
	query: DbQuery;
};

export class PgDeskRepository implements DeskRepository {
	constructor(private readonly db: DbClient) {}

	async listForDate(date: string, userId: UserId): Promise<DeskAvailability[]> {
		const result = await this.db.query(
			"select d.id, d.office_id, d.code, d.name, d.status, " +
				"(r.id is not null) as is_reserved, " +
				"(r.user_id = $2) as is_mine, " +
				"r.id as reservation_id, " +
				"case when r.user_id is null then null else concat_ws(' ', u.first_name, u.last_name, u.second_last_name) end as occupant_name " +
				"from desks d " +
				"left join reservations r " +
				"on r.desk_id = d.id " +
				"and r.reservation_date = $1 " +
				"and r.status in ('reserved', 'checked_in') " +
				"left join users u on u.id = r.user_id " +
				"order by d.code asc",
			[date, userIdToString(userId)]
		);

		return result.rows.map(row => ({
			id: createDeskId(row.id),
			officeId: createOfficeId(row.office_id),
			code: row.code,
			name: row.name,
			status: row.status,
			isReserved: row.is_reserved,
			isMine: row.is_mine,
			reservationId: row.reservation_id ? createReservationId(row.reservation_id) : null,
			occupantName: row.occupant_name,
		}));
	}
}




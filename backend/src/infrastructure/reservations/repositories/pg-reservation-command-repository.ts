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

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;

type DbClient = {
	query: DbQuery;
};

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
			return createReservationId(result.rows[0]?.id as string);
		} catch (err) {
			throw this.errorTranslator.translateError(err);
		}
	}

	async cancel(reservationId: ReservationId, userId: UserId): Promise<boolean> {
		const result = await this.db.query(
			"update reservations set status = 'cancelled', cancelled_at = now() " +
				"where id = $1 and user_id = $2 and status in ('reserved', 'checked_in') " +
				"returning id",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		return (result.rowCount ?? 0) > 0;
	}
}




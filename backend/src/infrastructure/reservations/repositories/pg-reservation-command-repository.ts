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
				"where id = $1 and user_id = $2 and status in ('reserved', 'checked_in') " +
				"returning id",
			[reservationIdToString(reservationId), userIdToString(userId)]
		);
		return (result.rowCount ?? 0) > 0;
	}
}




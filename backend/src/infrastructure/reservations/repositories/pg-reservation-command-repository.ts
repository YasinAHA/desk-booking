import type { ErrorTranslator } from "@application/common/ports/error-translator.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";
import type { RuntimeAppSettingsStore } from "@application/common/ports/runtime-app-settings-store.js";
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

type ReservationStatusRow = {
	status: string;
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

function isReservationStatusRow(value: unknown): value is ReservationStatusRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const row = value as Record<string, unknown>;
	return typeof row.status === "string";
}

export class PgReservationCommandRepository implements ReservationCommandRepository {
	constructor(
		private readonly db: DbClient,
		private readonly errorTranslator: ErrorTranslator,
		private readonly runtimeSettingsStore?: RuntimeAppSettingsStore
	) {}

	async create(
		userId: UserId,
		date: string,
		deskId: DeskId,
		source: string,
		officeId: OfficeId | null
	): Promise<ReservationId> {
		try {
			const runtime = this.runtimeSettingsStore?.get();
			const checkinWindowMinutes = runtime?.checkinWindowMinutes ?? 15;
			const defaultReservationDurationMinutes =
				runtime?.defaultReservationDurationMinutes ?? 480;
			const result = await this.db.query(
				"insert into reservations (" +
					"user_id, desk_id, source, office_id, starts_at, ends_at, checkin_deadline_at" +
				") " +
				"select " +
					"$1, $2, $3, coalesce($5, d.office_id), " +
					"($4::date::timestamp at time zone coalesce(o.timezone, 'Europe/Madrid')), " +
					"(($4::date::timestamp at time zone coalesce(o.timezone, 'Europe/Madrid')) + " +
						"make_interval(mins => $6::int)), " +
					"(($4::date::timestamp at time zone coalesce(o.timezone, 'Europe/Madrid')) + " +
						"make_interval(mins => $7::int)) " +
				"from desks d " +
				"join offices o on o.id = d.office_id " +
				"where d.id = $2 " +
				"returning id",
				[
					userIdToString(userId),
					deskIdToString(deskId),
					source,
					date,
					officeId ? officeIdToString(officeId) : null,
					defaultReservationDurationMinutes,
					checkinWindowMinutes,
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

	async checkInReservation(
		reservationId: ReservationId
	): Promise<"checked_in" | "already_checked_in" | "not_active"> {
		const updateResult = await this.db.query(
			"update reservations set status = 'checked_in', checked_in_at = now() " +
				"where id = $1 and status = 'reserved' and now() <= checkin_deadline_at returning id",
			[reservationIdToString(reservationId)]
		);
		if ((updateResult.rowCount ?? 0) > 0) {
			return "checked_in";
		}

		const statusResult = await this.db.query(
			"select status from reservations where id = $1 limit 1",
			[reservationIdToString(reservationId)]
		);
		const statusRow = statusResult.rows[0];
		if (!isReservationStatusRow(statusRow)) {
			return "not_active";
		}

		if (statusRow.status === "checked_in") {
			return "already_checked_in";
		}
		return "not_active";
	}
}

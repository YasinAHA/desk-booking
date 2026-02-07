import type { FastifyInstance } from "fastify";

type ReservationRow = {
	id: string;
	desk_id: string;
	desk_name: string;
	reserved_date: string;
	cancelled_at: string | null;
};

function isPastDate(date: string) {
	const today = new Date();
	const todayUtc = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate()
	);
	const parts = date.split("-");
	if (parts.length !== 3) {
		return true;
	}
	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return true;
	}
	const dateUtc = Date.UTC(year, month - 1, day);
	return dateUtc < todayUtc;
}

export async function createReservation(
	app: FastifyInstance,
	userId: string,
	date: string,
	deskId: string
): Promise<string> {
	if (isPastDate(date)) {
		throw new Error("DATE_IN_PAST");
	}

	const result = await app.db.query(
		"insert into reservations (user_id, desk_id, reserved_date) " +
			"values ($1, $2, $3) returning id",
		[userId, deskId, date]
	);

	return result.rows[0]?.id as string;
}

export async function cancelReservation(
	app: FastifyInstance,
	userId: string,
	reservationId: string
): Promise<boolean> {
	const result = await app.db.query(
		"update reservations set cancelled_at = now() " +
			"where id = $1 and user_id = $2 and cancelled_at is null " +
			"returning id",
		[reservationId, userId]
	);

	return result.rowCount > 0;
}

export async function listMyReservations(
	app: FastifyInstance,
	userId: string
): Promise<ReservationRow[]> {
	const result = await app.db.query(
		"select r.id, r.desk_id, d.name as desk_name, " +
			"r.reserved_date::text as reserved_date, r.cancelled_at " +
			"from reservations r " +
			"join desks d on d.id = r.desk_id " +
			"where r.user_id = $1 " +
			"order by r.reserved_date desc",
		[userId]
	);

	return result.rows as ReservationRow[];
}


import type { FastifyInstance } from "fastify";

type DeskRow = {
	id: string;
	code: string;
	name: string;
	is_active: boolean;
	is_reserved: boolean;
	is_mine: boolean;
	reservation_id: string | null;
	occupant_name: string | null;
};

export async function getDesksForDate(
	app: FastifyInstance,
	date: string,
	userId: string
): Promise<DeskRow[]> {
	const result = await app.db.query(
		"select d.id, d.code, d.name, d.is_active, " +
			"(r.id is not null) as is_reserved, " +
			"(r.user_id = $2) as is_mine, " +
			"r.id as reservation_id, " +
			"case when r.user_id is null then null else u.display_name end as occupant_name " +
			"from desks d " +
			"left join reservations r " +
			"on r.desk_id = d.id " +
			"and r.reserved_date = $1 " +
			"and r.cancelled_at is null " +
			"left join users u on u.id = r.user_id " +
			"order by d.code asc",
		[date, userId]
	);

	return result.rows as DeskRow[];
}


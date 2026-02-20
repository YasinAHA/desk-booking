import type { AdminDeskRecord, DeskAvailability, DeskRepository } from "@application/desks/ports/desk-repository.js";
import {
	createDeskId,
	deskIdToString,
	type DeskId,
} from "@domain/desks/value-objects/desk-id.js";
import { createOfficeId } from "@domain/desks/value-objects/office-id.js";
import { createReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import { userIdToString, type UserId } from "@domain/auth/value-objects/user-id.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type DeskRow = {
	id: string;
	office_id: string;
	code: string;
	name: string | null;
	status: DeskAvailability["status"];
	is_reserved: boolean;
	is_mine: boolean;
	reservation_id: string | null;
	occupant_name: string | null;
};

type AdminDeskRow = {
	id: string;
	office_id: string;
	code: string;
	name: string | null;
	status: AdminDeskRecord["status"];
	qr_public_id: string;
};

function isDeskRow(value: unknown): value is DeskRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.office_id === "string" &&
		typeof row.code === "string" &&
		(typeof row.name === "string" || row.name === null) &&
		(row.status === "active" || row.status === "maintenance" || row.status === "disabled") &&
		typeof row.is_reserved === "boolean" &&
		typeof row.is_mine === "boolean" &&
		(typeof row.reservation_id === "string" || row.reservation_id === null) &&
		(typeof row.occupant_name === "string" || row.occupant_name === null)
	);
}

function toDeskRow(value: unknown): DeskRow {
	if (!isDeskRow(value)) {
		throw new Error("Invalid desk row shape");
	}
	return value;
}

function isAdminDeskRow(value: unknown): value is AdminDeskRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.id === "string" &&
		typeof row.office_id === "string" &&
		typeof row.code === "string" &&
		(typeof row.name === "string" || row.name === null) &&
		(row.status === "active" || row.status === "maintenance" || row.status === "disabled") &&
		typeof row.qr_public_id === "string"
	);
}

function toAdminDeskRow(value: unknown): AdminDeskRow {
	if (!isAdminDeskRow(value)) {
		throw new Error("Invalid admin desk row shape");
	}
	return value;
}

export class PgDeskRepository implements DeskRepository {
	constructor(private readonly db: DbClient) {}

	private async markNoShowExpiredForDate(date: string): Promise<void> {
		await this.db.query(
			"update reservations r " +
				"set status = 'no_show', no_show_at = now() " +
				"from offices o " +
				"left join reservation_policies p_office on p_office.office_id = o.id " +
				"left join reservation_policies p_org on p_org.organization_id = o.organization_id and p_org.office_id is null " +
				"where r.office_id = o.id and r.reservation_date = $1 and r.status = 'reserved' and (" +
				"r.reservation_date < (now() at time zone o.timezone)::date or (" +
				"r.reservation_date = (now() at time zone o.timezone)::date and " +
				"(now() at time zone o.timezone)::time > coalesce(p_office.checkin_cutoff_time, p_org.checkin_cutoff_time, '12:00'::time)" +
				"))",
			[date]
		);
	}

	async listForDate(date: string, userId: UserId): Promise<DeskAvailability[]> {
		await this.markNoShowExpiredForDate(date);

		const result = await this.db.query(
			"select d.id, d.office_id, d.code, d.name, d.status, " +
				"(r.id is not null) as is_reserved, " +
				"coalesce((r.user_id = $2), false) as is_mine, " +
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

		return result.rows.map(raw => {
			const row = toDeskRow(raw);
			return {
				id: createDeskId(row.id),
				officeId: createOfficeId(row.office_id),
				code: row.code,
				name: row.name,
				status: row.status,
				isReserved: row.is_reserved,
				isMine: row.is_mine,
				reservationId: row.reservation_id ? createReservationId(row.reservation_id) : null,
				occupantName: row.occupant_name,
			};
		});
	}

	async listForAdmin(): Promise<AdminDeskRecord[]> {
		const result = await this.db.query(
			"select d.id, d.office_id, d.code, d.name, d.status, d.qr_public_id " +
				"from desks d order by d.code asc"
		);

		return result.rows.map(raw => {
			const row = toAdminDeskRow(raw);
			return {
				id: createDeskId(row.id),
				officeId: createOfficeId(row.office_id),
				code: row.code,
				name: row.name,
				status: row.status,
				qrPublicId: row.qr_public_id,
			};
		});
	}

	async regenerateQrPublicId(deskId: DeskId): Promise<string | null> {
		const result = await this.db.query(
			"update desks set qr_public_id = gen_random_uuid()::text, updated_at = now() " +
				"where id = $1 returning qr_public_id",
			[deskIdToString(deskId)]
		);
		const row = result.rows[0] as { qr_public_id?: unknown } | undefined;
		return typeof row?.qr_public_id === "string" ? row.qr_public_id : null;
	}

	async regenerateAllQrPublicIds(): Promise<number> {
		const result = await this.db.query(
			"update desks set qr_public_id = gen_random_uuid()::text, updated_at = now()"
		);
		return result.rowCount ?? 0;
	}
}

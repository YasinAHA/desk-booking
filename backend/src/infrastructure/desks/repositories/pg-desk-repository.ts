import type {
	AdminDeskRecord,
	DeskAvailability,
	DeskRepository,
	ListDesksFilters,
} from "@application/desks/ports/desk-repository.js";
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
	zone_id: string | null;
	code: string;
	name: string | null;
	zone_name: string | null;
	status: DeskAvailability["status"];
	layout_x: number | string | null;
	layout_y: number | string | null;
	layout_w: number | string | null;
	layout_h: number | string | null;
	rotation_deg: number | string;
	display_order: number | string;
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
	zone_name: string | null;
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
		(typeof row.zone_id === "string" || row.zone_id === null) &&
		typeof row.code === "string" &&
		(typeof row.name === "string" || row.name === null) &&
		(typeof row.zone_name === "string" || row.zone_name === null) &&
		(row.status === "active" || row.status === "maintenance" || row.status === "disabled") &&
		(typeof row.layout_x === "number" || typeof row.layout_x === "string" || row.layout_x === null) &&
		(typeof row.layout_y === "number" || typeof row.layout_y === "string" || row.layout_y === null) &&
		(typeof row.layout_w === "number" || typeof row.layout_w === "string" || row.layout_w === null) &&
		(typeof row.layout_h === "number" || typeof row.layout_h === "string" || row.layout_h === null) &&
		(typeof row.rotation_deg === "number" || typeof row.rotation_deg === "string") &&
		(typeof row.display_order === "number" || typeof row.display_order === "string") &&
		typeof row.is_reserved === "boolean" &&
		typeof row.is_mine === "boolean" &&
		(typeof row.reservation_id === "string" || row.reservation_id === null) &&
		(typeof row.occupant_name === "string" || row.occupant_name === null)
	);
}

function toNullableNumber(value: number | string | null): number | null {
	if (value === null) {
		return null;
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: number | string): number {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
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
		(typeof row.zone_name === "string" || row.zone_name === null) &&
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

	async listForDate(
		date: string,
		userId: UserId,
		filters: ListDesksFilters
	): Promise<DeskAvailability[]> {
		const where: string[] = ["d.archived_at is null"];
		const params: unknown[] = [date, userIdToString(userId)];
		let index = 3;

		if (filters.officeId) {
			where.push(`d.office_id = $${index}::uuid`);
			params.push(filters.officeId);
			index += 1;
		}
		if (filters.zoneId) {
			where.push(`d.zone_id = $${index}::uuid`);
			params.push(filters.zoneId);
			index += 1;
		}
		if (filters.status) {
			where.push(`d.status = $${index}`);
			params.push(filters.status);
		}

		const whereSql = `where ${where.join(" and ")}`;

		const result = await this.db.query(
			"select d.id, d.office_id, d.zone_id, d.code, d.name, z.name as zone_name, d.status, " +
				"d.layout_x, d.layout_y, d.layout_w, d.layout_h, d.rotation_deg, d.display_order, " +
				"(r.id is not null) as is_reserved, " +
				"coalesce((r.user_id = $2), false) as is_mine, " +
				"r.id as reservation_id, " +
				"case when r.user_id is null then null else concat_ws(' ', u.first_name, u.last_name, u.second_last_name) end as occupant_name " +
				"from desks d " +
				"join offices o on o.id = d.office_id " +
				"left join zones z on z.id = d.zone_id " +
				"left join reservations r " +
				"on r.desk_id = d.id " +
				"and (r.starts_at at time zone coalesce(o.timezone, 'Europe/Madrid'))::date = $1::date " +
				"and r.status in ('reserved', 'checked_in') " +
				"left join users u on u.id = r.user_id " +
				`${whereSql} ` +
				"order by d.display_order asc, d.code asc",
			params
		);

		return result.rows.map(raw => {
			const row = toDeskRow(raw);
			return {
				id: createDeskId(row.id),
				officeId: createOfficeId(row.office_id),
				zoneId: row.zone_id,
				code: row.code,
				name: row.name,
				zone: row.zone_name,
				status: row.status,
				layoutX: toNullableNumber(row.layout_x),
				layoutY: toNullableNumber(row.layout_y),
				layoutW: toNullableNumber(row.layout_w),
				layoutH: toNullableNumber(row.layout_h),
				rotationDeg: toNumber(row.rotation_deg),
				displayOrder: toNumber(row.display_order),
				isReserved: row.is_reserved,
				isMine: row.is_mine,
				reservationId: row.reservation_id ? createReservationId(row.reservation_id) : null,
				occupantName: row.occupant_name,
			};
		});
	}

	async listForAdmin(): Promise<AdminDeskRecord[]> {
		const result = await this.db.query(
			"select d.id, d.office_id, d.code, d.name, z.name as zone_name, d.status, d.qr_public_id " +
				"from desks d " +
				"left join zones z on z.id = d.zone_id " +
				"order by d.code asc"
		);

		return result.rows.map(raw => {
			const row = toAdminDeskRow(raw);
			return {
				id: createDeskId(row.id),
				officeId: createOfficeId(row.office_id),
				code: row.code,
				name: row.name,
				zone: row.zone_name,
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

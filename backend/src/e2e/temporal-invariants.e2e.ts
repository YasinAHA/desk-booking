import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = "postgres://deskbooking:deskbooking@localhost:5432/deskbooking";
}
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-super-largo-cambialo";
process.env.JWT_REFRESH_SECRET =
	process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-super-largo-cambialo";
process.env.ALLOWED_EMAIL_DOMAINS =
	process.env.ALLOWED_EMAIL_DOMAINS ?? "camerfirma.com";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbClient = {
	query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

const { buildApp } = await import("../app.js");

function toIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function getLocalDate(timezone: string, now = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const values = new Map(parts.map(part => [part.type, part.value]));
	return `${values.get("year") ?? ""}-${values.get("month") ?? ""}-${values.get("day") ?? ""}`;
}

function getLocalTime(timezone: string, now = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(now);
	const values = new Map(parts.map(part => [part.type, part.value]));
	return `${values.get("hour") ?? "00"}:${values.get("minute") ?? "00"}`;
}

function addMinutesToTime(value: string, minutesToAdd: number): string {
	const [h = "0", m = "0"] = value.split(":");
	const total = Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10) + minutesToAdd;
	const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
	const hour = Math.floor(normalized / 60)
		.toString()
		.padStart(2, "0");
	const minute = (normalized % 60).toString().padStart(2, "0");
	return `${hour}:${minute}`;
}

function getErrorCode(body: unknown): string | undefined {
	if (!body || typeof body !== "object") {
		return undefined;
	}
	const record = body as Record<string, unknown>;
	const nested = record.error;
	if (nested && typeof nested === "object") {
		const nestedCode = (nested as Record<string, unknown>).code;
		if (typeof nestedCode === "string") {
			return nestedCode;
		}
	}
	return typeof record.code === "string" ? record.code : undefined;
}

function getCheckInStatus(body: unknown): string | undefined {
	if (!body || typeof body !== "object") {
		return undefined;
	}
	const status = (body as Record<string, unknown>).status;
	return typeof status === "string" ? status : undefined;
}

async function createAccessToken(payload: {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
}): Promise<string> {
	const secret = process.env.JWT_SECRET ?? "dev-secret-super-largo-cambialo";
	return await new SignJWT({
		...payload,
		jti: randomUUID(),
		type: "access",
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(secret));
}

type Fixture = {
	organizationId: string;
	officeId: string;
	deskId: string;
	userId: string;
	email: string;
	qrPublicId: string;
	reservationId: string;
};

async function insertTemporalFixture(
	db: DbClient,
	input: {
		timezone: string;
		reservationDate: string;
		checkinAllowedFrom: string;
		checkinCutoffTime: string;
		status?: "reserved" | "checked_in" | "cancelled" | "no_show";
	}
): Promise<Fixture> {
	const fixture: Fixture = {
		organizationId: randomUUID(),
		officeId: randomUUID(),
		deskId: randomUUID(),
		userId: randomUUID(),
		email: `e2e-${randomUUID()}@camerfirma.com`,
		qrPublicId: `qr-${randomUUID()}`,
		reservationId: randomUUID(),
	};

	await db.query(
		"insert into organizations (id, name, email_domain) values ($1, $2, $3)",
		[fixture.organizationId, `E2E Org ${fixture.organizationId}`, `e2e-${fixture.organizationId}.camerfirma.com`]
	);
	await db.query(
		"insert into offices (id, organization_id, name, timezone) values ($1, $2, $3, $4)",
		[fixture.officeId, fixture.organizationId, `E2E Office ${fixture.officeId}`, input.timezone]
	);
	await db.query(
		"insert into reservation_policies (organization_id, office_id, max_advance_days, max_reservations_per_day, checkin_allowed_from, checkin_cutoff_time, cancellation_deadline_hours, require_email_domain_match) values ($1, $2, 30, 1, $3::time, $4::time, 1, false)",
		[fixture.organizationId, fixture.officeId, input.checkinAllowedFrom, input.checkinCutoffTime]
	);
	await db.query(
		"insert into users (id, email, password_hash, first_name, last_name, second_last_name, role, status) values ($1, $2, $3, 'E2E', 'User', null, 'user', 'active')",
		[fixture.userId, fixture.email, "hash:e2e-password"]
	);
	await db.query(
		"insert into desks (id, office_id, code, name, status, qr_public_id) values ($1, $2, $3, $4, 'active', $5)",
		[
			fixture.deskId,
			fixture.officeId,
			`E2E-${fixture.deskId.slice(0, 6)}`,
			`E2E Desk ${fixture.deskId.slice(0, 6)}`,
			fixture.qrPublicId,
		]
	);
	await db.query(
		"insert into reservations (id, user_id, desk_id, office_id, reservation_date, status, source) values ($1, $2, $3, $4, $5::date, $6, 'user')",
		[
			fixture.reservationId,
			fixture.userId,
			fixture.deskId,
			fixture.officeId,
			input.reservationDate,
			input.status ?? "reserved",
		]
	);

	return fixture;
}

async function cleanupFixture(db: DbClient, fixture: Fixture): Promise<void> {
	await db.query("delete from reservations where id = $1", [fixture.reservationId]);
	await db.query("delete from desks where id = $1", [fixture.deskId]);
	await db.query("delete from users where id = $1", [fixture.userId]);
	await db.query(
		"delete from reservation_policies where organization_id = $1 and office_id = $2",
		[fixture.organizationId, fixture.officeId]
	);
	await db.query("delete from offices where id = $1", [fixture.officeId]);
	await db.query("delete from organizations where id = $1", [fixture.organizationId]);
}

test("E2E temporal: check-in QR applies office timezone (non-UTC date)", async () => {
	const app = await buildApp();
	const db = app.db as DbClient;
	const now = new Date();
	const utcDate = toIsoDate(now);
	const timezones = ["Pacific/Kiritimati", "Etc/GMT+12"];
	const selectedTimezone =
		timezones.find(tz => getLocalDate(tz, now) !== utcDate) ?? "Pacific/Kiritimati";
	const localDate = getLocalDate(selectedTimezone, now);
	const localTime = getLocalTime(selectedTimezone, now);
	const fixture = await insertTemporalFixture(db, {
		timezone: selectedTimezone,
		reservationDate: localDate,
		checkinAllowedFrom: addMinutesToTime(localTime, -1),
		checkinCutoffTime: addMinutesToTime(localTime, 2),
	});

	try {
		const accessToken = await createAccessToken({
			id: fixture.userId,
			email: fixture.email,
			firstName: "E2E",
			lastName: "User",
			secondLastName: null,
		});

		const response = await app.inject({
			method: "POST",
			url: "/reservations/check-in/qr",
			headers: { authorization: `Bearer ${accessToken}` },
			payload: {
				date: localDate,
				qrPublicId: fixture.qrPublicId,
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(getCheckInStatus(response.json()), "checked_in");
	} finally {
		await cleanupFixture(db, fixture);
		await app.close();
	}
});

test("E2E temporal: check-in QR enforces allowed window", async () => {
	const app = await buildApp();
	const db = app.db as DbClient;
	const now = new Date();
	const timezone = "UTC";
	const reservationDate = toIsoDate(now);
	const localTime = getLocalTime(timezone, now);
	const fixture = await insertTemporalFixture(db, {
		timezone,
		reservationDate,
		checkinAllowedFrom: addMinutesToTime(localTime, 5),
		checkinCutoffTime: addMinutesToTime(localTime, 30),
	});

	try {
		const accessToken = await createAccessToken({
			id: fixture.userId,
			email: fixture.email,
			firstName: "E2E",
			lastName: "User",
			secondLastName: null,
		});

		const response = await app.inject({
			method: "POST",
			url: "/reservations/check-in/qr",
			headers: { authorization: `Bearer ${accessToken}` },
			payload: {
				date: reservationDate,
				qrPublicId: fixture.qrPublicId,
			},
		});

		assert.equal(response.statusCode, 409);
		assert.equal(getErrorCode(response.json()), "RESERVATION_NOT_ACTIVE");
	} finally {
		await cleanupFixture(db, fixture);
		await app.close();
	}
});

test("E2E temporal: no_show transition is applied before listing desks", async () => {
	const app = await buildApp();
	const db = app.db as DbClient;
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const reservationDate = toIsoDate(yesterday);
	const fixture = await insertTemporalFixture(db, {
		timezone: "UTC",
		reservationDate,
		checkinAllowedFrom: "06:00",
		checkinCutoffTime: "12:00",
		status: "reserved",
	});

	try {
		const accessToken = await createAccessToken({
			id: fixture.userId,
			email: fixture.email,
			firstName: "E2E",
			lastName: "User",
			secondLastName: null,
		});

		const response = await app.inject({
			method: "GET",
			url: `/desks?date=${reservationDate}`,
			headers: { authorization: `Bearer ${accessToken}` },
		});

		assert.equal(response.statusCode, 200);

		const statusResult = await db.query(
			"select status from reservations where id = $1",
			[fixture.reservationId]
		);
		const row = statusResult.rows[0] as { status?: string } | undefined;
		assert.equal(row?.status, "no_show");
	} finally {
		await cleanupFixture(db, fixture);
		await app.close();
	}
});

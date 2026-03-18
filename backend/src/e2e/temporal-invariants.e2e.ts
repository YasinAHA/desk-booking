import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { SignJWT } from "jose";
import { API_V1_PREFIX } from "@config/api-prefix.js";

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
		startsAt?: Date;
		endsAt?: Date;
		checkinDeadlineAt?: Date;
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
		"insert into reservations (id, user_id, desk_id, office_id, starts_at, ends_at, checkin_deadline_at, status, source) " +
			"values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7::timestamptz, $8, 'user')",
		[
			fixture.reservationId,
			fixture.userId,
			fixture.deskId,
			fixture.officeId,
			(input.startsAt ?? new Date(`${input.reservationDate}T08:00:00.000Z`)).toISOString(),
			(input.endsAt ?? new Date(`${input.reservationDate}T16:00:00.000Z`)).toISOString(),
			(input.checkinDeadlineAt ?? new Date(`${input.reservationDate}T12:00:00.000Z`)).toISOString(),
			input.status ?? "reserved",
		]
	);

	return fixture;
}

async function cleanupFixture(db: DbClient, fixture: Fixture): Promise<void> {
	await db.query("delete from reservations where id = $1", [fixture.reservationId]);
	await db.query("delete from desks where id = $1", [fixture.deskId]);
	await db.query("delete from users where id = $1", [fixture.userId]);
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
	const fixture = await insertTemporalFixture(db, {
		timezone: selectedTimezone,
		reservationDate: localDate,
		startsAt: new Date(now.getTime() - 15 * 60 * 1000),
		endsAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
		checkinDeadlineAt: new Date(now.getTime() + 15 * 60 * 1000),
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
			url: `${API_V1_PREFIX}/reservations/check-in/qr`,
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
	const fixture = await insertTemporalFixture(db, {
		timezone,
		reservationDate,
		startsAt: new Date(now.getTime() - 30 * 60 * 1000),
		endsAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
		checkinDeadlineAt: new Date(now.getTime() - 5 * 60 * 1000),
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
			url: `${API_V1_PREFIX}/reservations/check-in/qr`,
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
		startsAt: new Date(`${reservationDate}T08:00:00.000Z`),
		endsAt: new Date(`${reservationDate}T16:00:00.000Z`),
		checkinDeadlineAt: new Date(`${reservationDate}T12:00:00.000Z`),
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
			url: `${API_V1_PREFIX}/desks?date=${reservationDate}`,
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

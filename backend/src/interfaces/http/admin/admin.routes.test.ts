import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import Fastify from "fastify";
import { SignJWT } from "jose";

process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
process.env.JWT_SECRET = "test-secret";

const { adminRoutes } = await import("./admin.routes.js");
const { registerAuthPlugin } = await import("@interfaces/http/plugins/auth.js");

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

async function buildToken(userId = "admin-1"): Promise<string> {
	return await new SignJWT({
		id: userId,
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
		jti: randomUUID(),
		type: "access",
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret"));
}

async function buildTestApp(query: DbQuery, authenticatedUserId = "admin-1") {
	const app = Fastify({ logger: false });
	app.decorate("db", { query });
	app.decorate("runtimeAppSettings", {
		get: () => ({
			checkinWindowMinutes: 15,
			defaultReservationDurationMinutes: 480,
		}),
		apply: () => {},
		refresh: async () => ({
			checkinWindowMinutes: 15,
			defaultReservationDurationMinutes: 480,
		}),
	});

	const authSessionLifecycleService = {
		async verifyAccessToken() {
			return {
				id: authenticatedUserId,
				email: "admin@camerfirma.com",
				firstName: "Admin",
				lastName: "User",
				secondLastName: null,
				jti: randomUUID(),
				type: "access" as const,
				iat: Math.floor(Date.now() / 1000),
			};
		},
	} as unknown as import("@application/auth/services/auth-session-lifecycle.service.js").AuthSessionLifecycleService;

	await app.register(registerAuthPlugin, { authSessionLifecycleService });
	await app.register(adminRoutes, { prefix: "/admin" });
	await app.ready();
	return app;
}

test("GET /admin/settings returns 401 without token", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));
	const res = await app.inject({ method: "GET", url: "/admin/settings" });
	assert.equal(res.statusCode, 401);
	await app.close();
});

test("GET /admin/settings returns 403 for non-admin", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (params?.[0] === "user-1") {
			return { rows: [{ role: "user" }] };
		}
		return { rows: [] };
	}, "user-1");

	const res = await app.inject({
		method: "GET",
		url: "/admin/settings",
		headers: { Authorization: `Bearer ${await buildToken("user-1")}` },
	});

	assert.equal(res.statusCode, 403);
	await app.close();
});

test("GET /admin/settings returns settings for admin", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from app_settings")) {
			return {
				rows: [{
					id: "33333333-3333-3333-8333-333333333333",
					allow_self_registration: true,
					guest_mode_enabled: true,
					checkin_window_minutes: 15,
					max_advance_days: 7,
					max_reservations_per_user: 1,
					cancellation_deadline_minutes: 120,
					default_reservation_duration_minutes: 480,
					business_hours_start: "08:00:00",
					business_hours_end: "20:00:00",
					allowed_email_domains: ["camerfirma.com"],
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/settings",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.guestModeEnabled, true);
	await app.close();
});

test("GET /admin/settings self-heals missing global app_settings row", async () => {
	let globalSettingsReady = false;
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("insert into app_settings (scope_type")) {
			globalSettingsReady = true;
			return { rows: [], rowCount: 1 };
		}
		if (text.includes("from app_settings")) {
			if (!globalSettingsReady) {
				return { rows: [] };
			}
			return {
				rows: [{
					id: "44444444-4444-4444-8444-444444444444",
					allow_self_registration: true,
					guest_mode_enabled: true,
					checkin_window_minutes: 15,
					max_advance_days: 7,
					max_reservations_per_user: 1,
					cancellation_deadline_minutes: 120,
					default_reservation_duration_minutes: 480,
					business_hours_start: "08:00:00",
					business_hours_end: "20:00:00",
					allowed_email_domains: [],
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/settings",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.allowSelfRegistration, true);
	assert.equal(body.checkinWindowMinutes, 15);
	await app.close();
});

test("GET /admin/desks returns filtered paginated desks for admin", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("count(*)::int as total from desks d")) {
			return { rows: [{ total: 1 }] };
		}
		if (text.includes("from desks d")) {
			return {
				rows: [{
					id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					zone_id: "c1111111-1111-4111-8111-111111111111",
					zone_name: "Zona A",
					code: "D-01",
					name: "Desk 01",
					status: "active",
					status_reason: null,
					qr_public_id: "qr-111",
					layout_x: 10,
					layout_y: 20,
					layout_w: 1,
					layout_h: 1,
					rotation_deg: 0,
					display_order: 1,
					archived_at: null,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/desks?status=active&q=D-01&page=1&pageSize=10&sortBy=deskCode&sortDir=asc",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.total, 1);
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
	assert.equal(body.items.length, 1);
	assert.equal(body.items[0]?.code, "D-01");
	await app.close();
});

test("GET /admin/desks returns 400 for invalid pagination query", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "GET",
		url: "/admin/desks?page=0",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /admin/desks/:id/layout updates layout values", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("with updated as (update desks set")) {
			return {
				rows: [{
					id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					zone_id: "c1111111-1111-4111-8111-111111111111",
					zone_name: "Zona A",
					code: "D-01",
					name: "Desk 01",
					status: "active",
					status_reason: null,
					qr_public_id: "qr-111",
					layout_x: 30,
					layout_y: 40,
					layout_w: 1.2,
					layout_h: 1.1,
					rotation_deg: 15,
					display_order: 5,
					archived_at: null,
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/desks/a1111111-1111-4111-8111-111111111111/layout",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			layoutX: 30,
			layoutY: 40,
			layoutW: 1.2,
			layoutH: 1.1,
			rotationDeg: 15,
			displayOrder: 5,
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.layoutX, 30);
	assert.equal(body.rotationDeg, 15);
	await app.close();
});

test("PATCH /admin/desks/layout/bulk updates multiple desks", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from jsonb_array_elements($1::jsonb)")) {
			return {
				rows: [{
					id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					zone_id: "c1111111-1111-4111-8111-111111111111",
					zone_name: "Zona A",
					code: "D-01",
					name: "Desk 01",
					status: "active",
					status_reason: null,
					qr_public_id: "qr-111",
					layout_x: 320,
					layout_y: 540,
					layout_w: 1,
					layout_h: 1,
					rotation_deg: 0,
					display_order: 10,
					archived_at: null,
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/desks/layout/bulk",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			items: [{
				id: "a1111111-1111-4111-8111-111111111111",
				layoutX: 320,
				layoutY: 540,
				displayOrder: 10,
			}],
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.updated, 1);
	assert.equal(body.items[0]?.layoutX, 320);
	await app.close();
});

test("PATCH /admin/desks/layout/bulk returns 400 for invalid payload", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/desks/layout/bulk",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			items: [{
				id: "a1111111-1111-4111-8111-111111111111",
			}],
		},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("POST /admin/desks/layout/restore restores desks layout by office", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update desks d set") && text.includes("layout_x = null")) {
			return {
				rows: [{
					id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					zone_id: "c1111111-1111-4111-8111-111111111111",
					zone_name: "Zona A",
					code: "D-01",
					name: "Desk 01",
					status: "active",
					status_reason: null,
					qr_public_id: "qr-111",
					layout_x: null,
					layout_y: null,
					layout_w: null,
					layout_h: null,
					rotation_deg: 0,
					display_order: 0,
					archived_at: null,
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/desks/layout/restore",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			officeId: "b1111111-1111-4111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.updated, 1);
	assert.equal(body.items[0]?.layoutX, null);
	assert.equal(body.items[0]?.displayOrder, 0);
	await app.close();
});

test("POST /admin/desks/layout/restore returns 400 for invalid payload", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "POST",
		url: "/admin/desks/layout/restore",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /admin/desks/:id/status returns 404 for unknown desk", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("with updated as (update desks set status =")) {
			return { rows: [], rowCount: 0 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/desks/a2222222-1111-4111-8111-111111111111/status",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { status: "maintenance", statusReason: "Maintenance window" },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("POST /admin/desk-blocks creates desk block", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("insert into desk_blocks")) {
			return {
				rows: [{
					id: "d1111111-1111-4111-8111-111111111111",
					desk_id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					start_at: "2026-04-01T09:00:00.000Z",
					end_at: "2026-04-01T18:00:00.000Z",
					reason: "Mantenimiento",
					created_by: "admin-1",
					created_at: "2026-03-20T10:00:00.000Z",
				}],
				rowCount: 1,
			};
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/desk-blocks",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			deskId: "a1111111-1111-4111-8111-111111111111",
			startAt: "2026-04-01T09:00:00.000Z",
			endAt: "2026-04-01T18:00:00.000Z",
			reason: "Mantenimiento",
		},
	});

	assert.equal(res.statusCode, 201);
	const body = res.json();
	assert.equal(body.deskId, "a1111111-1111-4111-8111-111111111111");
	assert.equal(body.reason, "Mantenimiento");
	await app.close();
});

test("POST /admin/desk-blocks returns 400 for invalid range payload", async () => {
	const app = await buildTestApp(async () => ({ rows: [], rowCount: 0 }));

	const res = await app.inject({
		method: "POST",
		url: "/admin/desk-blocks",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			deskId: "a1111111-1111-4111-8111-111111111111",
			startAt: "2026-04-01T18:00:00.000Z",
			endAt: "2026-04-01T09:00:00.000Z",
		},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("GET /admin/floorplan returns office config", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from offices where id =")) {
			return {
				rows: [{
					office_id: "b1111111-1111-4111-8111-111111111111",
					floorplan_image_url: "https://cdn.example/floorplan.png",
					canvas_width: 1200,
					canvas_height: 800,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/floorplan?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.canvasWidth, 1200);
	assert.equal(body.effectiveCanvasWidth, 1200);
	assert.equal(body.effectiveCanvasHeight, 800);
	assert.equal(body.hasBackgroundImage, true);
	assert.equal(body.floorplanImageUrl, "https://cdn.example/floorplan.png");
	await app.close();
});

test("GET /admin/floorplan returns effective fallback canvas when values are null", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from offices where id =")) {
			return {
				rows: [{
					office_id: "b1111111-1111-4111-8111-111111111111",
					floorplan_image_url: null,
					canvas_width: null,
					canvas_height: null,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/floorplan?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.canvasWidth, null);
	assert.equal(body.canvasHeight, null);
	assert.equal(body.effectiveCanvasWidth, 1600);
	assert.equal(body.effectiveCanvasHeight, 900);
	assert.equal(body.hasBackgroundImage, false);
	await app.close();
});

test("GET /admin/floorplan returns 400 when officeId is missing", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "GET",
		url: "/admin/floorplan",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /admin/floorplan updates config for existing office", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update offices set")) {
			return {
				rows: [{
					office_id: "b1111111-1111-4111-8111-111111111111",
					floorplan_image_url: "https://cdn.example/new-floorplan.png",
					canvas_width: 1600,
					canvas_height: 900,
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/floorplan?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			floorplanImageUrl: "https://cdn.example/new-floorplan.png",
			canvasWidth: 1600,
			canvasHeight: 900,
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.floorplanImageUrl, "https://cdn.example/new-floorplan.png");
	assert.equal(body.canvasWidth, 1600);
	assert.equal(body.canvasHeight, 900);
	assert.equal(body.effectiveCanvasWidth, 1600);
	assert.equal(body.effectiveCanvasHeight, 900);
	assert.equal(body.hasBackgroundImage, true);
	await app.close();
});

test("PATCH /admin/floorplan returns 400 for empty payload", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/floorplan?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /admin/floorplan returns 400 for invalid canvas size", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/floorplan?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			canvasWidth: 0,
		},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("PATCH /admin/floorplan returns 404 when office does not exist", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update offices set")) {
			return { rows: [], rowCount: 0 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/floorplan?officeId=b9999999-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			canvasWidth: 1400,
			canvasHeight: 900,
		},
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("GET /admin/floorplan/overlays returns overlays for office", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from floorplan_overlays")) {
			return {
				rows: [{
					id: "f1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					label: "SALA ABIERTA",
					kind: "area",
					x: 220,
					y: 120,
					w: 360,
					h: 220,
					rotation_deg: 0,
					stroke_color: "#87d6d3",
					fill_color: "rgba(135,214,211,0.15)",
					display_order: 1,
					created_at: "2026-05-01T08:00:00.000Z",
					updated_at: "2026-05-01T08:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/floorplan/overlays?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items.length, 1);
	assert.equal(body.items[0]?.label, "SALA ABIERTA");
	assert.equal(body.items[0]?.kind, "area");
	await app.close();
});

test("POST /admin/floorplan/overlays creates overlay", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("insert into floorplan_overlays")) {
			return {
				rows: [{
					id: "f2222222-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					label: "SALA ROMA",
					kind: "room",
					x: 710,
					y: 280,
					w: 120,
					h: 160,
					rotation_deg: 0,
					stroke_color: "#d6d8de",
					fill_color: null,
					display_order: 2,
					created_at: "2026-05-01T08:00:00.000Z",
					updated_at: "2026-05-01T08:00:00.000Z",
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/floorplan/overlays?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			label: "SALA ROMA",
			kind: "room",
			x: 710,
			y: 280,
			w: 120,
			h: 160,
			displayOrder: 2,
		},
	});

	assert.equal(res.statusCode, 201);
	const body = res.json();
	assert.equal(body.label, "SALA ROMA");
	assert.equal(body.kind, "room");
	await app.close();
});

test("PATCH /admin/floorplan/overlays/:id returns 404 when overlay does not exist", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update floorplan_overlays set")) {
			return { rows: [], rowCount: 0 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/floorplan/overlays/f3333333-1111-4111-8111-111111111111?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			label: "SALA ENTRADA",
		},
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("DELETE /admin/floorplan/overlays/:id returns ok response", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("delete from floorplan_overlays")) {
			return { rows: [], rowCount: 1 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "DELETE",
		url: "/admin/floorplan/overlays/f4444444-1111-4111-8111-111111111111?officeId=b1111111-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	assert.equal(res.json().ok, true);
	await app.close();
});

test("GET /admin/desks/qr returns qr listing", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("count(*)::int as total from desks d")) {
			return { rows: [{ total: 1 }] };
		}
		if (text.includes("from desks d") && text.includes("qr_public_id")) {
			return {
				rows: [{
					desk_id: "a1111111-1111-4111-8111-111111111111",
					office_id: "b1111111-1111-4111-8111-111111111111",
					desk_code: "P01",
					desk_name: "Puesto 01",
					zone_name: "Sala Abierta",
					status: "active",
					qr_public_id: "qr-public-001",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/desks/qr?officeId=b1111111-1111-4111-8111-111111111111&page=1&pageSize=10&sortBy=deskCode&sortDir=asc",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.total, 1);
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
	assert.equal(body.items.length, 1);
	assert.equal(body.items[0]?.deskCode, "P01");
	await app.close();
});

test("GET /admin/desks/qr returns 400 for invalid pagination query", async () => {
	const app = await buildTestApp(async () => ({ rows: [] }));

	const res = await app.inject({
		method: "GET",
		url: "/admin/desks/qr?page=0",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

test("POST /admin/desks/qr/regenerate-bulk returns updated count", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.startsWith("update desks set qr_public_id")) {
			return { rows: [], rowCount: 15 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/desks/qr/regenerate-bulk",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			officeId: "b1111111-1111-4111-8111-111111111111",
		},
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.ok, true);
	assert.equal(body.updated, 15);
	await app.close();
});

test("GET /admin/users returns paginated users for admin", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("count(*)::int as total from users")) {
			return { rows: [{ total: 1 }] };
		}
		if (text.includes("from users u")) {
			return {
				rows: [{
					id: "aaaaaaa1-1111-4111-8111-111111111111",
					email: "laura@camerfirma.com",
					first_name: "Laura",
					last_name: "Fernandez",
					second_last_name: null,
					role: "admin",
					status: "active",
					created_at: "2026-04-18T10:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/users?q=laura&role=admin&status=active&page=1&pageSize=10",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.total, 1);
	assert.equal(body.items[0]?.email, "laura@camerfirma.com");
	await app.close();
});

test("PATCH /admin/users/:id updates role/status", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update users set")) {
			return {
				rows: [{
					id: "aaaaaaa1-1111-4111-8111-111111111111",
					email: "ana@camerfirma.com",
					first_name: "Ana",
					last_name: "Lopez",
					second_last_name: null,
					role: "admin",
					status: "suspended",
					created_at: "2026-04-18T10:00:00.000Z",
				}],
				rowCount: 1,
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/users/aaaaaaa1-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { role: "admin", status: "suspended" },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.status, "suspended");
	assert.equal(body.role, "admin");
	await app.close();
});

test("PATCH /admin/users/:id returns 404 when user does not exist", async () => {
	const app = await buildTestApp(async (text) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("update users set")) {
			return { rows: [], rowCount: 0 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/users/bbbbbbb1-1111-4111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { status: "active" },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("POST /admin/reservations creates guest reservation", async () => {
	const app = await buildTestApp(async (_text, params) => {
		if (_text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (Array.isArray(params) && params.length >= 11) {
			return { rows: [{ id: "44444444-4444-4444-8444-444444444444" }], rowCount: 1 };
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "POST",
		url: "/admin/reservations",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: {
			reservationType: "guest",
			hostUserId: "11111111-1111-1111-8111-111111111111",
			deskId: "22222222-2222-2222-8222-222222222222",
			startsAt: "2026-04-01T09:00:00.000Z",
			endsAt: "2026-04-01T18:00:00.000Z",
			guestName: "Invitado Demo",
			guestEmail: "invitado@externo.com",
		},
	});

	assert.equal(res.statusCode, 201);
	const body = res.json();
	assert.equal(body.ok, true);
	await app.close();
});

test("PATCH /admin/reservations/:id returns 404 when reservation does not exist", async () => {
	const app = await buildTestApp(async (_text, _params) => {
		if (_text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		return { rows: [], rowCount: 0 };
	});

	const res = await app.inject({
		method: "PATCH",
		url: "/admin/reservations/55555555-5555-5555-8555-555555555555",
		headers: { Authorization: `Bearer ${await buildToken()}` },
		payload: { status: "cancelled" },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

test("GET /admin/reports/summary returns aggregate counters", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("total_reservations")) {
			return {
				rows: [{
					total_reservations: 8,
					checked_in: 5,
					cancelled: 2,
					no_show: 1,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/summary?start=2026-04-01&end=2026-04-30",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.totalReservations, 8);
	assert.equal(body.noShow, 1);
	await app.close();
});

test("GET /admin/reports/cancellations returns grouped results", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("avg_cancellation_lead_minutes")) {
			return {
				rows: [{
					cancellation_date: "2026-04-01",
					actor_user_id: "11111111-1111-1111-8111-111111111111",
					actor_email: "maria@camerfirma.com",
					cancellations: 3,
					avg_cancellation_lead_minutes: 180,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/cancellations?start=2026-04-01&end=2026-04-30",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items[0]?.cancellations, 3);
	await app.close();
});

test("GET /admin/reports/audit-log supports actor filter", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("from audit_events")) {
			return {
				rows: [{
					id: "88888888-8888-4888-8888-888888888888",
					event_type: "reservation_cancelled",
					actor_type: "admin",
					actor_user_id: "11111111-1111-1111-8111-111111111111",
					actor_email: "admin@camerfirma.com",
					reservation_id: "99999999-9999-4999-8999-999999999999",
					desk_id: "22222222-2222-2222-8222-222222222222",
					office_id: "33333333-3333-3333-8333-333333333333",
					reason: "Policy update",
					metadata: { source: "admin-panel" },
					created_at: "2026-04-18T10:00:00.000Z",
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/audit-log?start=2026-04-01&end=2026-04-30&actorId=11111111-1111-1111-8111-111111111111",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	const body = res.json();
	assert.equal(body.items[0]?.eventType, "reservation_cancelled");
	await app.close();
});

test("GET /admin/reports/summary format=csv returns attachment", async () => {
	const app = await buildTestApp(async (text, _params) => {
		if (text.includes("select role from users where id = $1")) {
			return { rows: [{ role: "admin" }] };
		}
		if (text.includes("total_reservations")) {
			return {
				rows: [{
					total_reservations: 2,
					checked_in: 1,
					cancelled: 1,
					no_show: 0,
				}],
			};
		}
		return { rows: [] };
	});

	const res = await app.inject({
		method: "GET",
		url: "/admin/reports/summary?start=2026-04-01&end=2026-04-30&format=csv",
		headers: { Authorization: `Bearer ${await buildToken()}` },
	});

	assert.equal(res.statusCode, 200);
	assert.match(res.headers["content-type"] ?? "", /text\/csv/);
	assert.match(res.headers["content-disposition"] ?? "", /summary-2026-04-01-2026-04-30\.csv/);
	assert.match(res.body, /totalReservations/);
	await app.close();
});


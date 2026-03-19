import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { API_V1_PREFIX } from "@config/api-prefix.js";
import { env } from "@config/env.js";
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
	resetPasswordSchema,
	verifySchema,
} from "@interfaces/http/auth/auth.schemas.js";
import {
	deskIdParamSchema,
	listDesksSchema,
} from "@interfaces/http/desks/desks.schemas.js";
import {
	checkInByQrSchema,
	createReservationSchema,
	reservationIdParamSchema,
} from "@interfaces/http/reservations/reservations.schemas.js";
import {
	adminAuditLogQuerySchema,
	adminFloorplanOverlayCreateSchema,
	adminFloorplanOverlayIdParamSchema,
	adminFloorplanOverlayPatchSchema,
	adminFloorplanQuerySchema,
	adminReportsQuerySchema,
	adminReservationStatusPatchSchema,
	adminReservationsQuerySchema,
	adminDeskQrsQuerySchema,
	adminDesksQuerySchema,
	adminSettingsPatchSchema,
	adminUserPatchSchema,
	adminUsersQuerySchema,
	createAdminReservationSchema,
} from "@interfaces/http/admin/admin.schemas.js";
import {
	errorResponseSchema,
	tokenSchema,
	uuidSchema,
} from "@interfaces/http/schemas/common-schemas.js";
import {
	userPreferencesLanguageSchema,
	userPreferencesPatchSchema,
	userPreferencesThemeSchema,
} from "@interfaces/http/me/me.schemas.js";
import { z } from "zod";

extendZodWithOpenApi(z);

const authUserSchema = z.object({
	id: uuidSchema,
	email: z.email(),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	secondLastName: z.string().nullable(),
});

const okSchema = z.object({
	ok: z.literal(true),
});

const loginResponseSchema = z.object({
	accessToken: tokenSchema,
	refreshToken: tokenSchema,
	user: authUserSchema,
});

const verifyResponseSchema = z.object({
	valid: z.literal(true),
	user: authUserSchema,
});

const tokenQuerySchema = z.object({
	token: tokenSchema,
});

const listDesksResponseSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	items: z.array(
		z.object({
			id: uuidSchema,
			officeId: uuidSchema,
			zoneId: uuidSchema.nullable(),
			code: z.string(),
			name: z.string().nullable(),
			zone: z.string().nullable(),
			status: z.enum(["active", "maintenance", "disabled"]),
			layoutX: z.number().nullable(),
			layoutY: z.number().nullable(),
			layoutW: z.number().nullable(),
			layoutH: z.number().nullable(),
			rotationDeg: z.number(),
			displayOrder: z.number().int(),
			isReserved: z.boolean(),
			isMine: z.boolean(),
			reservationId: uuidSchema.nullable(),
			occupantName: z.string().nullable(),
		})
	),
});

const adminDesksResponseSchema = z.object({
	items: z.array(
		z.object({
			id: uuidSchema,
			officeId: uuidSchema,
			code: z.string(),
			name: z.string().nullable(),
			zone: z.string().nullable(),
			status: z.enum(["active", "maintenance", "disabled"]),
			qrPublicId: z.string().min(10),
		})
	),
});

const regenerateDeskQrResponseSchema = z.object({
	ok: z.literal(true),
	deskId: uuidSchema,
	qrPublicId: z.string().min(10),
});

const regenerateAllQrResponseSchema = z.object({
	ok: z.literal(true),
	updated: z.number().int().nonnegative(),
});

const createReservationResponseSchema = z.object({
	ok: z.literal(true),
	reservationId: uuidSchema,
});

const checkInByQrResponseSchema = z.object({
	ok: z.literal(true),
	status: z.enum(["checked_in", "already_checked_in"]),
});

const listReservationsResponseSchema = z.object({
	items: z.array(
		z.object({
			reservationId: uuidSchema,
			deskId: uuidSchema,
			officeId: uuidSchema,
			deskName: z.string(),
			reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			startsAt: z.iso.datetime().optional(),
			endsAt: z.iso.datetime().optional(),
			status: z.enum(["reserved", "checked_in", "cancelled", "no_show"]),
			source: z.enum(["user", "admin", "walk_in", "system"]),
			cancelledAt: z.string().nullable(),
		})
	),
});

const metricsResponseSchema = z.object({
	startedAt: z.number().int().nonnegative(),
	uptimeSeconds: z.number().int().nonnegative(),
	totals: z.object({
		count: z.number().int().nonnegative(),
		errors4xx: z.number().int().nonnegative(),
		errors5xx: z.number().int().nonnegative(),
	}),
	routes: z.record(
		z.string(),
		z.object({
			count: z.number().int().nonnegative(),
			errors4xx: z.number().int().nonnegative(),
			errors5xx: z.number().int().nonnegative(),
			avgMs: z.number().nonnegative(),
			p95Ms: z.number().nonnegative(),
		})
	),
});

const userPreferencesResponseSchema = z.object({
	userId: uuidSchema,
	theme: userPreferencesThemeSchema,
	language: userPreferencesLanguageSchema,
	timezone: z.string(),
	emailNotificationsEnabled: z.boolean(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

const adminSettingsResponseSchema = z.object({
	id: uuidSchema,
	allowSelfRegistration: z.boolean(),
	guestModeEnabled: z.boolean(),
	checkinWindowMinutes: z.number().int().positive(),
	maxAdvanceDays: z.number().int().nonnegative(),
	maxReservationsPerUser: z.number().int().positive(),
	cancellationDeadlineMinutes: z.number().int().nonnegative(),
	defaultReservationDurationMinutes: z.number().int().positive(),
	businessHoursStart: z.string(),
	businessHoursEnd: z.string(),
	allowedEmailDomains: z.array(z.string()),
});

const adminDeskSchema = z.object({
	id: uuidSchema,
	officeId: uuidSchema,
	zoneId: uuidSchema.nullable(),
	zoneName: z.string().nullable(),
	code: z.string(),
	name: z.string().nullable(),
	status: z.enum(["active", "maintenance", "disabled"]),
	statusReason: z.string().nullable(),
	qrPublicId: z.string(),
	layoutX: z.number().nullable(),
	layoutY: z.number().nullable(),
	layoutW: z.number().nullable(),
	layoutH: z.number().nullable(),
	rotationDeg: z.number(),
	displayOrder: z.number().int(),
	archivedAt: z.string().nullable(),
});

const adminDesksListResponseSchema = z.object({
	items: z.array(adminDeskSchema),
});

const adminDeskLayoutPatchOpenApiSchema = z.object({
	layoutX: z.number().nullable().optional(),
	layoutY: z.number().nullable().optional(),
	layoutW: z.number().nullable().optional(),
	layoutH: z.number().nullable().optional(),
	rotationDeg: z.number().min(-360).max(360).optional(),
	displayOrder: z.number().int().optional(),
});

const adminDeskStatusPatchOpenApiSchema = z.object({
	status: z.enum(["active", "maintenance", "disabled"]),
	statusReason: z.string().nullable().optional(),
});

const adminDeskIdParamOpenApiSchema = z.object({
	id: uuidSchema,
});

const adminFloorplanConfigSchema = z.object({
	officeId: uuidSchema,
	floorplanImageUrl: z.string().nullable(),
	canvasWidth: z.number().int().nullable(),
	canvasHeight: z.number().int().nullable(),
	effectiveCanvasWidth: z.number().int().positive(),
	effectiveCanvasHeight: z.number().int().positive(),
	hasBackgroundImage: z.boolean(),
});

const adminFloorplanPatchOpenApiSchema = z.object({
	floorplanImageUrl: z.string().nullable().optional(),
	canvasWidth: z.number().int().positive().nullable().optional(),
	canvasHeight: z.number().int().positive().nullable().optional(),
});

const adminFloorplanOverlaySchema = z.object({
	id: uuidSchema,
	officeId: uuidSchema,
	label: z.string(),
	kind: z.enum(["room", "area", "facility"]),
	x: z.number(),
	y: z.number(),
	w: z.number().positive(),
	h: z.number().positive(),
	rotationDeg: z.number().min(-360).max(360),
	strokeColor: z.string().nullable(),
	fillColor: z.string().nullable(),
	displayOrder: z.number().int(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

const adminFloorplanOverlaysListResponseSchema = z.object({
	items: z.array(adminFloorplanOverlaySchema),
});

const adminDeskQrSchema = z.object({
	deskId: uuidSchema,
	officeId: uuidSchema,
	deskCode: z.string(),
	deskName: z.string().nullable(),
	zoneName: z.string().nullable(),
	status: z.enum(["active", "maintenance", "disabled"]),
	qrPublicId: z.string(),
});

const adminDeskQrsListResponseSchema = z.object({
	items: z.array(adminDeskQrSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

const adminDeskQrsBulkRequestOpenApiSchema = z.object({
	officeId: uuidSchema.optional(),
});

const adminUserSchema = z.object({
	id: uuidSchema,
	email: z.email(),
	firstName: z.string(),
	lastName: z.string(),
	secondLastName: z.string().nullable(),
	role: z.enum(["user", "admin"]),
	status: z.enum(["active", "suspended"]),
	createdAt: z.iso.datetime(),
});

const adminUsersListResponseSchema = z.object({
	items: z.array(adminUserSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

const adminUserIdParamOpenApiSchema = z.object({
	id: uuidSchema,
});

const adminReservationsListResponseSchema = z.object({
	items: z.array(
		z.object({
			id: uuidSchema,
			reservationType: z.enum(["internal", "guest"]),
			userId: uuidSchema.nullable(),
			hostUserId: uuidSchema.nullable(),
			deskId: uuidSchema,
			officeId: uuidSchema,
			startsAt: z.string(),
			endsAt: z.string(),
			status: z.enum(["reserved", "checked_in", "cancelled", "no_show"]),
			source: z.enum(["user", "admin", "walk_in", "system"]),
			guestName: z.string().nullable(),
			guestEmail: z.string().nullable(),
			guestCompany: z.string().nullable(),
		})
	),
});

const adminCreateReservationResponseSchema = z.object({
	ok: z.literal(true),
	reservationId: uuidSchema,
});

const adminOccupancyReportResponseSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	items: z.array(
		z.object({
			deskId: uuidSchema,
			deskCode: z.string(),
			zoneName: z.string().nullable(),
			totalSlots: z.number().int().nonnegative(),
			occupiedSlots: z.number().int().nonnegative(),
			occupancyRate: z.number().nonnegative(),
		})
	),
});

const adminNoShowsReportResponseSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	items: z.array(
		z.object({
			actorUserId: uuidSchema,
			actorEmail: z.string().nullable(),
			noShows: z.number().int().nonnegative(),
		})
	),
});

const adminCancellationsReportResponseSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	items: z.array(
		z.object({
			cancellationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			actorUserId: uuidSchema,
			actorEmail: z.string().nullable(),
			cancellations: z.number().int().nonnegative(),
			avgCancellationLeadMinutes: z.number().nonnegative(),
		})
	),
});

const adminAuditLogReportResponseSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	items: z.array(
		z.object({
			id: uuidSchema,
			eventType: z.string(),
			actorType: z.enum(["user", "admin", "system"]),
			actorUserId: uuidSchema.nullable(),
			actorEmail: z.string().nullable(),
			reservationId: uuidSchema.nullable(),
			deskId: uuidSchema.nullable(),
			officeId: uuidSchema.nullable(),
			reason: z.string().nullable(),
			metadata: z.unknown().nullable(),
			createdAt: z.iso.datetime(),
		})
	),
});

const adminSummaryReportResponseSchema = z.object({
	start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	totalReservations: z.number().int().nonnegative(),
	checkedIn: z.number().int().nonnegative(),
	cancelled: z.number().int().nonnegative(),
	noShow: z.number().int().nonnegative(),
});

function json(schema: z.ZodTypeAny) {
	return {
		"application/json": { schema },
	};
}

function err(description: string) {
	return {
		description,
		content: json(errorResponseSchema),
	};
}

type BuildOpenApiOptions = {
	version?: string;
};

export function buildOpenApiDocument(options?: BuildOpenApiOptions) {
	const version = options?.version ?? "0.8.0";
	const registry = new OpenAPIRegistry();

	registry.registerComponent("securitySchemes", "bearerAuth", {
		type: "http",
		scheme: "bearer",
		bearerFormat: "JWT",
	});

	registry.registerPath({
		method: "get",
		path: "/health",
		tags: ["health"],
		responses: {
			200: { description: "API health status", content: json(okSchema) },
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/login",
		tags: ["auth"],
		request: { body: { required: true, content: json(loginSchema) } },
		responses: {
			200: { description: "Authenticated session created", content: json(loginResponseSchema) },
			400: err("Invalid payload"),
			401: err("Invalid credentials"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/verify",
		tags: ["auth"],
		request: { body: { required: true, content: json(verifySchema) } },
		responses: {
			200: { description: "Token is valid", content: json(verifyResponseSchema) },
			400: err("Invalid payload"),
			401: err("Invalid token"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/register",
		tags: ["auth"],
		request: { body: { required: true, content: json(registerSchema) } },
		responses: {
			200: { description: "Registration accepted", content: json(okSchema) },
			400: err("Invalid payload"),
			403: err("Email domain not allowed"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/forgot-password",
		tags: ["auth"],
		request: { body: { required: true, content: json(forgotPasswordSchema) } },
		responses: {
			200: { description: "Recovery flow processed", content: json(okSchema) },
			400: err("Invalid payload"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/reset-password",
		tags: ["auth"],
		request: { body: { required: true, content: json(resetPasswordSchema) } },
		responses: {
			200: { description: "Password updated", content: json(okSchema) },
			400: err("Invalid or expired token"),
			409: err("Token already used"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/change-password",
		tags: ["auth"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(changePasswordSchema) } },
		responses: {
			200: { description: "Password changed", content: json(okSchema) },
			400: err("Invalid payload"),
			401: err("Invalid credentials"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/refresh",
		tags: ["auth"],
		responses: {
			200: {
				description: "Access and refresh tokens rotated",
				content: json(
					z.object({
						accessToken: tokenSchema,
						refreshToken: tokenSchema,
					})
				),
			},
			403: err("Invalid request origin"),
			401: err("Invalid refresh token or missing cookie"),
			429: err("Too many requests"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/auth/confirm",
		tags: ["auth"],
		request: { query: tokenQuerySchema },
		responses: {
			200: { description: "Email confirmed", content: json(okSchema) },
			400: err("Invalid or expired token"),
			409: err("Email already confirmed"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/auth/logout",
		tags: ["auth"],
		security: [{ bearerAuth: [] }],
		responses: {
			204: { description: "Logged out" },
			403: err("Invalid request origin"),
			401: err("Invalid refresh token"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/desks",
		tags: ["desks"],
		security: [{ bearerAuth: [] }],
		request: { query: listDesksSchema },
		responses: {
			200: { description: "Desks for date and user", content: json(listDesksResponseSchema) },
			400: err("Invalid date"),
			401: err("Unauthorized"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/desks/admin",
		tags: ["desks"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "Admin desks listing", content: json(adminDesksResponseSchema) },
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/desks/admin/{id}/qr/regenerate",
		tags: ["desks"],
		security: [{ bearerAuth: [] }],
		request: { params: deskIdParamSchema },
		responses: {
			200: { description: "Desk QR regenerated", content: json(regenerateDeskQrResponseSchema) },
			400: err("Invalid desk id"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Desk not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/desks/admin/qr/regenerate-all",
		tags: ["desks"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "All desk QRs regenerated", content: json(regenerateAllQrResponseSchema) },
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/reservations",
		tags: ["reservations"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(createReservationSchema) } },
		responses: {
			200: { description: "Reservation created", content: json(createReservationResponseSchema) },
			400: err("Invalid payload or date"),
			401: err("Unauthorized"),
			409: err("Reservation conflict"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/reservations/check-in/qr",
		tags: ["reservations"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(checkInByQrSchema) } },
		responses: {
			200: { description: "Check-in processed", content: json(checkInByQrResponseSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			404: err("Reservation not found"),
			409: err("Reservation not active"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/reservations/{id}/check-in",
		tags: ["reservations"],
		security: [{ bearerAuth: [] }],
		request: { params: reservationIdParamSchema },
		responses: {
			200: { description: "Check-in processed", content: json(checkInByQrResponseSchema) },
			400: err("Invalid reservation id"),
			401: err("Unauthorized"),
			404: err("Reservation not found"),
			409: err("Reservation not active"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/me/preferences",
		tags: ["me"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "Authenticated user preferences", content: json(userPreferencesResponseSchema) },
			401: err("Unauthorized"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/me/preferences",
		tags: ["me"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(userPreferencesPatchSchema) } },
		responses: {
			200: { description: "Updated user preferences", content: json(userPreferencesResponseSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/reservations/{id}",
		tags: ["reservations"],
		security: [{ bearerAuth: [] }],
		request: { params: reservationIdParamSchema },
		responses: {
			204: { description: "Reservation cancelled" },
			400: err("Invalid id"),
			401: err("Unauthorized"),
			404: err("Reservation not found"),
			409: err("Reservation cannot be cancelled"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/reservations/me",
		tags: ["reservations"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "User reservations", content: json(listReservationsResponseSchema) },
			401: err("Unauthorized"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/settings",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "Global admin settings", content: json(adminSettingsResponseSchema) },
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/settings",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(adminSettingsPatchSchema) } },
		responses: {
			200: { description: "Updated global admin settings", content: json(adminSettingsResponseSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/desks",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminDesksQuerySchema },
		responses: {
			200: { description: "Admin desks listing", content: json(adminDesksListResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/desks/{id}/layout",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			params: adminDeskIdParamOpenApiSchema,
			body: { required: true, content: json(adminDeskLayoutPatchOpenApiSchema) },
		},
		responses: {
			200: { description: "Admin desk layout updated", content: json(adminDeskSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Desk not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/desks/{id}/status",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			params: adminDeskIdParamOpenApiSchema,
			body: { required: true, content: json(adminDeskStatusPatchOpenApiSchema) },
		},
		responses: {
			200: { description: "Admin desk status updated", content: json(adminDeskSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Desk not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/desks/qr",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminDeskQrsQuerySchema },
		responses: {
			200: { description: "Desk QR listing", content: json(adminDeskQrsListResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/admin/desks/qr/regenerate-bulk",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(adminDeskQrsBulkRequestOpenApiSchema) } },
		responses: {
			200: {
				description: "Bulk QR regeneration result",
				content: json(z.object({ ok: z.literal(true), updated: z.number().int().nonnegative() })),
			},
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/floorplan",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminFloorplanQuerySchema },
		responses: {
			200: { description: "Floorplan config", content: json(adminFloorplanConfigSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Office not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/floorplan",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			query: adminFloorplanQuerySchema,
			body: { required: true, content: json(adminFloorplanPatchOpenApiSchema) },
		},
		responses: {
			200: { description: "Updated floorplan config", content: json(adminFloorplanConfigSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Office not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/floorplan/overlays",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminFloorplanQuerySchema },
		responses: {
			200: { description: "Floorplan overlays", content: json(adminFloorplanOverlaysListResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/admin/floorplan/overlays",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			query: adminFloorplanQuerySchema,
			body: { required: true, content: json(adminFloorplanOverlayCreateSchema) },
		},
		responses: {
			201: { description: "Floorplan overlay created", content: json(adminFloorplanOverlaySchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Office not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/floorplan/overlays/{id}",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			query: adminFloorplanQuerySchema,
			params: adminFloorplanOverlayIdParamSchema,
			body: { required: true, content: json(adminFloorplanOverlayPatchSchema) },
		},
		responses: {
			200: { description: "Floorplan overlay updated", content: json(adminFloorplanOverlaySchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Floorplan overlay not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "delete",
		path: "/admin/floorplan/overlays/{id}",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			query: adminFloorplanQuerySchema,
			params: adminFloorplanOverlayIdParamSchema,
		},
		responses: {
			200: { description: "Floorplan overlay removed", content: json(okSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Floorplan overlay not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/users",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminUsersQuerySchema },
		responses: {
			200: { description: "Admin users listing", content: json(adminUsersListResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/users/{id}",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			params: adminUserIdParamOpenApiSchema,
			body: { required: true, content: json(adminUserPatchSchema) },
		},
		responses: {
			200: { description: "Admin user updated", content: json(adminUserSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("User not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reservations",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminReservationsQuerySchema },
		responses: {
			200: { description: "Admin reservations listing", content: json(adminReservationsListResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "post",
		path: "/admin/reservations",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { body: { required: true, content: json(createAdminReservationSchema) } },
		responses: {
			201: { description: "Admin reservation created", content: json(adminCreateReservationResponseSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			409: err("Reservation conflict"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "patch",
		path: "/admin/reservations/{id}",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: {
			params: reservationIdParamSchema,
			body: { required: true, content: json(adminReservationStatusPatchSchema) },
		},
		responses: {
			200: { description: "Reservation status updated", content: json(okSchema) },
			400: err("Invalid payload"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			404: err("Reservation not found"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reports/occupancy",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminReportsQuerySchema },
		responses: {
			200: { description: "Occupancy report", content: json(adminOccupancyReportResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reports/cancellations",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminReportsQuerySchema },
		responses: {
			200: { description: "Cancellations report", content: json(adminCancellationsReportResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reports/no-shows",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminReportsQuerySchema },
		responses: {
			200: { description: "No-shows report", content: json(adminNoShowsReportResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reports/audit-log",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminAuditLogQuerySchema },
		responses: {
			200: { description: "Audit log report", content: json(adminAuditLogReportResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/admin/reports/summary",
		tags: ["admin"],
		security: [{ bearerAuth: [] }],
		request: { query: adminReportsQuerySchema },
		responses: {
			200: { description: "Summary report", content: json(adminSummaryReportResponseSchema) },
			400: err("Invalid query"),
			401: err("Unauthorized"),
			403: err("Forbidden"),
			500: err("Internal error"),
		},
	});

	registry.registerPath({
		method: "get",
		path: "/metrics",
		tags: ["metrics"],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: "Current metrics snapshot", content: json(metricsResponseSchema) },
			401: err("Unauthorized"),
			500: err("Internal error"),
		},
	});

	const generator = new OpenApiGeneratorV31(registry.definitions);
	return generator.generateDocument({
		openapi: "3.1.0",
		info: {
			title: "Desk Booking API",
			version,
			description: "Backend API for desk booking, auth and QR check-in.",
		},
		servers: [{ url: `${env.APP_BASE_URL}${API_V1_PREFIX}` }],
	});
}

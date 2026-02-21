import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
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
	errorResponseSchema,
	tokenSchema,
	uuidSchema,
} from "@interfaces/http/schemas/common-schemas.js";
import { z } from "zod";

extendZodWithOpenApi(z);

const authUserSchema = z.object({
	id: uuidSchema,
	email: z.email(),
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	second_last_name: z.string().nullable(),
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

const refreshSchema = z.object({
	token: tokenSchema,
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
			code: z.string(),
			name: z.string().nullable(),
			status: z.enum(["active", "maintenance", "disabled"]),
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
			office_id: uuidSchema,
			code: z.string(),
			name: z.string().nullable(),
			status: z.enum(["active", "maintenance", "disabled"]),
			qr_public_id: z.string().min(10),
		})
	),
});

const regenerateDeskQrResponseSchema = z.object({
	ok: z.literal(true),
	desk_id: uuidSchema,
	qr_public_id: z.string().min(10),
});

const regenerateAllQrResponseSchema = z.object({
	ok: z.literal(true),
	updated: z.number().int().nonnegative(),
});

const createReservationResponseSchema = z.object({
	ok: z.literal(true),
	reservation_id: uuidSchema,
});

const checkInByQrResponseSchema = z.object({
	ok: z.literal(true),
	status: z.enum(["checked_in", "already_checked_in"]),
});

const listReservationsResponseSchema = z.object({
	items: z.array(
		z.object({
			reservation_id: uuidSchema,
			desk_id: uuidSchema,
			office_id: uuidSchema,
			desk_name: z.string(),
			reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			source: z.enum(["user", "admin", "walk_in", "system"]),
			cancelled_at: z.string().nullable(),
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
	const version = options?.version ?? "0.7.0";
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
		request: { body: { required: true, content: json(refreshSchema) } },
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
			400: err("Invalid payload"),
			401: err("Invalid refresh token"),
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
		responses: {
			204: { description: "Logged out" },
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
		servers: [{ url: env.APP_BASE_URL }],
	});
}

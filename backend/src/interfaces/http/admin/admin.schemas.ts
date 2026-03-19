import { createUuidParamSchema, uuidSchema } from "@interfaces/http/schemas/common-schemas.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const adminSettingsPatchSchema = z.object({
	allowSelfRegistration: z.boolean().optional(),
	guestModeEnabled: z.boolean().optional(),
	checkinWindowMinutes: z.number().int().min(1).optional(),
	maxAdvanceDays: z.number().int().min(0).optional(),
	maxReservationsPerUser: z.number().int().min(1).optional(),
	cancellationDeadlineMinutes: z.number().int().min(0).optional(),
	defaultReservationDurationMinutes: z.number().int().min(1).optional(),
	businessHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
	businessHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
	allowedEmailDomains: z.array(z.string().min(1)).optional(),
});

export const adminUsersQuerySchema = z.object({
	q: z.string().trim().min(1).optional(),
	role: z.enum(["user", "admin"]).optional(),
	status: z.enum(["active", "suspended"]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminDesksQuerySchema = z.object({
	officeId: uuidSchema.optional(),
	zoneId: uuidSchema.optional(),
	status: z.enum(["active", "maintenance", "disabled"]).optional(),
	includeArchived: z.coerce.boolean().optional(),
	q: z.string().trim().min(1).optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).optional(),
	sortBy: z.enum(["deskCode", "zoneName", "status", "displayOrder"]).optional(),
	sortDir: z.enum(["asc", "desc"]).optional(),
});

export const adminDeskLayoutPatchSchema = z.object({
	layoutX: z.number().nullable().optional(),
	layoutY: z.number().nullable().optional(),
	layoutW: z.number().nullable().optional(),
	layoutH: z.number().nullable().optional(),
	rotationDeg: z.number().min(-360).max(360).optional(),
	displayOrder: z.number().int().optional(),
}).refine(
	value =>
		value.layoutX !== undefined ||
		value.layoutY !== undefined ||
		value.layoutW !== undefined ||
		value.layoutH !== undefined ||
		value.rotationDeg !== undefined ||
		value.displayOrder !== undefined,
	{ message: "At least one layout field must be provided" }
);

const adminDeskLayoutBulkItemSchema = z.object({
	id: uuidSchema,
	layoutX: z.number().nullable().optional(),
	layoutY: z.number().nullable().optional(),
	layoutW: z.number().nullable().optional(),
	layoutH: z.number().nullable().optional(),
	rotationDeg: z.number().min(-360).max(360).optional(),
	displayOrder: z.number().int().optional(),
}).refine(
	value =>
		value.layoutX !== undefined ||
		value.layoutY !== undefined ||
		value.layoutW !== undefined ||
		value.layoutH !== undefined ||
		value.rotationDeg !== undefined ||
		value.displayOrder !== undefined,
	{ message: "At least one layout field must be provided" }
);

export const adminDeskLayoutBulkPatchSchema = z.object({
	items: z.array(adminDeskLayoutBulkItemSchema).min(1).max(500),
});

export const adminDeskStatusPatchSchema = z.object({
	status: z.enum(["active", "maintenance", "disabled"]),
	statusReason: z.string().trim().min(1).nullable().optional(),
});

export const adminFloorplanQuerySchema = z.object({
	officeId: uuidSchema,
});

export const adminFloorplanOverlayIdParamSchema = createUuidParamSchema("id");

export const adminFloorplanOverlayCreateSchema = z.object({
	label: z.string().trim().min(1).max(120),
	kind: z.enum(["room", "area", "facility"]).optional(),
	x: z.number(),
	y: z.number(),
	w: z.number().positive(),
	h: z.number().positive(),
	rotationDeg: z.number().min(-360).max(360).optional(),
	strokeColor: z.string().trim().min(1).max(32).nullable().optional(),
	fillColor: z.string().trim().min(1).max(32).nullable().optional(),
	displayOrder: z.number().int().optional(),
});

export const adminFloorplanOverlayPatchSchema = adminFloorplanOverlayCreateSchema.partial().refine(
	value =>
		value.label !== undefined ||
		value.kind !== undefined ||
		value.x !== undefined ||
		value.y !== undefined ||
		value.w !== undefined ||
		value.h !== undefined ||
		value.rotationDeg !== undefined ||
		value.strokeColor !== undefined ||
		value.fillColor !== undefined ||
		value.displayOrder !== undefined,
	{ message: "At least one overlay field must be provided" }
);

export const adminFloorplanPatchSchema = z.object({
	floorplanImageUrl: z.url().nullable().optional(),
	canvasWidth: z.number().int().positive().nullable().optional(),
	canvasHeight: z.number().int().positive().nullable().optional(),
}).refine(
	value =>
		value.floorplanImageUrl !== undefined ||
		value.canvasWidth !== undefined ||
		value.canvasHeight !== undefined,
	{ message: "At least one floorplan field must be provided" }
);

export const adminDeskQrsQuerySchema = z.object({
	officeId: uuidSchema.optional(),
	zoneId: uuidSchema.optional(),
	status: z.enum(["active", "maintenance", "disabled"]).optional(),
	q: z.string().trim().min(1).optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).optional(),
	sortBy: z.enum(["deskCode", "zoneName", "status"]).optional(),
	sortDir: z.enum(["asc", "desc"]).optional(),
});

export const adminDeskQrsBulkPatchSchema = z.object({
	officeId: uuidSchema.optional(),
});

export const adminUserPatchSchema = z.object({
	role: z.enum(["user", "admin"]).optional(),
	status: z.enum(["active", "suspended"]).optional(),
}).refine(value => value.role !== undefined || value.status !== undefined, {
	message: "At least one of role or status must be provided",
});

export const adminReservationsQuerySchema = z.object({
	start: z.iso.datetime().optional(),
	end: z.iso.datetime().optional(),
	status: z.enum(["reserved", "checked_in", "cancelled", "no_show"]).optional(),
	officeId: uuidSchema.optional(),
});

export const createAdminReservationSchema = z.object({
	reservationType: z.enum(["internal", "guest"]),
	userId: uuidSchema.optional(),
	hostUserId: uuidSchema.optional(),
	deskId: uuidSchema,
	officeId: uuidSchema.optional(),
	startsAt: z.iso.datetime(),
	endsAt: z.iso.datetime(),
	source: z.enum(["admin", "walk_in", "system"]).optional(),
	guestName: z.string().min(1).optional(),
	guestEmail: z.email().optional(),
	guestCompany: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
	if (value.reservationType === "internal" && !value.userId) {
		ctx.addIssue({
			code: "custom",
			path: ["userId"],
			message: "userId is required for internal reservations",
		});
	}
	if (value.reservationType === "guest") {
		if (!value.hostUserId) {
			ctx.addIssue({
				code: "custom",
				path: ["hostUserId"],
				message: "hostUserId is required for guest reservations",
			});
		}
		if (!value.guestName) {
			ctx.addIssue({
				code: "custom",
				path: ["guestName"],
				message: "guestName is required for guest reservations",
			});
		}
		if (!value.guestEmail) {
			ctx.addIssue({
				code: "custom",
				path: ["guestEmail"],
				message: "guestEmail is required for guest reservations",
			});
		}
	}
});

export const reservationIdParamSchema = createUuidParamSchema("id");
export const userIdParamSchema = createUuidParamSchema("id");
export const deskIdParamSchema = createUuidParamSchema("id");

export const adminReservationStatusPatchSchema = z.object({
	status: z.enum(["reserved", "checked_in", "cancelled", "no_show"]),
});

export const adminReportsQuerySchema = z.object({
	start: dateSchema,
	end: dateSchema,
	officeId: uuidSchema.optional(),
	format: z.enum(["json", "csv"]).optional(),
});

export const adminAuditLogQuerySchema = adminReportsQuerySchema.extend({
	actorId: uuidSchema.optional(),
});

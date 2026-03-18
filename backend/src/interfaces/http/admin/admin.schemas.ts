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

export const adminReservationStatusPatchSchema = z.object({
	status: z.enum(["reserved", "checked_in", "cancelled", "no_show"]),
});

export const adminReportsQuerySchema = z.object({
	start: dateSchema,
	end: dateSchema,
	officeId: uuidSchema.optional(),
});

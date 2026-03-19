import {
	createUuidParamSchema,
	uuidSchema,
} from "@interfaces/http/schemas/common-schemas.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const createReservationSchema = z.object({
	date: dateSchema.optional(),
	startsAt: z.iso.datetime().optional(),
	endsAt: z.iso.datetime().optional(),
	deskId: uuidSchema,
	officeId: uuidSchema.optional(),
	source: z.enum(["user", "admin", "walk_in", "system"]).optional(),
}).superRefine((value, ctx) => {
	const hasDate = typeof value.date === "string";
	const hasRange = typeof value.startsAt === "string" && typeof value.endsAt === "string";

	if (!hasDate && !hasRange) {
		ctx.addIssue({
			code: "custom",
			message: "Provide either date or startsAt/endsAt",
		});
	}

	if (hasRange) {
		const starts = Date.parse(value.startsAt as string);
		const ends = Date.parse(value.endsAt as string);
		if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) {
			ctx.addIssue({
				code: "custom",
				path: ["endsAt"],
				message: "endsAt must be greater than startsAt",
			});
		}
	}
});

export const reservationIdParamSchema = createUuidParamSchema("id");

export const checkInByQrSchema = z.object({
	date: dateSchema,
	qrPublicId: z.string().min(10),
});

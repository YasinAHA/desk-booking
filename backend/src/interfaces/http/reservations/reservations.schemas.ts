import {
	createUuidParamSchema,
	uuidSchema,
} from "@interfaces/http/schemas/common-schemas.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const createReservationSchema = z.object({
	date: dateSchema,
	deskId: uuidSchema,
	officeId: uuidSchema.optional(),
	source: z.enum(["user", "admin", "walk_in", "system"]).optional(),
});

export const reservationIdParamSchema = createUuidParamSchema("id");

export const checkInByQrSchema = z.object({
	date: dateSchema,
	qrPublicId: z.string().min(10),
});

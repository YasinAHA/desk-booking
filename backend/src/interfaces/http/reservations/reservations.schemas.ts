import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const createReservationSchema = z.object({
	date: dateSchema,
	desk_id: z.string().uuid(),
	office_id: z.string().uuid().optional(),
	source: z.enum(["user", "admin", "walk_in", "system"]).optional(),
});

export const reservationIdParamSchema = z.object({
	id: z.string().uuid(),
});

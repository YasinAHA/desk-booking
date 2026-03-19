import { createUuidParamSchema, uuidSchema } from "@interfaces/http/schemas/common-schemas.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const listDesksSchema = z.object({
	date: dateSchema,
	officeId: uuidSchema.optional(),
	zoneId: uuidSchema.optional(),
	status: z.enum(["active", "maintenance", "disabled"]).optional(),
});

export const deskIdParamSchema = createUuidParamSchema("id");


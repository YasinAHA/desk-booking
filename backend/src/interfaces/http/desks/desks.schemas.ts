import { createUuidParamSchema } from "@interfaces/http/schemas/common-schemas.js";
import { dateSchema } from "@interfaces/http/schemas/date-schemas.js";
import { z } from "zod";

export const listDesksSchema = z.object({
	date: dateSchema,
});

export const deskIdParamSchema = createUuidParamSchema("id");


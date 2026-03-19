import { z } from "zod";

export const userPreferencesThemeSchema = z.enum(["light", "dark", "system"]);
export const userPreferencesLanguageSchema = z.enum(["es", "en"]);

export const userPreferencesPatchSchema = z
	.object({
		theme: userPreferencesThemeSchema.optional(),
		language: userPreferencesLanguageSchema.optional(),
		timezone: z.string().trim().min(1).max(100).optional(),
		emailNotificationsEnabled: z.boolean().optional(),
	})
	.refine(value => Object.keys(value).length > 0, {
		message: "At least one field must be provided",
	});


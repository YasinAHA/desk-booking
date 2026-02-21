import {
	PASSWORD_POLICY_MIN_LENGTH,
	validatePasswordPolicy,
} from "@domain/auth/value-objects/password-policy.js";
import { z } from "zod";

const PASSWORD_POLICY_MESSAGE =
	`Password must be at least ${PASSWORD_POLICY_MIN_LENGTH} characters with uppercase, lowercase, digit, and special char`;

export const emailSchema = z.string().email();

export const tokenSchema = z.string().min(1);

export const uuidSchema = z.string().uuid();

export const strongPasswordSchema = z.string().superRefine((password, ctx) => {
	try {
		validatePasswordPolicy(password);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: PASSWORD_POLICY_MESSAGE,
		});
	}
});

export function createUuidParamSchema<K extends string>(fieldName: K) {
	return z.object({
		[fieldName]: uuidSchema,
	} as Record<K, typeof uuidSchema>);
}

export const errorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
}).strict();

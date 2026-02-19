import { validatePasswordPolicy } from "@domain/auth/value-objects/password-policy.js";
import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const verifySchema = z.object({
	token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
	email: z.string().email(),
});

export const resetPasswordSchema = z.object({
	token: z.string().min(1),
	password: z.string().min(8).refine(
		password => {
			try {
				validatePasswordPolicy(password);
				return true;
			} catch {
				return false;
			}
		},
		"Password must be at least 12 characters with uppercase, lowercase, digit, and special char"
	),
});

export const changePasswordSchema = z.object({
	current_password: z.string().min(1),
	new_password: z.string().min(8).refine(
		password => {
			try {
				validatePasswordPolicy(password);
				return true;
			} catch {
				return false;
			}
		},
		"Password must be at least 12 characters with uppercase, lowercase, digit, and special char"
	),
});

export const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).refine(
		password => {
			try {
				validatePasswordPolicy(password);
				return true;
			} catch {
				return false;
			}
		},
		"Password must be at least 12 characters with uppercase, lowercase, digit, and special char"
	),
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	second_last_name: z.string().min(1).optional(),
});

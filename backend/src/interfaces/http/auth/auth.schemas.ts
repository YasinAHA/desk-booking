import {
	emailSchema,
	strongPasswordSchema,
	tokenSchema,
} from "@interfaces/http/schemas/common-schemas.js";
import { z } from "zod";

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1),
});

export const verifySchema = z.object({
	token: tokenSchema,
});

export const forgotPasswordSchema = z.object({
	email: emailSchema,
});

export const resetPasswordSchema = z.object({
	token: tokenSchema,
	password: strongPasswordSchema,
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: strongPasswordSchema,
});

export const registerSchema = z.object({
	email: emailSchema,
	password: strongPasswordSchema,
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	secondLastName: z.string().min(1).optional(),
});

import { z } from "zod";

const nodeEnv = process.env.NODE_ENV || "development";

const envSchema = z.object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRATION: z.string().default("15m"),
    JWT_REFRESH_SECRET:
        nodeEnv === "production"
            ? z.string().min(32) // Production: strong enforcement
            : z.string().default("dev-refresh-secret-change-in-production"), // Dev/test: safe default
    JWT_REFRESH_EXPIRATION: z.string().default("7d"),
    JWT_ISSUER: z.string().default("desk-booking"),
    JWT_AUDIENCE: z.string().default("desk-booking-api"),
    ALLOWED_EMAIL_DOMAINS: z.string().default("camerfirma.com"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z
        .string()
        .default("Desk Booking <no-reply@camerfirma.com>"),
    APP_BASE_URL: z.url().default("http://localhost:3001"),
    FRONTEND_BASE_URL: z.url().default("http://localhost:5500"),
    CORS_ORIGINS: z.string().default(""),
    DB_SSL: z.preprocess(
        value => {
            if (value === "true") {
                return true;
            }
            if (value === "false") {
                return false;
            }
            return value;
        },
        z.boolean().default(false)
    ),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    EMAIL_MODE: z.enum(["fake", "real"]).default("fake"),
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(20),
    OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OUTBOX_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(2000),
    OUTBOX_BACKOFF_MAX_MS: z.coerce.number().int().positive().default(60000),
});

const parsed = envSchema.parse(process.env);

export const env = {
    ...parsed,
    ALLOWED_EMAIL_DOMAINS: parsed.ALLOWED_EMAIL_DOMAINS.split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean),
    CORS_ORIGINS: parsed.CORS_ORIGINS.split(",")
        .map(value => value.trim())
        .filter(Boolean),
} as const;


type RequiredEnv =
    | "DATABASE_URL"
    | "JWT_SECRET";

function requiredEnv(name: RequiredEnv): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing env: ${name}`);
    return value;
}


export const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: Number(process.env.PORT ?? 3001),

    DATABASE_URL: (() => {
        const url = requiredEnv("DATABASE_URL");
        const parsed = new URL(url); // valida formato
        return parsed.toString();
    })(),

    JWT_SECRET: requiredEnv("JWT_SECRET"),

    ALLOWED_EMAIL_DOMAINS: (process.env.ALLOWED_EMAIL_DOMAINS ?? "camerfirma.com")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean),

    SMTP_HOST: process.env.SMTP_HOST ?? "localhost",
    SMTP_PORT: Number(process.env.SMTP_PORT ?? 1025),
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM: process.env.SMTP_FROM ?? "Desk Booking <no-reply@camerfirma.com>",
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3001",
    CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
} as const;


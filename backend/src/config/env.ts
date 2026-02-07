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
} as const;


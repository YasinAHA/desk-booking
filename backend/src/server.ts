import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info({ port: env.PORT, host: env.HOST }, "API listening");
} catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
}

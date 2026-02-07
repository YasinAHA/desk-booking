import "dotenv/config";
import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();

try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, host: HOST }, "API listening");
} catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
}

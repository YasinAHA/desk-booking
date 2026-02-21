import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildOpenApiDocument } from "@interfaces/http/openapi/document.js";

export async function registerSwaggerPlugin(app: FastifyInstance): Promise<void> {
	const document = buildOpenApiDocument();
	const runtimeSpecPath = resolve(process.cwd(), ".openapi", "openapi.json");
	const docsCspHeader =
		"default-src 'self'; " +
		"style-src 'self' 'unsafe-inline' https:; " +
		"script-src 'self'; " +
		"img-src 'self' data: https:; " +
		"font-src 'self' data: https:; " +
		"connect-src 'self' https:;";
	await mkdir(dirname(runtimeSpecPath), { recursive: true });
	await writeFile(runtimeSpecPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

	await app.register(swagger, {
		mode: "static",
		specification: {
			path: runtimeSpecPath,
			baseDir: dirname(runtimeSpecPath),
		},
	});

	await app.register(swaggerUi, {
		routePrefix: "/docs",
		uiHooks: {
			onRequest: (_req, reply, done) => {
				reply.header("Content-Security-Policy", docsCspHeader);
				done();
			},
		},
		uiConfig: {
			docExpansion: "list",
			deepLinking: false,
		},
		staticCSP: false,
		transformSpecificationClone: true,
	});

	app.get("/openapi.json", async (_req, reply) => {
		return reply.send(document);
	});
}

import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import type { OpenAPIV3 } from "openapi-types";

import { buildOpenApiDocument } from "@interfaces/http/openapi/document.js";

export async function registerSwaggerPlugin(app: FastifyInstance): Promise<void> {
	const document = buildOpenApiDocument() as unknown as OpenAPIV3.Document;

	await app.register(swagger, {
		mode: "static",
		specification: {
			document,
		},
	});

	await app.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: false,
		},
		staticCSP: true,
		transformSpecificationClone: true,
	});

	app.get("/openapi.json", async (_req, reply) => {
		return reply.send(document);
	});
}

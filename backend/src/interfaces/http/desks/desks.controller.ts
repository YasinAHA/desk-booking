import type { RegenerateDeskQrHandler } from "@application/desks/commands/regenerate-desk-qr.handler.js";
import type { RegenerateDeskQrCommand } from "@application/desks/commands/regenerate-desk-qr.command.js";
import type { ListAdminDesksHandler } from "@application/desks/queries/list-admin-desks.handler.js";
import type { ListAdminDesksQuery } from "@application/desks/queries/list-admin-desks.query.js";
import type { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";
import { throwHttpError } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import {
	mapAdminDesksResponse,
	mapListDesksResponse,
	mapRegenerateDeskQrResponse,
} from "./desks.mappers.js";
import { deskIdParamSchema, listDesksSchema } from "./desks.schemas.js";

/**
 * DeskController: Handles HTTP layer concerns for desk operations
 * - Request validation
 * - Response mapping
 * - Error handling
 */
export class DeskController {
	constructor(
		private readonly listDesksHandler: ListDesksHandler,
		private readonly listAdminDesksHandler: ListAdminDesksHandler,
		private readonly regenerateDeskQrHandler: RegenerateDeskQrHandler
	) {}

	async listForDate(req: FastifyRequest, reply: FastifyReply) {
		const parse = listDesksSchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid date");
		}

		const userId = req.user.id;
		const query: ListDesksQuery = { date: parse.data.date, userId };
		const desks = await this.listDesksHandler.execute(query);

		return reply.send(mapListDesksResponse(parse.data.date, desks));
	}

	async listAdmin(_req: FastifyRequest, reply: FastifyReply) {
		const query: ListAdminDesksQuery = { requestedByUserId: "admin" };
		const items = await this.listAdminDesksHandler.execute(query);
		return reply.send(mapAdminDesksResponse(items));
	}

	async regenerateQr(req: FastifyRequest, reply: FastifyReply) {
		const parse = deskIdParamSchema.safeParse(req.params);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid desk id");
		}

		const command: RegenerateDeskQrCommand = {
			deskId: parse.data.id,
			requestedByUserId: req.user.id,
		};
		const qrPublicId = await this.regenerateDeskQrHandler.execute(command);
		if (!qrPublicId) {
			throwHttpError(404, "DESK_NOT_FOUND", "Desk not found");
		}

		return reply.send(mapRegenerateDeskQrResponse(parse.data.id, qrPublicId));
	}
}


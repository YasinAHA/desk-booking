import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";
import type { AdminService } from "@application/admin/services/admin.service.js";
import { throwHttpError, throwMappedHttpError, type HttpErrorMapping } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	AdminReportFilters,
	AdminReservationFilters,
	AdminSettingsPatch,
	CreateAdminReservationInput,
} from "@application/admin/ports/admin-repository.js";

import {
	adminReportsQuerySchema,
	adminReservationStatusPatchSchema,
	adminReservationsQuerySchema,
	adminSettingsPatchSchema,
	createAdminReservationSchema,
	reservationIdParamSchema,
} from "./admin.schemas.js";

const ADMIN_ERROR_MAPPINGS: readonly HttpErrorMapping[] = [
	{
		matches: err => err instanceof AdminAuthorizationError,
		statusCode: 403,
		code: "FORBIDDEN",
		message: "Forbidden",
	},
];

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
	const entries = Object.entries(value).filter(([, current]) => current !== undefined);
	return Object.fromEntries(entries) as T;
}

export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	async getSettings(req: FastifyRequest, reply: FastifyReply) {
		try {
			const settings = await this.adminService.getSettings(req.user.id);
			return reply.send(settings);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async patchSettings(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminSettingsPatchSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const settings = await this.adminService.updateSettings(
				req.user.id,
				removeUndefined(parse.data) as AdminSettingsPatch
			);
			return reply.send(settings);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async listReservations(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminReservationsQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const items = await this.adminService.listReservations(
				req.user.id,
				removeUndefined(parse.data) as AdminReservationFilters
			);
			return reply.send({ items });
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async createReservation(req: FastifyRequest, reply: FastifyReply) {
		const parse = createAdminReservationSchema.safeParse(req.body);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const reservationId = await this.adminService.createReservation(
				req.user.id,
				removeUndefined(parse.data) as CreateAdminReservationInput
			);
			return reply.status(201).send({ ok: true, reservationId });
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throwHttpError(409, "CONFLICT", "Reservation conflict");
		}
	}

	async patchReservationStatus(req: FastifyRequest, reply: FastifyReply) {
		const params = reservationIdParamSchema.safeParse(req.params);
		const body = adminReservationStatusPatchSchema.safeParse(req.body);
		if (!params.success || !body.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const updated = await this.adminService.updateReservationStatus(
				req.user.id,
				params.data.id,
				body.data.status
			);
			if (!updated) {
				throwHttpError(404, "NOT_FOUND", "Reservation not found");
			}
			return reply.send({ ok: true });
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async getOccupancyReport(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminReportsQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const report = await this.adminService.getOccupancyReport(
				req.user.id,
				removeUndefined(parse.data) as AdminReportFilters
			);
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async getNoShowsReport(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminReportsQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const report = await this.adminService.getNoShowReport(
				req.user.id,
				removeUndefined(parse.data) as AdminReportFilters
			);
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async getSummaryReport(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminReportsQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const report = await this.adminService.getSummaryReport(
				req.user.id,
				removeUndefined(parse.data) as AdminReportFilters
			);
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}
}

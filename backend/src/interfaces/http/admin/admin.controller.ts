import { AdminAuthorizationError } from "@application/desks/errors/admin-authorization-error.js";
import type { AdminService } from "@application/admin/services/admin.service.js";
import { throwHttpError, throwMappedHttpError, type HttpErrorMapping } from "@interfaces/http/http-errors.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
	AdminDeskLayoutPatch,
	AdminDeskStatusPatch,
	AdminDesksFilters,
	AdminUserPatch,
	AdminUsersFilters,
	AdminAuditLogFilters,
	AdminReportFilters,
	AdminReservationFilters,
	AdminSettingsPatch,
	CreateAdminReservationInput,
} from "@application/admin/ports/admin-repository.js";

import {
	adminAuditLogQuerySchema,
	adminDeskLayoutPatchSchema,
	adminDeskStatusPatchSchema,
	adminDesksQuerySchema,
	adminReportsQuerySchema,
	adminUserPatchSchema,
	adminUsersQuerySchema,
	adminReservationStatusPatchSchema,
	adminReservationsQuerySchema,
	adminSettingsPatchSchema,
	createAdminReservationSchema,
	deskIdParamSchema,
	reservationIdParamSchema,
	userIdParamSchema,
} from "./admin.schemas.js";
import { toCsv } from "./admin.csv.js";

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

	private sendCsv(reply: FastifyReply, fileName: string, csvBody: string): FastifyReply {
		reply.header("content-type", "text/csv; charset=utf-8");
		reply.header("content-disposition", `attachment; filename="${fileName}"`);
		return reply.send(csvBody);
	}

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

	async listDesks(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminDesksQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const items = await this.adminService.listDesks(
				req.user.id,
				removeUndefined(parse.data) as AdminDesksFilters
			);
			return reply.send({ items });
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async patchDeskLayout(req: FastifyRequest, reply: FastifyReply) {
		const params = deskIdParamSchema.safeParse(req.params);
		const body = adminDeskLayoutPatchSchema.safeParse(req.body);
		if (!params.success || !body.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const updated = await this.adminService.updateDeskLayout(
				req.user.id,
				params.data.id,
				removeUndefined(body.data) as AdminDeskLayoutPatch
			);
			if (!updated) {
				throwHttpError(404, "NOT_FOUND", "Desk not found");
			}
			return reply.send(updated);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async patchDeskStatus(req: FastifyRequest, reply: FastifyReply) {
		const params = deskIdParamSchema.safeParse(req.params);
		const body = adminDeskStatusPatchSchema.safeParse(req.body);
		if (!params.success || !body.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const updated = await this.adminService.updateDeskStatus(
				req.user.id,
				params.data.id,
				removeUndefined(body.data) as AdminDeskStatusPatch
			);
			if (!updated) {
				throwHttpError(404, "NOT_FOUND", "Desk not found");
			}
			return reply.send(updated);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async listUsers(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminUsersQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const usersPage = await this.adminService.listUsers(
				req.user.id,
				removeUndefined(parse.data) as AdminUsersFilters
			);
			return reply.send(usersPage);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async patchUser(req: FastifyRequest, reply: FastifyReply) {
		const params = userIdParamSchema.safeParse(req.params);
		const body = adminUserPatchSchema.safeParse(req.body);
		if (!params.success || !body.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid payload");
		}
		try {
			const updated = await this.adminService.updateUser(
				req.user.id,
				params.data.id,
				removeUndefined(body.data) as AdminUserPatch
			);
			if (!updated) {
				throwHttpError(404, "NOT_FOUND", "User not found");
			}
			return reply.send(updated);
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
				removeUndefined({
					start: parse.data.start,
					end: parse.data.end,
					officeId: parse.data.officeId,
				}) as AdminReportFilters
			);
			if (parse.data.format === "csv") {
				return this.sendCsv(
					reply,
					`occupancy-${report.start}-${report.end}.csv`,
					toCsv(
						report.items.map(item => ({
							deskId: item.deskId,
							deskCode: item.deskCode,
							zoneName: item.zoneName,
							totalSlots: item.totalSlots,
							occupiedSlots: item.occupiedSlots,
							occupancyRate: item.occupancyRate,
						}))
					)
				);
			}
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async getCancellationsReport(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminReportsQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const report = await this.adminService.getCancellationsReport(
				req.user.id,
				removeUndefined({
					start: parse.data.start,
					end: parse.data.end,
					officeId: parse.data.officeId,
				}) as AdminReportFilters
			);
			if (parse.data.format === "csv") {
				return this.sendCsv(
					reply,
					`cancellations-${report.start}-${report.end}.csv`,
					toCsv(
						report.items.map(item => ({
							cancellationDate: item.cancellationDate,
							actorUserId: item.actorUserId,
							actorEmail: item.actorEmail,
							cancellations: item.cancellations,
							avgCancellationLeadMinutes: item.avgCancellationLeadMinutes,
						}))
					)
				);
			}
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
				removeUndefined({
					start: parse.data.start,
					end: parse.data.end,
					officeId: parse.data.officeId,
				}) as AdminReportFilters
			);
			if (parse.data.format === "csv") {
				return this.sendCsv(
					reply,
					`no-shows-${report.start}-${report.end}.csv`,
					toCsv(
						report.items.map(item => ({
							actorUserId: item.actorUserId,
							actorEmail: item.actorEmail,
							noShows: item.noShows,
						}))
					)
				);
			}
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}

	async getAuditLogReport(req: FastifyRequest, reply: FastifyReply) {
		const parse = adminAuditLogQuerySchema.safeParse(req.query);
		if (!parse.success) {
			throwHttpError(400, "BAD_REQUEST", "Invalid query");
		}
		try {
			const report = await this.adminService.getAuditLogReport(
				req.user.id,
				removeUndefined({
					start: parse.data.start,
					end: parse.data.end,
					officeId: parse.data.officeId,
					actorId: parse.data.actorId,
				}) as AdminAuditLogFilters
			);
			if (parse.data.format === "csv") {
				return this.sendCsv(
					reply,
					`audit-log-${report.start}-${report.end}.csv`,
					toCsv(
						report.items.map(item => ({
							id: item.id,
							eventType: item.eventType,
							actorType: item.actorType,
							actorUserId: item.actorUserId,
							actorEmail: item.actorEmail,
							reservationId: item.reservationId,
							deskId: item.deskId,
							officeId: item.officeId,
							reason: item.reason,
							metadata: item.metadata ? JSON.stringify(item.metadata) : null,
							createdAt: item.createdAt,
						}))
					)
				);
			}
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
				removeUndefined({
					start: parse.data.start,
					end: parse.data.end,
					officeId: parse.data.officeId,
				}) as AdminReportFilters
			);
			if (parse.data.format === "csv") {
				return this.sendCsv(
					reply,
					`summary-${report.start}-${report.end}.csv`,
					toCsv([
						{
							start: report.start,
							end: report.end,
							totalReservations: report.totalReservations,
							checkedIn: report.checkedIn,
							cancelled: report.cancelled,
							noShow: report.noShow,
						},
					])
				);
			}
			return reply.send(report);
		} catch (err) {
			throwMappedHttpError(err, ADMIN_ERROR_MAPPINGS);
			throw err;
		}
	}
}

import type {
	AuditEventWriter,
	CreateAuditEventInput,
} from "@application/common/ports/audit-event-writer.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

export class PgAuditEventWriter implements AuditEventWriter {
	constructor(private readonly db: DbClient) {}

	async append(event: CreateAuditEventInput): Promise<void> {
		await this.db.query(
			"insert into audit_events (" +
				"event_type, actor_type, actor_user_id, reservation_id, desk_id, office_id, reason, metadata" +
			") values (" +
				"$1, $2, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7, $8::jsonb" +
			")",
			[
				event.eventType,
				event.actorType,
				event.actorUserId ?? null,
				event.reservationId ?? null,
				event.deskId ?? null,
				event.officeId ?? null,
				event.reason ?? null,
				event.metadata ? JSON.stringify(event.metadata) : null,
			]
		);
	}
}

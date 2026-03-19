export type AuditEventType =
	| "reservation_created"
	| "reservation_cancelled"
	| "reservation_checked_in"
	| "reservation_no_show"
	| "desk_status_changed"
	| "desk_block_created"
	| "desk_block_ended"
	| "user_status_changed"
	| "admin_action";

export type AuditActorType = "user" | "admin" | "system";

export type CreateAuditEventInput = {
	eventType: AuditEventType;
	actorType: AuditActorType;
	actorUserId?: string | null;
	reservationId?: string | null;
	deskId?: string | null;
	officeId?: string | null;
	reason?: string | null;
	metadata?: Record<string, unknown> | null;
};

export interface AuditEventWriter {
	append(event: CreateAuditEventInput): Promise<void>;
}

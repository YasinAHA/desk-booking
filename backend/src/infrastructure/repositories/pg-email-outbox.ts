import type { EmailMessage, EmailOutbox } from "../../application/ports/email-outbox.js";

type DbQuery = (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;

type DbClient = {
	query: DbQuery;
};

/**
 * PostgreSQL implementation of EmailOutbox
 * 
 * Stores email messages in the database for asynchronous processing.
 * This provides transactional consistency, retryability, and auditability.
 */
export class PgEmailOutbox implements EmailOutbox {
	constructor(private readonly db: DbClient) {}

	async enqueue(message: EmailMessage): Promise<void> {
		await this.db.query(
			"INSERT INTO email_outbox (to_email, subject, body, email_type, next_retry_at) " +
				"VALUES ($1, $2, $3, $4, now())",
			[message.to, message.subject, message.body, message.type]
		);
	}
}

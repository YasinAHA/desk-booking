import { Pool } from "pg";

import { env } from "../config/env.js";
import { sendEmail } from "../infrastructure/email/mailer.js";

type OutboxRow = {
	id: string;
	to_email: string;
	subject: string;
	body: string;
	email_type: string;
	attempts: number;
};

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
	max: env.DB_POOL_MAX,
});

const pollIntervalMs = env.OUTBOX_POLL_INTERVAL_MS;
const batchSize = env.OUTBOX_BATCH_SIZE;
const maxAttempts = env.OUTBOX_MAX_ATTEMPTS;
const backoffBaseMs = env.OUTBOX_BACKOFF_BASE_MS;
const backoffMaxMs = env.OUTBOX_BACKOFF_MAX_MS;

function computeBackoffMs(attempts: number) {
	const exp = Math.max(0, attempts - 1);
	return Math.min(backoffBaseMs * Math.pow(2, exp), backoffMaxMs);
}

function toPlainText(html: string) {
	return html
		.replaceAll(/<\s*br\s*\/?\s*>/gi, "\n")
		.replaceAll(/<\s*\/p\s*>/gi, "\n")
		.replaceAll(/<[^>]+>/g, "")
		.replaceAll(/\n{3,}/g, "\n\n")
		.trim();
}

async function claimBatch(): Promise<OutboxRow[]> {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const result = await client.query(
			"with cte as (" +
				"select id from email_outbox " +
				"where status in ('pending','failed') " +
				"and (next_retry_at is null or next_retry_at <= now()) " +
				"and attempts < $1 " +
				"order by created_at " +
				"for update skip locked " +
				"limit $2" +
			") " +
			"update email_outbox " +
			"set status = 'processing', last_error = null, next_retry_at = null " +
			"where id in (select id from cte) " +
			"returning id, to_email, subject, body, email_type, attempts",
			[maxAttempts, batchSize]
		);
		await client.query("COMMIT");
		return result.rows as OutboxRow[];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function markSent(id: string, attempts: number) {
	await pool.query(
		"update email_outbox " +
			"set status = 'sent', processed_at = now(), attempts = $2 " +
			"where id = $1",
		[id, attempts]
	);
}

async function markFailed(id: string, attempts: number, error: unknown) {
	const message = error instanceof Error ? error.message : JSON.stringify(error);
	const backoffMs = computeBackoffMs(attempts);
	await pool.query(
		"update email_outbox " +
			"set status = 'failed', attempts = $2, last_error = $3, " +
			"next_retry_at = now() + ($4::int * interval '1 millisecond') " +
			"where id = $1",
		[id, attempts, message, backoffMs]
	);
}

async function processOne(row: OutboxRow) {
	const nextAttempts = row.attempts + 1;

	if (env.EMAIL_MODE === "fake") {
		await markSent(row.id, nextAttempts);
		return;
	}

	await sendEmail({
		to: row.to_email,
		subject: row.subject,
		html: row.body,
		text: toPlainText(row.body),
	});

	await markSent(row.id, nextAttempts);
}

async function processBatch() {
	const rows = await claimBatch();
	for (const row of rows) {
		try {
			await processOne(row);
		} catch (error) {
			await markFailed(row.id, row.attempts + 1, error);
		}
	}
}

let running = true;

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
	while (running) {
		try {
			await processBatch();
		} catch (error) {
			console.error("outbox worker error", error);
		}
		await sleep(pollIntervalMs);
	}

	await pool.end();
}

process.on("SIGINT", () => {
	running = false;
});

process.on("SIGTERM", () => {
	running = false;
});

await main().catch(error => {
	console.error("outbox worker fatal", error);
	process.exit(1);
});

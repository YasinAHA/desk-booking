#!/usr/bin/env tsx
/**
 * Script to check pending emails in the outbox
 */
import { Pool } from "pg";
import { env } from "../../src/config/env.js";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
});

async function checkOutbox() {
	try {
		const result = await pool.query(
			`SELECT id, to_email, subject, email_type, status, attempts, created_at, next_retry_at
			 FROM email_outbox 
			 ORDER BY created_at DESC 
			 LIMIT 10`
		);

		console.log(`\n📬 Email Outbox Status (${result.rows.length} recent emails):\n`);
		
		if (result.rows.length === 0) {
			console.log("No emails in outbox yet.\n");
		} else {
			result.rows.forEach((row, idx) => {
				console.log(`${idx + 1}. [${row.status.toUpperCase()}] ${row.to_email}`);
				console.log(`   Subject: ${row.subject}`);
				console.log(`   Type: ${row.email_type}`);
				console.log(`   Attempts: ${row.attempts}`);
				console.log(`   Created: ${row.created_at}`);
				if (row.status === 'pending') {
					console.log(`   ⏰ Retry at: ${row.next_retry_at || 'now'}`);
				}
				console.log('');
			});
		}

		// Summary by status
		const summary = await pool.query(
			`SELECT status, COUNT(*) as count 
			 FROM email_outbox 
			 GROUP BY status`
		);

		console.log("📊 Summary:");
		summary.rows.forEach(row => {
			let icon: string;
			if (row.status === 'pending') {
				icon = '⏳';
			} else if (row.status === 'sent') {
				icon = '✅';
			} else {
				icon = '❌';
			}
			console.log(`   ${icon} ${row.status}: ${row.count}`);
		});
		console.log('');

	} catch (error) {
		console.error("Error checking outbox:", error);
	} finally {
		await pool.end();
	}
}

await checkOutbox();

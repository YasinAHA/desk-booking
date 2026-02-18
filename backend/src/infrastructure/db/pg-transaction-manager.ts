import type { Pool, PoolClient } from "pg";

import {
	createTransactionalContext,
	type TransactionManager,
	type TransactionalContext,
} from "@application/common/ports/transaction-manager.js";

/**
 * PostgreSQL implementation of TransactionManager
 */
export class PgTransactionManager implements TransactionManager {
	constructor(private readonly pool: Pool) {}

	async runInTransaction<T>(
		callback: (tx: TransactionalContext) => Promise<T>
	): Promise<T> {
		const client: PoolClient = await this.pool.connect();

		try {
			await client.query("BEGIN");

			const tx = createTransactionalContext({
				query: (text: string, params?: unknown[]) => client.query(text, params),
			});

			const result = await callback(tx);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}

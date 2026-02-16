import type { Pool, PoolClient } from "pg";

import type {
	TransactionManager,
	TransactionalContext,
} from "@application/ports/transaction-manager.js";

/**
 * PostgreSQL implementation of TransactionManager
 * 
 * Manages database transactions using pg Pool and Client.
 * Acquires a client from the pool, starts a transaction,
 * executes the callback, and commits or rolls back based on result.
 */
export class PgTransactionManager implements TransactionManager {
	constructor(private readonly pool: Pool) {}

	async runInTransaction<T>(
		callback: (tx: TransactionalContext) => Promise<T>
	): Promise<T> {
		const client: PoolClient = await this.pool.connect();
		
		try {
			await client.query("BEGIN");
			
			// Create transactional context wrapping the client
			const tx: TransactionalContext = {
				query: (text: string, params?: unknown[]) => client.query(text, params),
			};
			
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

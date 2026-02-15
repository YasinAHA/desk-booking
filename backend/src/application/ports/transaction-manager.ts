/**
 * TransactionManager port - abstracts database transaction management
 * 
 * Allows use cases to execute multiple repository operations atomically.
 * Infrastructure layer provides the concrete implementation.
 */

/**
 * Transactional context passed to callback
 * Contains a DB client that shares the same transaction
 */
export type TransactionalContext = {
	query: (text: string, params?: unknown[]) => Promise<any>;
};

export interface TransactionManager {
	/**
	 * Executes a callback within a database transaction.
	 * The callback receives a transactional context (DB client) that must be used
	 * to create repository instances for operations within the transaction.
	 * 
	 * All operations using this context share the same transaction.
	 * If callback throws, transaction is rolled back automatically.
	 * If callback succeeds, transaction is committed.
	 * 
	 * @param callback - Async function receiving transactional context
	 * @returns The value returned by the callback
	 */
	runInTransaction<T>(callback: (tx: TransactionalContext) => Promise<T>): Promise<T>;
}

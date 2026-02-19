/**
 * TransactionManager port - abstracts database transaction management.
 *
 * Application code works with an opaque TransactionalContext to avoid leaking
 * infrastructure details (PoolClient, ORM transactions, etc.).
 */

type TransactionQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type TransactionalDbClient = {
	query: (text: string, params?: unknown[]) => Promise<TransactionQueryResult>;
};

const transactionalContextSymbol: unique symbol = Symbol("TransactionalContext");

export type TransactionalContext = {
	readonly [transactionalContextSymbol]: TransactionalDbClient;
};

export function createTransactionalContext(
	dbClient: TransactionalDbClient
): TransactionalContext {
	return {
		[transactionalContextSymbol]: dbClient,
	};
}

export function getTransactionalDbClient(
	context: TransactionalContext
): TransactionalDbClient {
	return context[transactionalContextSymbol];
}

export interface TransactionManager {
	runInTransaction<T>(callback: (tx: TransactionalContext) => Promise<T>): Promise<T>;
}

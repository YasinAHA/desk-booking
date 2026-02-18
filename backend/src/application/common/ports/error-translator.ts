/**
 * Port for translating infrastructure errors (e.g., SQL errors) to domain errors.
 * Keeps infrastructure error details out of domain/application boundaries.
 */
export interface ErrorTranslator {
	/**
	 * Translate a database error to a domain error or re-throw if not translatable.
	 * If the error is not recognized, the error is re-thrown as-is.
	 */
	translateError(error: unknown): Error;
}

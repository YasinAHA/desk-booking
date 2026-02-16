import type { ErrorTranslator } from "@application/ports/error-translator.js";
import { ReservationConflictError } from "@domain/entities/reservation.js";

/**
 * PostgreSQL error translator.
 * Translates PostgreSQL error codes to domain errors.
 *
 * PostgreSQL error codes:
 * - 23505: unique_violation (duplicate key)
 */
export class PgErrorTranslator implements ErrorTranslator {
	translateError(error: unknown): Error {
		if (
			typeof error === "object" &&
			error &&
			(error as { code?: string }).code === "23505"
		) {
			// Unique constraint violation → ReservationConflictError
			return new ReservationConflictError();
		}

		// If error is not recognized, re-throw as-is
		if (error instanceof Error) {
			return error;
		}

		// Fallback for non-Error objects
		return new Error(String(error));
	}
}

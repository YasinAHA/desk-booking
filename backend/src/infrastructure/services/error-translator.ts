import type { ErrorTranslator } from "@application/common/ports/error-translator.js";
import {
	DeskAlreadyReservedError,
	ReservationConflictError,
	UserAlreadyHasReservationError,
} from "@domain/reservations/entities/reservation.js";

type PgErrorLike = {
	code?: string;
	constraint?: string;
};

/**
 * PostgreSQL error translator.
 * Translates PostgreSQL error codes to domain errors.
 *
 * PostgreSQL error codes:
 * - 23505: unique_violation (duplicate key)
 */
export class PgErrorTranslator implements ErrorTranslator {
	private translatePgError(pgError: PgErrorLike): Error | null {
		if (pgError.code === "23P01") {
			if (pgError.constraint === "excl_reservations_active_desk_slot") {
				return new DeskAlreadyReservedError();
			}
			return new ReservationConflictError();
		}

		if (pgError.code !== "23505") {
			return null;
		}

		if (
			pgError.constraint === "ux_res_active_desk_day" ||
			pgError.constraint === "ux_res_one_desk_day"
		) {
			return new DeskAlreadyReservedError();
		}

		if (
			pgError.constraint === "ux_res_active_user_day" ||
			pgError.constraint === "ux_res_one_user_day"
		) {
			return new UserAlreadyHasReservationError();
		}

		return new ReservationConflictError();
	}

	translateError(error: unknown): Error {
		if (typeof error === "object" && error) {
			const pgError = error as PgErrorLike;
			const translated = this.translatePgError(pgError);
			if (translated) {
				return translated;
			}
		}

		// If error is not recognized, re-throw as-is
		if (error instanceof Error) {
			return error;
		}

		// Fallback for non-Error objects
		return new Error(String(error));
	}
}

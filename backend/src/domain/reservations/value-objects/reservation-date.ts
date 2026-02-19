/**
 * ReservationDate value object - represents a valid reservation date (YYYY-MM-DD)
 */
export type ReservationDate = string & { readonly __brand: "ReservationDate" };

export class InvalidReservationDateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidReservationDateError";
	}
}

export function createReservationDate(value: string): ReservationDate {
	const strictDateFormat = /^\d{4}-\d{2}-\d{2}$/;
	if (!strictDateFormat.test(value)) {
		throw new InvalidReservationDateError("Date must be in strict YYYY-MM-DD format");
	}

	const parts = value.split("-");
	if (parts.length !== 3) {
		throw new InvalidReservationDateError("Date must be in YYYY-MM-DD format");
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		throw new InvalidReservationDateError("Date parts must be numeric");
	}

	if (year < 1900 || year > 2100) {
		throw new InvalidReservationDateError("Year must be between 1900 and 2100");
	}

	if (month < 1 || month > 12) {
		throw new InvalidReservationDateError("Month must be between 1 and 12");
	}

	if (day < 1 || day > 31) {
		throw new InvalidReservationDateError("Day must be between 1 and 31");
	}

	// Validate actual calendar date
	const dateUtc = Date.UTC(year, month - 1, day);
	const checkDate = new Date(dateUtc);
	if (
		checkDate.getUTCFullYear() !== year ||
		checkDate.getUTCMonth() !== month - 1 ||
		checkDate.getUTCDate() !== day
	) {
		throw new InvalidReservationDateError("Invalid calendar date");
	}

	return value as ReservationDate;
}

export function reservationDateToString(date: ReservationDate): string {
	return date;
}

export function isReservationDateInPast(date: ReservationDate): boolean {
	const parts = date.split("-");
	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	const dateUtc = Date.UTC(year, month - 1, day);
	const todayUtc = Date.UTC(
		new Date().getUTCFullYear(),
		new Date().getUTCMonth(),
		new Date().getUTCDate()
	);

	return dateUtc < todayUtc;
}

import { Reservation, type ReservationStatus } from "@domain/reservations/entities/reservation.js";

export const RESERVATION_DEFAULT_CHECKIN_ALLOWED_FROM = "06:00";
export const RESERVATION_DEFAULT_CHECKIN_CUTOFF_TIME = "12:00";

export type QrCheckInPolicyInput = {
	status: ReservationStatus;
	reservationDate: string;
	timezone: string;
	checkinAllowedFrom: string;
	checkinCutoffTime: string;
	now?: Date;
};

export type QrCheckInPolicyDecision =
	| "can_check_in"
	| "already_checked_in"
	| "not_active";

export type NoShowPolicyInput = {
	status: ReservationStatus;
	reservationDate: string;
	timezone: string;
	checkinCutoffTime: string;
	now?: Date;
};

export type NoShowPolicyDecision = "mark_no_show" | "keep_reserved";

export type SameDayBookingPolicyInput = {
	reservationDate: string;
	timezone: string;
	checkinAllowedFrom: string;
	now?: Date;
};

type LocalDateTime = {
	date: string;
	time: string;
};

function getLocalDateTime(timezone: string, now: Date): LocalDateTime {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(now);

	const values = new Map(parts.map(part => [part.type, part.value]));
	const year = values.get("year") ?? "";
	const month = values.get("month") ?? "";
	const day = values.get("day") ?? "";
	const hour = values.get("hour") ?? "";
	const minute = values.get("minute") ?? "";

	return {
		date: `${year}-${month}-${day}`,
		time: `${hour}:${minute}`,
	};
}

function parseTimeToMinutes(value: string): number | null {
	const [hourRaw = "", minuteRaw = ""] = value.split(":");
	const hour = Number.parseInt(hourRaw, 10);
	const minute = Number.parseInt(minuteRaw, 10);

	if (
		!Number.isFinite(hour) ||
		!Number.isFinite(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null;
	}

	return hour * 60 + minute;
}

function withTimeDefault(
	value: string,
	defaultValue: string
): string {
	return parseTimeToMinutes(value) === null ? defaultValue : value;
}

function isCheckInWindowOpen(input: QrCheckInPolicyInput): boolean {
	const now = input.now ?? new Date();
	const localDateTime = getLocalDateTime(input.timezone, now);
	if (localDateTime.date !== input.reservationDate) {
		return false;
	}

	const currentMinutes = parseTimeToMinutes(localDateTime.time);
	const allowedFromMinutes = parseTimeToMinutes(
		withTimeDefault(
			input.checkinAllowedFrom,
			RESERVATION_DEFAULT_CHECKIN_ALLOWED_FROM
		)
	);
	const cutoffMinutes = parseTimeToMinutes(
		withTimeDefault(
			input.checkinCutoffTime,
			RESERVATION_DEFAULT_CHECKIN_CUTOFF_TIME
		)
	);

	if (
		currentMinutes === null ||
		allowedFromMinutes === null ||
		cutoffMinutes === null
	) {
		return false;
	}

	return currentMinutes >= allowedFromMinutes && currentMinutes <= cutoffMinutes;
}

export function isSameDayBookingClosed(input: SameDayBookingPolicyInput): boolean {
	const now = input.now ?? new Date();
	const localDateTime = getLocalDateTime(input.timezone, now);
	if (localDateTime.date !== input.reservationDate) {
		return false;
	}

	const currentMinutes = parseTimeToMinutes(localDateTime.time);
	const allowedFromMinutes = parseTimeToMinutes(
		withTimeDefault(
			input.checkinAllowedFrom,
			RESERVATION_DEFAULT_CHECKIN_ALLOWED_FROM
		)
	);

	if (currentMinutes === null || allowedFromMinutes === null) {
		return false;
	}

	return currentMinutes >= allowedFromMinutes;
}

export function evaluateNoShowPolicy(
	input: NoShowPolicyInput
): NoShowPolicyDecision {
	if (input.status !== "reserved") {
		return "keep_reserved";
	}

	const now = input.now ?? new Date();
	const localDateTime = getLocalDateTime(input.timezone, now);

	if (localDateTime.date < input.reservationDate) {
		return "keep_reserved";
	}
	if (localDateTime.date > input.reservationDate) {
		return "mark_no_show";
	}

	const currentMinutes = parseTimeToMinutes(localDateTime.time);
	const cutoffMinutes = parseTimeToMinutes(
		withTimeDefault(
			input.checkinCutoffTime,
			RESERVATION_DEFAULT_CHECKIN_CUTOFF_TIME
		)
	);

	if (currentMinutes === null || cutoffMinutes === null) {
		return "keep_reserved";
	}

	return currentMinutes > cutoffMinutes
		? "mark_no_show"
		: "keep_reserved";
}

export function evaluateQrCheckInPolicy(
	input: QrCheckInPolicyInput
): QrCheckInPolicyDecision {
	if (Reservation.isAlreadyCheckedInStatus(input.status)) {
		return "already_checked_in";
	}
	if (!Reservation.canCheckInFromStatus(input.status)) {
		return "not_active";
	}
	if (!isCheckInWindowOpen(input)) {
		return "not_active";
	}
	return "can_check_in";
}

export function isWorkingDayReservationDate(date: string): boolean {
	const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
	return dayOfWeek !== 0 && dayOfWeek !== 6;
}


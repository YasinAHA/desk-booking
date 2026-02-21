import assert from "node:assert/strict";
import test from "node:test";

import {
	evaluateQrCheckInPolicy,
	isWorkingDayReservationDate,
} from "@domain/reservations/policies/reservation-policy.js";

test("evaluateQrCheckInPolicy returns already_checked_in for checked_in status", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "checked_in",
		reservationDate: "2026-03-10",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "08:00",
		checkinCutoffTime: "12:00",
		now: new Date("2026-03-10T08:30:00.000Z"),
	});

	assert.equal(decision, "already_checked_in");
});

test("evaluateQrCheckInPolicy returns can_check_in inside allowed local window", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "reserved",
		reservationDate: "2026-03-10",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "08:00",
		checkinCutoffTime: "12:00",
		now: new Date("2026-03-10T08:30:00.000Z"),
	});

	assert.equal(decision, "can_check_in");
});

test("evaluateQrCheckInPolicy returns not_active outside allowed local window", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "reserved",
		reservationDate: "2026-03-10",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "10:00",
		checkinCutoffTime: "12:00",
		now: new Date("2026-03-10T08:30:00.000Z"),
	});

	assert.equal(decision, "not_active");
});

test("evaluateQrCheckInPolicy returns not_active when local date does not match reservation date", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "reserved",
		reservationDate: "2026-03-10",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "08:00",
		checkinCutoffTime: "12:00",
		now: new Date("2026-03-09T23:30:00.000Z"),
	});

	assert.equal(decision, "not_active");
});

test("evaluateQrCheckInPolicy keeps cutoff boundary inclusive", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "reserved",
		reservationDate: "2026-03-10",
		timezone: "UTC",
		checkinAllowedFrom: "08:00",
		checkinCutoffTime: "12:00",
		now: new Date("2026-03-10T12:00:00.000Z"),
	});

	assert.equal(decision, "can_check_in");
});

test("evaluateQrCheckInPolicy returns not_active for non-reserved status", () => {
	const decision = evaluateQrCheckInPolicy({
		status: "cancelled",
		reservationDate: "2026-03-10",
		timezone: "Europe/Madrid",
		checkinAllowedFrom: "00:00",
		checkinCutoffTime: "23:59",
		now: new Date("2026-03-10T08:30:00.000Z"),
	});

	assert.equal(decision, "not_active");
});

test("isWorkingDayReservationDate returns false for weekend", () => {
	assert.equal(isWorkingDayReservationDate("2099-02-21"), false);
	assert.equal(isWorkingDayReservationDate("2099-02-22"), false);
});

test("isWorkingDayReservationDate returns true for work day", () => {
	assert.equal(isWorkingDayReservationDate("2099-02-23"), true);
});

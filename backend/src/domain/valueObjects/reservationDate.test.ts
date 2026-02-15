import assert from "node:assert/strict";
import test from "node:test";

import {
    createReservationDate,
    InvalidReservationDateError,
    isReservationDateInPast,
    reservationDateToString,
} from "./reservationDate.js";

test("createReservationDate accepts valid date", () => {
	const date = createReservationDate("2026-02-20");
	assert.equal(reservationDateToString(date), "2026-02-20");
});

test("createReservationDate rejects date with slashes", () => {
	assert.throws(
		() => createReservationDate("20/02/2026"),
		InvalidReservationDateError
	);
});

test("createReservationDate accepts date with single digit month and day", () => {
	const date = createReservationDate("2026-2-5");
	// Value is normalized as-is (we could normalize to zero-padded if needed)
	assert.equal(reservationDateToString(date), "2026-2-5");
});

test("createReservationDate rejects non-date string", () => {
	assert.throws(
		() => createReservationDate("not-a-date"),
		InvalidReservationDateError
	);
});

test("createReservationDate rejects February 31", () => {
	assert.throws(
		() => createReservationDate("2026-02-31"),
		InvalidReservationDateError
	);
});

test("createReservationDate rejects month 13", () => {
	assert.throws(
		() => createReservationDate("2026-13-01"),
		InvalidReservationDateError
	);
});

test("createReservationDate rejects month 0", () => {
	assert.throws(
		() => createReservationDate("2026-00-15"),
		InvalidReservationDateError
	);
});

test("createReservationDate accepts leap year Feb 29", () => {
	// 2024 is a leap year
	const leapDate = createReservationDate("2024-02-29");
	assert.equal(reservationDateToString(leapDate), "2024-02-29");
});

test("createReservationDate rejects non-leap year Feb 29", () => {
	// 2026 is not a leap year
	assert.throws(
		() => createReservationDate("2026-02-29"),
		InvalidReservationDateError
	);
});

test("isReservationDateInPast detects past dates", () => {
	const pastDate = createReservationDate("2020-01-01");
	assert.equal(isReservationDateInPast(pastDate), true);
});

test("isReservationDateInPast accepts future dates", () => {
	const futureDate = createReservationDate("2099-12-31");
	assert.equal(isReservationDateInPast(futureDate), false);
});

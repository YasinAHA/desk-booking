import assert from "node:assert/strict";
import test from "node:test";

import { CheckInByQrHandler } from "@application/reservations/commands/check-in-by-qr.handler.js";
import type { ReservationCommandRepository } from "@application/reservations/ports/reservation-command-repository.js";

test("CheckInByQrHandler.execute delegates to repository", async () => {
	const commandRepo: ReservationCommandRepository = {
		create: async () => {
			throw new Error("not used");
		},
		cancel: async () => false,
		checkInByQr: async (_userId, _date, qrPublicId) => {
			assert.equal(qrPublicId, "qr-123");
			return "checked_in";
		},
	};
	const handler = new CheckInByQrHandler({ commandRepo });

	const result = await handler.execute({
		userId: "11111111-1111-1111-1111-111111111111",
		date: "2026-02-23",
		qrPublicId: "qr-123",
	});

	assert.equal(result, "checked_in");
});

import assert from "node:assert/strict";
import test from "node:test";

import { PgEmailVerificationRepository } from "@infrastructure/auth/repositories/pg-email-verification-repository.js";

test("PgEmailVerificationRepository.findByTokenHash returns null when missing", async () => {
	const repo = new PgEmailVerificationRepository({
		query: async () => ({ rows: [] }),
	});

	const result = await repo.findByTokenHash("token-hash");
	assert.equal(result, null);
});

test("PgEmailVerificationRepository.confirmEmailByTokenHash returns invalid_token when token does not exist", async () => {
	let callCount = 0;
	const repo = new PgEmailVerificationRepository({
		query: async () => {
			callCount += 1;
			if (callCount === 1) {
				return { rows: [] };
			}
			assert.fail("Unexpected DB query for invalid token path");
		},
	});

	const result = await repo.confirmEmailByTokenHash("token-hash");
	assert.equal(result, "invalid_token");
});

test("PgEmailVerificationRepository.confirmEmailByTokenHash returns confirmed on success", async () => {
	let callCount = 0;
	const repo = new PgEmailVerificationRepository({
		query: async () => {
			callCount += 1;
			if (callCount === 1) {
				return {
					rows: [
						{
							id: "verification-1",
							user_id: "user-1",
							expires_at: "2099-01-01T00:00:00.000Z",
							consumed_at: null,
							confirmed_at: null,
						},
					],
				};
			}
			if (callCount === 2) {
				return { rows: [{ user_id: "user-1" }], rowCount: 1 };
			}
			if (callCount === 3) {
				return { rows: [{ id: "user-1" }], rowCount: 1 };
			}
			assert.fail("Unexpected DB query for confirm success path");
		},
	});

	const result = await repo.confirmEmailByTokenHash("token-hash");
	assert.equal(result, "confirmed");
});

test("PgEmailVerificationRepository.create uses ttlMs", async () => {
	let receivedParams: unknown[] | undefined;
	const repo = new PgEmailVerificationRepository({
		query: async (_text, params) => {
			receivedParams = params;
			return { rows: [] };
		},
	});

	await repo.create("user-1", "token-hash", 86400000);
	assert.deepEqual(receivedParams, ["user-1", "token-hash", 86400000]);
});

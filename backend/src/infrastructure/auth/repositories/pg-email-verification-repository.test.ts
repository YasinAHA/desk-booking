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
	const repo = new PgEmailVerificationRepository({
		query: async (text) => {
			if (text.includes("from email_verifications ev")) {
				return { rows: [] };
			}
			return { rows: [], rowCount: 0 };
		},
	});

	const result = await repo.confirmEmailByTokenHash("token-hash");
	assert.equal(result, "invalid_token");
});

test("PgEmailVerificationRepository.confirmEmailByTokenHash returns confirmed on success", async () => {
	const repo = new PgEmailVerificationRepository({
		query: async (text) => {
			if (text.includes("from email_verifications ev")) {
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
			if (text.startsWith("update email_verifications")) {
				return { rows: [{ user_id: "user-1" }], rowCount: 1 };
			}
			if (text.startsWith("update users")) {
				return { rows: [{ id: "user-1" }], rowCount: 1 };
			}
			return { rows: [], rowCount: 0 };
		},
	});

	const result = await repo.confirmEmailByTokenHash("token-hash");
	assert.equal(result, "confirmed");
});

test("PgEmailVerificationRepository.create uses ttlMs", async () => {
	let receivedParams: unknown[] | undefined;
	const repo = new PgEmailVerificationRepository({
		query: async (text, params) => {
			assert.ok(text.includes("expires_at"));
			assert.ok(text.includes("interval '1 millisecond'"));
			receivedParams = params;
			return { rows: [] };
		},
	});

	await repo.create("user-1", "token-hash", 86400000);
	assert.deepEqual(receivedParams, ["user-1", "token-hash", 86400000]);
});

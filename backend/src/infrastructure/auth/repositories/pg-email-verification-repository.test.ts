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

test("PgEmailVerificationRepository.confirmEmailByTokenHash returns true on success", async () => {
	let receivedParams: unknown[] | undefined;
	const repo = new PgEmailVerificationRepository({
		query: async (text, params) => {
			assert.ok(text.includes("email_verifications"));
			assert.ok(text.includes("confirmed_count"));
			receivedParams = params;
			return { rows: [{ confirmed_count: 1 }] };
		},
	});

	const result = await repo.confirmEmailByTokenHash("token-hash");
	assert.deepEqual(receivedParams, ["token-hash"]);
	assert.equal(result, true);
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

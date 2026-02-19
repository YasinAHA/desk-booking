import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordHash } from "@domain/auth/value-objects/password-hash.js";
import { PgPasswordResetRepository } from "./pg-password-reset-repository.js";

test("PgPasswordResetRepository.resetPasswordByTokenHash returns invalid_token when missing", async () => {
	const repo = new PgPasswordResetRepository({
		query: async () => ({ rows: [] }),
	});

	const result = await repo.resetPasswordByTokenHash(
		"missing",
		createPasswordHash("hash:new-pass")
	);

	assert.equal(result, "invalid_token");
});

test("PgPasswordResetRepository.resetPasswordByTokenHash returns expired when token is expired", async () => {
	const repo = new PgPasswordResetRepository({
		query: async () => ({
			rows: [
				{
					id: "reset-1",
					user_id: "user-1",
					expires_at: "2020-01-01T00:00:00.000Z",
					consumed_at: null,
				},
			],
		}),
	});

	const result = await repo.resetPasswordByTokenHash(
		"expired-token",
		createPasswordHash("hash:new-pass")
	);

	assert.equal(result, "expired");
});

test("PgPasswordResetRepository.resetPasswordByTokenHash returns password_reset when consume and update succeed", async () => {
	let updateCalled = false;
	const repo = new PgPasswordResetRepository({
		query: async text => {
			if (text.startsWith("select id, user_id, expires_at, consumed_at")) {
				return {
					rows: [
						{
							id: "reset-1",
							user_id: "user-1",
							expires_at: "2099-01-01T00:00:00.000Z",
							consumed_at: null,
						},
					],
				};
			}

			if (text.startsWith("update password_resets set consumed_at = now()")) {
				return { rows: [{ user_id: "user-1" }], rowCount: 1 };
			}

			if (text.startsWith("update users set password_hash = $1")) {
				updateCalled = true;
				return { rows: [], rowCount: 1 };
			}

			return { rows: [], rowCount: 0 };
		},
	});

	const result = await repo.resetPasswordByTokenHash(
		"valid-token",
		createPasswordHash("hash:new-pass")
	);

	assert.equal(result, "password_reset");
	assert.equal(updateCalled, true);
});

import assert from "node:assert/strict";
import test from "node:test";

import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import { createPasswordHash } from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";
import { PgUserRepository } from "./pg-user-repository.js";

const baseUserRow = {
	id: "user-1",
	email: "user@camerfirma.com",
	password_hash: "hash",
	first_name: "User",
	last_name: "Tester",
	second_last_name: null,
	confirmed_at: null,
};

test("PgUserRepository.findByEmail maps user row", async () => {
	let receivedParams: unknown[] | undefined;
	const repo = new PgUserRepository({
		query: async (_text, params) => {
			receivedParams = params;
			return { rows: [baseUserRow] };
		},
	});

	const result = await repo.findByEmail(createEmail("user@camerfirma.com"));
	assert.deepEqual(receivedParams, ["user@camerfirma.com"]);
	
	// Check the result is a User instance with correct properties
	assert.ok(result instanceof User);
	assert.deepEqual(result?.id, createUserId("user-1"));
	assert.deepEqual(result?.email, createEmail("user@camerfirma.com"));
	assert.equal(result?.firstName, "User");
	assert.equal(result?.lastName, "Tester");
	assert.equal(result?.secondLastName, null);
	assert.equal(result?.isConfirmed(), false);
});

test("PgUserRepository.findAuthData includes passwordHash", async () => {
	const repo = new PgUserRepository({
		query: async (_text, params) => {
			assert.deepEqual(params, ["user@camerfirma.com"]);
			return { rows: [baseUserRow] };
		},
	});

	const result = await repo.findAuthData(createEmail("user@camerfirma.com"));
	
	// Check the result has correct structure
	assert.ok(result?.user instanceof User);
	assert.deepEqual(result?.user.id, createUserId("user-1"));
	assert.deepEqual(result?.user.email, createEmail("user@camerfirma.com"));
	assert.equal(result?.user.firstName, "User");
	assert.equal(result?.user.lastName, "Tester");
	assert.equal(result?.user.secondLastName, null);
	assert.equal(result?.user.isConfirmed(), false);
	assert.deepEqual(result?.passwordHash, createPasswordHash("hash"));
});

test("PgUserRepository.updatePassword updates hash by user id", async () => {
	let receivedParams: unknown[] | undefined;
	const repo = new PgUserRepository({
		query: async (_text, params) => {
			receivedParams = params;
			return { rows: [], rowCount: 1 };
		},
	});

	await repo.updatePassword(
		createUserId("user-1"),
		createPasswordHash("hash:new-pass")
	);

	assert.deepEqual(receivedParams, ["hash:new-pass", "user-1"]);
});



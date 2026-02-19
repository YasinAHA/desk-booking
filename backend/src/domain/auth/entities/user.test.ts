import assert from "node:assert/strict";
import test from "node:test";

import { User } from "@domain/auth/entities/user.js";
import { createEmail } from "@domain/auth/value-objects/email.js";
import { createPasswordHash } from "@domain/auth/value-objects/password-hash.js";
import { createUserId } from "@domain/auth/value-objects/user-id.js";

function buildUser(overrides?: { confirmedAt?: string | null }) {
	return new User(
		createUserId("user-1"),
		createEmail("admin@camerfirma.com"),
		"Admin",
		"User",
		null,
		createPasswordHash("hash:password"),
		overrides?.confirmedAt ?? null
	);
}

test("User.isConfirmed reflects confirmedAt state", () => {
	assert.equal(buildUser({ confirmedAt: null }).isConfirmed(), false);
	assert.equal(
		buildUser({ confirmedAt: "2026-02-20T10:00:00.000Z" }).isConfirmed(),
		true
	);
});

test("User.confirmEmail returns a new confirmed instance", () => {
	const user = buildUser({ confirmedAt: null });
	const confirmed = user.confirmEmail("2026-02-20T10:00:00.000Z");

	assert.equal(user.isConfirmed(), false);
	assert.equal(confirmed.isConfirmed(), true);
	assert.equal(confirmed.confirmedAt, "2026-02-20T10:00:00.000Z");
});

test("User.confirmEmail throws when user is already confirmed", () => {
	const user = buildUser({ confirmedAt: "2026-02-20T10:00:00.000Z" });
	assert.throws(() => user.confirmEmail("2026-02-21T10:00:00.000Z"), Error);
});

test("User.updateCredentials returns a new immutable user", () => {
	const user = buildUser({ confirmedAt: "2026-02-20T10:00:00.000Z" });
	const updated = user.updateCredentials(
		createPasswordHash("hash:new-password"),
		"New",
		"Name",
		"Last"
	);

	assert.equal(updated.firstName, "New");
	assert.equal(updated.lastName, "Name");
	assert.equal(updated.secondLastName, "Last");
	assert.equal(updated.confirmedAt, "2026-02-20T10:00:00.000Z");
	assert.notEqual(updated.passwordHash, user.passwordHash);
});

test("User.hasPasswordHash is true when password hash exists", () => {
	assert.equal(buildUser().hasPasswordHash(), true);
});

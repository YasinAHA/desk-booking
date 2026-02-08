import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { env } from "../../config/env.js";

type UserRow = {
	id: string;
	email: string;
	password_hash: string;
	display_name: string | null;
    confirmed_at: string | null;
};

type AuthUser = {
	id: string;
	email: string;
	displayName: string | null;
};

export type LoginResult =
	| { status: "OK"; user: AuthUser }
	| { status: "NOT_CONFIRMED" }
	| null;

export type RegisterResult =
	| { status: "OK"; token: string }
	| { status: "ALREADY_CONFIRMED" }
	| { status: "DOMAIN_NOT_ALLOWED" };

function isAllowedEmail(email: string) {
	const domain = email.split("@")[1]?.toLowerCase();
	return !!domain && env.ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export async function loginWithPassword(
	app: FastifyInstance,
	email: string,
	password: string
): Promise<LoginResult> {
	if (!isAllowedEmail(email)) {
		return null;
	}

	const result = await app.db.query(
		"select id, email, password_hash, display_name, confirmed_at from users where email = $1",
		[email]
	);

	const existing = result.rows[0] as UserRow | undefined;
	if (!existing) {
		return null;
	}

	if (!existing.confirmed_at) {
		return { status: "NOT_CONFIRMED" };
	}

	const ok = await argon2.verify(existing.password_hash, password);
	if (!ok) {
		return null;
	}

	return {
		status: "OK",
		user: {
			id: existing.id,
			email: existing.email,
			displayName: existing.display_name,
		},
	};
}

function hashToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function buildToken() {
	return randomBytes(32).toString("hex");
}

async function createVerification(
	app: FastifyInstance,
	userId: string
): Promise<string> {
	const token = buildToken();
	const tokenHash = hashToken(token);

	await app.db.query(
		"insert into email_verifications (user_id, token_hash, expires_at) " +
			"values ($1, $2, now() + interval '24 hours')",
		[userId, tokenHash]
	);

	return token;
}

export async function registerUser(
	app: FastifyInstance,
	email: string,
	password: string,
	displayName?: string
): Promise<RegisterResult> {
	if (!isAllowedEmail(email)) {
		return { status: "DOMAIN_NOT_ALLOWED" };
	}

	const existing = await app.db.query(
		"select id, confirmed_at from users where email = $1",
		[email]
	);

	const existingRow = existing.rows[0] as { id: string; confirmed_at: string | null } | undefined;
	const passwordHash = await argon2.hash(password);

	if (existingRow) {
		if (existingRow.confirmed_at) {
			return { status: "ALREADY_CONFIRMED" };
		}

		await app.db.query(
			"update users set password_hash = $1, display_name = $2, updated_at = now() " +
				"where id = $3",
			[passwordHash, displayName ?? null, existingRow.id]
		);

		const token = await createVerification(app, existingRow.id);
		return { status: "OK", token };
	}

	const created = await app.db.query(
		"insert into users (email, password_hash, display_name) " +
			"values ($1, $2, $3) returning id",
		[email, passwordHash, displayName ?? null]
	);

	const userId = created.rows[0]?.id as string | undefined;
	if (!userId) {
		return { status: "ALREADY_CONFIRMED" };
	}

	const token = await createVerification(app, userId);
	return { status: "OK", token };
}

export async function confirmEmail(
	app: FastifyInstance,
	token: string
): Promise<boolean> {
	const tokenHash = hashToken(token);
	const found = await app.db.query(
		"select id, user_id from email_verifications " +
			"where token_hash = $1 and consumed_at is null and expires_at > now()",
		[tokenHash]
	);

	const row = found.rows[0] as { id: string; user_id: string } | undefined;
	if (!row) {
		return false;
	}

	await app.db.query(
		"update users set confirmed_at = now() where id = $1 and confirmed_at is null",
		[row.user_id]
	);

	await app.db.query(
		"update email_verifications set consumed_at = now() where id = $1",
		[row.id]
	);

	return true;
}


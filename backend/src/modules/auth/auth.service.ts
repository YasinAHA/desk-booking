import argon2 from "argon2";

import type { FastifyInstance } from "fastify";

import { env } from "../../config/env.js";

type UserRow = {
	id: string;
	email: string;
	password_hash: string;
	display_name: string | null;
};

type AuthUser = {
	id: string;
	email: string;
	displayName: string | null;
};

function isAllowedEmail(email: string) {
	const domain = email.split("@")[1]?.toLowerCase();
	return !!domain && env.ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export async function loginWithPassword(
	app: FastifyInstance,
	email: string,
	password: string
): Promise<AuthUser | null> {
	if (!isAllowedEmail(email)) {
		return null;
	}

	const result = await app.db.query(
		"select id, email, password_hash, display_name from users where email = $1",
		[email]
	);

	const existing = result.rows[0] as UserRow | undefined;
	if (!existing) {
		return null;
	}

	const ok = await argon2.verify(existing.password_hash, password);
	if (!ok) {
		return null;
	}

	return {
		id: existing.id,
		email: existing.email,
		displayName: existing.display_name,
	};
}


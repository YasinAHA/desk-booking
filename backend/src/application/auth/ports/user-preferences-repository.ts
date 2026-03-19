import type { UserId } from "@domain/auth/value-objects/user-id.js";

export interface AuthUserPreferencesRepository {
	ensureForUser(userId: UserId): Promise<void>;
}


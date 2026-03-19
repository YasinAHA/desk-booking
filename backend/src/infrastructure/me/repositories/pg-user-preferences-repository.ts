import type {
	UserLanguage,
	UserPreferences,
	UserPreferencesPatch,
	UserPreferencesRepository,
	UserTheme,
} from "@application/me/ports/user-preferences-repository.js";

type DbQueryResult = {
	rows: unknown[];
	rowCount?: number | null;
};

type DbQuery = (text: string, params?: unknown[]) => Promise<DbQueryResult>;

type DbClient = {
	query: DbQuery;
};

type UserPreferencesRow = {
	user_id: string;
	theme: UserTheme;
	language: UserLanguage;
	timezone: string;
	email_notifications_enabled: boolean;
	created_at: string | Date;
	updated_at: string | Date;
};

function isUserPreferencesRow(value: unknown): value is UserPreferencesRow {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const row = value as Record<string, unknown>;
	return (
		typeof row.user_id === "string" &&
		(row.theme === "light" || row.theme === "dark" || row.theme === "system") &&
		(row.language === "es" || row.language === "en") &&
		typeof row.timezone === "string" &&
		typeof row.email_notifications_enabled === "boolean" &&
		(typeof row.created_at === "string" || row.created_at instanceof Date) &&
		(typeof row.updated_at === "string" || row.updated_at instanceof Date)
	);
}

function asIsoString(value: string | Date): string {
	return value instanceof Date ? value.toISOString() : value;
}

function mapUserPreferences(row: UserPreferencesRow): UserPreferences {
	return {
		userId: row.user_id,
		theme: row.theme,
		language: row.language,
		timezone: row.timezone,
		emailNotificationsEnabled: row.email_notifications_enabled,
		createdAt: asIsoString(row.created_at),
		updatedAt: asIsoString(row.updated_at),
	};
}

const USER_PREFERENCES_SELECT =
	"user_id, theme, language, timezone, email_notifications_enabled, created_at, updated_at";

export class PgUserPreferencesRepository implements UserPreferencesRepository {
	constructor(private readonly db: DbClient) {}

	async ensureForUser(userId: string): Promise<void> {
		await this.db.query(
			"insert into user_preferences (user_id) values ($1) on conflict (user_id) do nothing",
			[userId]
		);
	}

	async getByUserId(userId: string): Promise<UserPreferences> {
		const result = await this.db.query(
			`select ${USER_PREFERENCES_SELECT} from user_preferences where user_id = $1`,
			[userId]
		);
		const row = result.rows[0];
		if (!isUserPreferencesRow(row)) {
			throw new Error("Invalid user_preferences row");
		}
		return mapUserPreferences(row);
	}

	async updateByUserId(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
		const assignments: string[] = [];
		const params: unknown[] = [];

		if (patch.theme !== undefined) {
			params.push(patch.theme);
			assignments.push(`theme = $${params.length}`);
		}
		if (patch.language !== undefined) {
			params.push(patch.language);
			assignments.push(`language = $${params.length}`);
		}
		if (patch.timezone !== undefined) {
			params.push(patch.timezone);
			assignments.push(`timezone = $${params.length}`);
		}
		if (patch.emailNotificationsEnabled !== undefined) {
			params.push(patch.emailNotificationsEnabled);
			assignments.push(`email_notifications_enabled = $${params.length}`);
		}

		if (assignments.length === 0) {
			return this.getByUserId(userId);
		}

		params.push(userId);
		const result = await this.db.query(
			`update user_preferences set ${assignments.join(", ")}, updated_at = now() where user_id = $${
				params.length
			} returning ${USER_PREFERENCES_SELECT}`,
			params
		);

		const row = result.rows[0];
		if (!isUserPreferencesRow(row)) {
			throw new Error("Invalid user_preferences update result");
		}
		return mapUserPreferences(row);
	}
}


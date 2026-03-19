export type UserTheme = "light" | "dark" | "system";
export type UserLanguage = "es" | "en";

export type UserPreferences = {
	userId: string;
	theme: UserTheme;
	language: UserLanguage;
	timezone: string;
	emailNotificationsEnabled: boolean;
	createdAt: string;
	updatedAt: string;
};

export type UserPreferencesPatch = {
	theme?: UserTheme;
	language?: UserLanguage;
	timezone?: string;
	emailNotificationsEnabled?: boolean;
};

export interface UserPreferencesRepository {
	getByUserId(userId: string): Promise<UserPreferences>;
	updateByUserId(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences>;
	ensureForUser(userId: string): Promise<void>;
}


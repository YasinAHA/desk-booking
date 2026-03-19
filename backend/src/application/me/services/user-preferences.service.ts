import type {
	UserPreferences,
	UserPreferencesPatch,
	UserPreferencesRepository,
} from "@application/me/ports/user-preferences-repository.js";

type UserPreferencesServiceDependencies = {
	userPreferencesRepo: UserPreferencesRepository;
};

export class UserPreferencesService {
	constructor(private readonly deps: UserPreferencesServiceDependencies) {}

	async getByUserId(userId: string): Promise<UserPreferences> {
		await this.deps.userPreferencesRepo.ensureForUser(userId);
		return this.deps.userPreferencesRepo.getByUserId(userId);
	}

	async updateByUserId(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
		await this.deps.userPreferencesRepo.ensureForUser(userId);
		return this.deps.userPreferencesRepo.updateByUserId(userId, patch);
	}
}


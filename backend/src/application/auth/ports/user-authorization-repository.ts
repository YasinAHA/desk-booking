export interface UserAuthorizationRepository {
	isAdminUser(userId: string): Promise<boolean>;
}


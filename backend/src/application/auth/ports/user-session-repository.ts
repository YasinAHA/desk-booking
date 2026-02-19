export interface UserSessionRepository {
	getTokenValidAfter(userId: string): Promise<Date | null>;
}


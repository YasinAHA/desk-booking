export interface EmailConfirmationService {
	sendConfirmation(email: string, token: string): Promise<void>;
}
export interface AllowedEmailDomainRepository {
	listAllowedDomains(): Promise<string[]>;
	isSelfRegistrationEnabled(): Promise<boolean>;
}

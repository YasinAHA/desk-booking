export interface AllowedEmailDomainRepository {
	listAllowedDomains(): Promise<string[]>;
}

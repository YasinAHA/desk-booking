export interface TokenService {
	generate(): string;
	hash(token: string): string;
}

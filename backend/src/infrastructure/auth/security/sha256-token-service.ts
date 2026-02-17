import { createHash, randomBytes } from "node:crypto";

import type { TokenService } from "@application/auth/ports/token-service.js";
import { TOKEN_BYTES } from "@config/constants.js";

export class Sha256TokenService implements TokenService {
	generate(): string {
		return randomBytes(TOKEN_BYTES).toString("hex");
	}

	hash(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}
}


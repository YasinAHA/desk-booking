import assert from "node:assert/strict";
import test from "node:test";

import { PgAllowedEmailDomainRepository } from "@infrastructure/auth/repositories/pg-allowed-email-domain-repository.js";

test("PgAllowedEmailDomainRepository.listAllowedDomains normalizes domains", async () => {
	const repo = new PgAllowedEmailDomainRepository({
		query: async () => ({
			rows: [
				{ domain: "Camerfirma.COM " },
				{ domain: " internal.camerfirma.com" },
				{ not_domain: "ignored" },
			],
		}),
	});

	const domains = await repo.listAllowedDomains();
	assert.deepEqual(domains, ["camerfirma.com", "internal.camerfirma.com"]);
});

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

test("PgAllowedEmailDomainRepository.isSelfRegistrationEnabled reads global flag", async () => {
	const repo: Pick<PgAllowedEmailDomainRepository, "isSelfRegistrationEnabled"> =
		new PgAllowedEmailDomainRepository({
		query: async (text: string) => {
			if (text.includes("select allow_self_registration from app_settings")) {
				return { rows: [{ allow_self_registration: true }] };
			}
			return { rows: [] };
		},
	});

	const enabled = await repo.isSelfRegistrationEnabled();
	assert.equal(enabled, true);
});

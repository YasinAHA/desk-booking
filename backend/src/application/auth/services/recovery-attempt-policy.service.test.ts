import assert from "node:assert/strict";
import test from "node:test";

import { RecoveryAttemptPolicyService } from "@application/auth/services/recovery-attempt-policy.service.js";
import { Sha256TokenService } from "@infrastructure/auth/security/sha256-token-service.js";

function buildService(): RecoveryAttemptPolicyService {
	return new RecoveryAttemptPolicyService(new Sha256TokenService(), {
		forgotPasswordIdentifier: {
			max: 2,
			timeWindowMs: 60_000,
		},
		resetPasswordIdentifier: {
			max: 1,
			timeWindowMs: 60_000,
		},
	});
}

test("RecoveryAttemptPolicyService consumes forgot-password attempts by identifier", () => {
	const service = buildService();
	const first = service.consumeForgotPasswordAttempt("user@camerfirma.com");
	const second = service.consumeForgotPasswordAttempt("user@camerfirma.com");
	const third = service.consumeForgotPasswordAttempt("user@camerfirma.com");

	assert.equal(first.allowed, true);
	assert.equal(second.allowed, true);
	assert.equal(third.allowed, false);
	assert.equal(first.emailHash, second.emailHash);
});

test("RecoveryAttemptPolicyService consumes reset-password attempts by token", () => {
	const service = buildService();
	const first = service.consumeResetPasswordAttempt("token-1");
	const second = service.consumeResetPasswordAttempt("token-1");

	assert.equal(first.allowed, true);
	assert.equal(second.allowed, false);
	assert.equal(first.tokenHash, second.tokenHash);
});

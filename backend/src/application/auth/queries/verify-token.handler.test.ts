import assert from "node:assert/strict";
import test from "node:test";

import { VerifyTokenHandler } from "@application/auth/queries/verify-token.handler.js";

test("VerifyTokenHandler.execute delegates to auth session lifecycle service", async () => {
	const expectedUser = {
		id: "user-1",
		email: "admin@camerfirma.com",
		firstName: "Admin",
		lastName: "User",
		secondLastName: null,
	};
	const handler = new VerifyTokenHandler({
		authSessionLifecycleService: {
			verifyAccessToken: async (token: string) => {
				assert.equal(token, "valid-access-token");
				return expectedUser;
			},
		} as never,
	});

	const result = await handler.execute({ token: "valid-access-token" });
	assert.deepEqual(result, expectedUser);
});

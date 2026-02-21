import assert from "node:assert/strict";
import test from "node:test";

import { RefreshSessionHandler } from "@application/auth/commands/refresh-session.handler.js";

test("RefreshSessionHandler.execute delegates token rotation", async () => {
	const expected = {
		accessToken: "new-access-token",
		refreshToken: "new-refresh-token",
		userId: "user-1",
	};
	const handler = new RefreshSessionHandler({
		authSessionLifecycleService: {
			rotateRefreshToken: async (token: string) => {
				assert.equal(token, "refresh-token");
				return expected;
			},
		} as never,
	});

	const result = await handler.execute({ refreshToken: "refresh-token" });
	assert.deepEqual(result, expected);
});

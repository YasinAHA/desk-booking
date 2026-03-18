import type { preHandlerHookHandler } from "fastify";
import type { AuthSessionLifecycleService } from "@application/auth/services/auth-session-lifecycle.service.js";
import type { RuntimeAppSettingsStore } from "@application/common/ports/runtime-app-settings-store.js";

type AuthenticatedUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
	jti?: string | undefined;
	iat?: number | undefined;
	exp?: number | undefined;
	type?: "access" | "refresh" | undefined;
};

declare module "fastify" {
	interface FastifyInstance {
		db: {
			query: (text: string, params?: unknown[]) => Promise<{
				rows: unknown[];
				rowCount?: number | null;
			}>;
		};
		requireAuth: preHandlerHookHandler;
		authSessionLifecycleService: AuthSessionLifecycleService;
		runtimeAppSettings: RuntimeAppSettingsStore;
	}

	interface FastifyReply {
		rateLimit?: (opts?: { max?: number; timeWindow?: string | number }) => void;
	}

	interface FastifyRequest {
		user: AuthenticatedUser;
	}
}

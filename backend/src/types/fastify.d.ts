import "@fastify/jwt";
import "fastify";
import type { preHandlerHookHandler } from "fastify";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            id: string;
            email: string;
            displayName: string | null;
        };
        user: {
            id: string;
            email: string;
            displayName: string | null;
        };
    }
}

declare module "fastify" {
    interface FastifyInstance {
        db: {
            query: (text: string, params?: unknown[]) => Promise<any>;
        };
        requireAuth: preHandlerHookHandler;
    }

    interface FastifyReply {
        rateLimit?: (opts?: { max?: number; timeWindow?: string | number }) => void;
    }
}

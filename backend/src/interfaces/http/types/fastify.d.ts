import "@fastify/jwt";
import type { preHandlerHookHandler } from "fastify";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            secondLastName: string | null;
        };
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            secondLastName: string | null;
        };
    }
}

declare module "fastify" {
    interface FastifyInstance {
        db: {
            query: (text: string, params?: unknown[]) => Promise<{
                rows: unknown[];
                rowCount?: number | null;
            }>;
        };
        requireAuth: preHandlerHookHandler;
    }

    interface FastifyReply {
        rateLimit?: (opts?: { max?: number; timeWindow?: string | number }) => void;
    }
}

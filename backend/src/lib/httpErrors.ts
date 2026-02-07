import type { FastifyReply } from "fastify";

export type ErrorPayload = {
    error: {
        code: string;
        message: string;
    };
};

export function errorPayload(code: string, message: string): ErrorPayload {
    return {
        error: {
            code,
            message,
        },
    };
}

export function sendError(
    reply: FastifyReply,
    statusCode: number,
    code: string,
    message: string
) {
    return reply.status(statusCode).send(errorPayload(code, message));
}

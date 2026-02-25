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

export class HttpError extends Error {
    readonly statusCode: number;
    readonly code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

export type HttpErrorMapping = {
	matches: (err: unknown) => boolean;
	statusCode: number;
	code: string;
	message: string;
};

export function throwHttpError(
    statusCode: number,
    code: string,
    message: string
): never {
    throw new HttpError(statusCode, code, message);
}

export function isHttpError(err: unknown): err is HttpError {
    return err instanceof HttpError;
}

export function throwMappedHttpError(
	err: unknown,
	mappings: readonly HttpErrorMapping[]
): void {
	for (const mapping of mappings) {
		if (mapping.matches(err)) {
			throwHttpError(mapping.statusCode, mapping.code, mapping.message);
		}
	}
}

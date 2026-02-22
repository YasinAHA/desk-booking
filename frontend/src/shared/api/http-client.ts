import { env } from "../config/env";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens
} from "../auth/session-storage";
import { ApiError } from "./api-error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type RequestOptions<TBody> = {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
};

const NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/verify",
  "/auth/forgot-password",
  "/auth/reset-password"
]);

function buildHeaders(
  auth: boolean,
  accessToken: string | null,
  hasJsonBody: boolean
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function toApiError(status: number, payload: unknown): ApiError {
  const parsed = payload as ErrorEnvelope | null;
  return new ApiError({
    status,
    code: parsed?.error?.code ?? "UNKNOWN_ERROR",
    message: parsed?.error?.message ?? "Request failed",
    details: parsed?.error?.details
  });
}

async function refreshSession(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) {
    return null;
  }

  const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: tokens.refreshToken })
  });

  const payload = (await response.json().catch(() => null)) as RefreshResponse | null;
  if (!response.ok || !payload?.accessToken || !payload.refreshToken) {
    clearStoredTokens();
    return null;
  }

  setStoredTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken
  });
  return payload.accessToken;
}

function buildRequestUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  if (!query) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

type RawHttpResponse = {
  response: Response;
  payload: unknown;
};

function stringifyBody<TBody>(body: TBody | undefined): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

async function executeRequest<TBody>(
  url: string,
  options: {
    method: HttpMethod;
    auth: boolean;
    accessToken: string | null;
    hasJsonBody: boolean;
    body: TBody | undefined;
    signal?: AbortSignal;
  }
): Promise<RawHttpResponse> {
  const response = await fetch(url, {
    method: options.method,
    headers: buildHeaders(options.auth, options.accessToken, options.hasJsonBody),
    body: stringifyBody(options.body),
    signal: options.signal
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  return { response, payload };
}

function canRetryUnauthorized(
  response: Response,
  options: {
    auth: boolean;
    retryOnUnauthorized: boolean;
    path: string;
  }
): boolean {
  return (
    options.auth &&
    options.retryOnUnauthorized &&
    response.status === 401 &&
    !NO_REFRESH_PATHS.has(options.path)
  );
}

export async function request<TResponse, TBody = undefined>(
  options: RequestOptions<TBody>
): Promise<TResponse> {
  const auth = options.auth ?? false;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const requestUrl = buildRequestUrl(options.path, options.query);
  const hasJsonBody = options.body !== undefined;
  const firstCall = await executeRequest(requestUrl, {
    method: options.method,
    auth,
    accessToken: getStoredTokens()?.accessToken ?? null,
    hasJsonBody,
    body: options.body,
    signal: options.signal
  });

  if (firstCall.response.status === 204) {
    return undefined as TResponse;
  }

  if (firstCall.response.ok) {
    return firstCall.payload as TResponse;
  }

  if (!canRetryUnauthorized(firstCall.response, { auth, retryOnUnauthorized, path: options.path })) {
    throw toApiError(firstCall.response.status, firstCall.payload);
  }

  const refreshedAccessToken = await refreshSession();
  if (!refreshedAccessToken) {
    throw toApiError(firstCall.response.status, firstCall.payload);
  }

  const retriedCall = await executeRequest(requestUrl, {
    method: options.method,
    auth: true,
    accessToken: refreshedAccessToken,
    hasJsonBody,
    body: options.body,
    signal: options.signal
  });

  if (retriedCall.response.status === 204) {
    return undefined as TResponse;
  }

  if (retriedCall.response.ok) {
    return retriedCall.payload as TResponse;
  }

  throw toApiError(retriedCall.response.status, retriedCall.payload);
}

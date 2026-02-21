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
  accessToken: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

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

export async function request<TResponse, TBody = undefined>(
  options: RequestOptions<TBody>
): Promise<TResponse> {
  const auth = options.auth ?? false;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const storedAccessToken = getStoredTokens()?.accessToken ?? null;
  const requestUrl = buildRequestUrl(options.path, options.query);

  const response = await fetch(requestUrl, {
    method: options.method,
    headers: buildHeaders(auth, storedAccessToken),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (response.ok) {
    return payload as TResponse;
  }

  if (
    auth &&
    retryOnUnauthorized &&
    response.status === 401 &&
    !NO_REFRESH_PATHS.has(options.path)
  ) {
      const refreshedAccessToken = await refreshSession();
    if (refreshedAccessToken) {
      const retried = await fetch(requestUrl, {
        method: options.method,
        headers: buildHeaders(true, refreshedAccessToken),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal
      });

      if (retried.status === 204) {
        return undefined as TResponse;
      }

      const retriedPayload = (await retried.json().catch(() => null)) as unknown;
      if (retried.ok) {
        return retriedPayload as TResponse;
      }

      throw toApiError(retried.status, retriedPayload);
    }
  }

  throw toApiError(response.status, payload);
}

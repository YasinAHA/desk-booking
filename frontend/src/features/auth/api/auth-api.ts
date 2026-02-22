import { request } from "../../../shared/api/http-client";
import type { paths } from "../../../shared/openapi/generated/schema";

export type LoginRequest =
  paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"];
export type LoginResponse =
  paths["/auth/login"]["post"]["responses"][200]["content"]["application/json"];
export type VerifyResponse =
  paths["/auth/verify"]["post"]["responses"][200]["content"]["application/json"];

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse, LoginRequest>({
    method: "POST",
    path: "/auth/login",
    body: payload
  });
}

export async function verify(token: string): Promise<VerifyResponse> {
  return request<VerifyResponse, { token: string }>({
    method: "POST",
    path: "/auth/verify",
    body: { token },
    retryOnUnauthorized: false
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await request<void, { token: string }>({
    method: "POST",
    path: "/auth/logout",
    auth: true,
    body: { token: refreshToken },
    retryOnUnauthorized: false
  });
}

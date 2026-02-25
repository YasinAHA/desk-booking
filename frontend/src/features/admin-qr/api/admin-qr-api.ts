import { request } from "@shared/api/http-client";
import type { paths } from "@shared/openapi";

export type AdminDesksResponse =
  paths["/desks/admin"]["get"]["responses"][200]["content"]["application/json"];
export type AdminDeskItem = AdminDesksResponse["items"][number];
export type RegenerateDeskQrResponse =
  paths["/desks/admin/{id}/qr/regenerate"]["post"]["responses"][200]["content"]["application/json"];
export type RegenerateAllDeskQrResponse =
  paths["/desks/admin/qr/regenerate-all"]["post"]["responses"][200]["content"]["application/json"];

export async function listAdminDesks(): Promise<AdminDesksResponse> {
  return request<AdminDesksResponse>({
    method: "GET",
    path: "/desks/admin",
    auth: true
  });
}

export async function regenerateDeskQr(
  deskId: string
): Promise<RegenerateDeskQrResponse> {
  return request<RegenerateDeskQrResponse>({
    method: "POST",
    path: `/desks/admin/${deskId}/qr/regenerate`,
    auth: true
  });
}

export async function regenerateAllDeskQr(): Promise<RegenerateAllDeskQrResponse> {
  return request<RegenerateAllDeskQrResponse>({
    method: "POST",
    path: "/desks/admin/qr/regenerate-all",
    auth: true
  });
}


import { request } from "@shared/api/http-client";
import type { paths } from "@shared/openapi/generated/schema";

export type CheckInByQrRequest =
  paths["/reservations/check-in/qr"]["post"]["requestBody"]["content"]["application/json"];
export type CheckInByQrResponse =
  paths["/reservations/check-in/qr"]["post"]["responses"][200]["content"]["application/json"];

export async function checkInByQr(
  payload: CheckInByQrRequest
): Promise<CheckInByQrResponse> {
  return request<CheckInByQrResponse, CheckInByQrRequest>({
    method: "POST",
    path: "/reservations/check-in/qr",
    body: payload,
    auth: true
  });
}

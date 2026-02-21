import { request } from "../../../shared/api/http-client";
import type { paths } from "../../../shared/openapi/generated/schema";

export type CreateReservationRequest =
  paths["/reservations"]["post"]["requestBody"]["content"]["application/json"];
export type CreateReservationResponse =
  paths["/reservations"]["post"]["responses"][200]["content"]["application/json"];
export type MyReservationsResponse =
  paths["/reservations/me"]["get"]["responses"][200]["content"]["application/json"];
export type ReservationItem = MyReservationsResponse["items"][number];

export async function createReservation(
  payload: CreateReservationRequest
): Promise<CreateReservationResponse> {
  return request<CreateReservationResponse, CreateReservationRequest>({
    method: "POST",
    path: "/reservations",
    body: payload,
    auth: true
  });
}

export async function listMyReservations(): Promise<MyReservationsResponse> {
  return request<MyReservationsResponse>({
    method: "GET",
    path: "/reservations/me",
    auth: true
  });
}

export async function cancelReservation(reservationId: string): Promise<void> {
  await request<void>({
    method: "DELETE",
    path: `/reservations/${reservationId}`,
    auth: true
  });
}

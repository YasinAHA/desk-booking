import { request } from "../../../shared/api/http-client";
import type { paths } from "../../../shared/openapi/generated/schema";

export type DesksResponse =
  paths["/desks"]["get"]["responses"][200]["content"]["application/json"];

export async function getDesksByDate(date: string): Promise<DesksResponse> {
  return request<DesksResponse>({
    method: "GET",
    path: "/desks",
    auth: true,
    query: { date }
  });
}

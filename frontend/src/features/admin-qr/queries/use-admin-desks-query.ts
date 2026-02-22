import { useQuery } from "@tanstack/react-query";
import { listAdminDesks } from "../api/admin-qr-api";
import { adminQrQueryKeys } from "../model/admin-qr-query-keys";

export function useAdminDesksQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminQrQueryKeys.desks,
    queryFn: listAdminDesks,
    enabled
  });
}

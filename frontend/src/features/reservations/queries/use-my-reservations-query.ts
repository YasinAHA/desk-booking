import { useQuery } from "@tanstack/react-query";
import { listMyReservations } from "../api/reservations-api";
import { reservationsQueryKeys } from "../model/reservations-query-keys";

export function useMyReservationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: reservationsQueryKeys.my,
    queryFn: listMyReservations,
    enabled
  });
}

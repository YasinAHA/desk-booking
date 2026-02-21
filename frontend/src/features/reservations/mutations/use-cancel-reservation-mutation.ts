import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelReservation } from "../api/reservations-api";
import { reservationsQueryKeys } from "../model/reservations-query-keys";

export function useCancelReservationMutation(selectedDate: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) => cancelReservation(reservationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["desks", selectedDate] }),
        queryClient.invalidateQueries({ queryKey: reservationsQueryKeys.my })
      ]);
    }
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createReservation,
  type CreateReservationRequest
} from "../api/reservations-api";
import { reservationsQueryKeys } from "../model/reservations-query-keys";

export function useCreateReservationMutation(selectedDate: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReservationRequest) => createReservation(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["desks", selectedDate] }),
        queryClient.invalidateQueries({ queryKey: reservationsQueryKeys.my })
      ]);
    }
  });
}

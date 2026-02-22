import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  checkInByQr,
  type CheckInByQrRequest
} from "../api/qr-checkin-api";

export function useQrCheckInMutation(selectedDate: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInByQrRequest) => checkInByQr(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["desks", selectedDate] }),
        queryClient.invalidateQueries({ queryKey: ["reservations", "me"] })
      ]);
    }
  });
}

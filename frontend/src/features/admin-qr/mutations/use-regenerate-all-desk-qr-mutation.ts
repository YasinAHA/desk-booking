import { useMutation, useQueryClient } from "@tanstack/react-query";

import { regenerateAllDeskQr } from "../api/admin-qr-api";
import { adminQrQueryKeys } from "../model/admin-qr-query-keys";

export function useRegenerateAllDeskQrMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: regenerateAllDeskQr,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQrQueryKeys.desks });
    }
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { regenerateDeskQr } from "../api/admin-qr-api";
import { adminQrQueryKeys } from "../model/admin-qr-query-keys";

export function useRegenerateDeskQrMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deskId: string) => regenerateDeskQr(deskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQrQueryKeys.desks });
    }
  });
}

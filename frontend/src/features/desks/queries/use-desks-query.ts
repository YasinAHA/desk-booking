import { useQuery } from "@tanstack/react-query";
import { getDesksByDate } from "../api/desks-api";

export function useDesksQuery(date: string, enabled: boolean) {
  return useQuery({
    queryKey: ["desks", date],
    queryFn: () => getDesksByDate(date),
    enabled
  });
}

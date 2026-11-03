import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "./api";

export const dashboardQueryKeys = {
  data: (apiUrl: string) => ["dashboard-data", apiUrl] as const,
};

export function useDashboardData(apiUrl: string) {
  return useQuery({
    queryKey: dashboardQueryKeys.data(apiUrl),
    queryFn: ({ signal }) => getDashboardData(apiUrl, signal),
    retry: false,
  });
}

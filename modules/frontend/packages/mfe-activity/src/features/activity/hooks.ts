import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DomainEvent } from "@mfe/shared";
import { getEventHistory } from "./api";

export const activityQueryKeys = {
  history: (apiUrl: string) => ["activity-history", apiUrl] as const,
};

export function mergeActivityEvents(current: DomainEvent[], incoming: DomainEvent[]) {
  const merged = [...incoming, ...current];
  return merged
    .filter(
      (event, index, events) =>
        events.findIndex((item) => item.eventId === event.eventId) === index,
    )
    .slice(0, 30);
}

export function useActivityHistory(apiUrl: string) {
  const queryClient = useQueryClient();
  const queryKey = activityQueryKeys.history(apiUrl);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const history = await getEventHistory(apiUrl, 30, signal);
      const historyIds = new Set(history.map((event) => event.eventId));
      const liveEvents = (queryClient.getQueryData<DomainEvent[]>(queryKey) ?? []).filter(
        (event) => !historyIds.has(event.eventId),
      );
      return mergeActivityEvents(history, liveEvents);
    },
    retry: false,
  });
}

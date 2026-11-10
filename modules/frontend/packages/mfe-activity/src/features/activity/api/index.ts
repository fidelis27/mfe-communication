import { domainEventSchema, requestJson, type DomainEvent } from "@mfe/shared";
import { z } from "zod";

z.config({ jitless: true });

const eventHistorySchema = z.array(domainEventSchema);

export function getEventHistory(
  apiUrl: string,
  limit = 30,
  signal?: AbortSignal,
): Promise<DomainEvent[]> {
  return requestJson(
    `${apiUrl}/events/history?limit=${encodeURIComponent(limit)}`,
    eventHistorySchema,
    { signal },
    "Não foi possível carregar o histórico.",
  );
}

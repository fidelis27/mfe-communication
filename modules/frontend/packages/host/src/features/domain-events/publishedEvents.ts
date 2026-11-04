export type EventWithId = { eventId: string };

export function getUnpublishedEvents<TEvent extends EventWithId>(
  events: readonly TEvent[],
  publishedEventIds: Set<string>,
): TEvent[] {
  const unpublished: TEvent[] = [];

  for (const event of events) {
    if (publishedEventIds.has(event.eventId)) continue;
    publishedEventIds.add(event.eventId);
    unpublished.push(event);
  }

  return unpublished;
}

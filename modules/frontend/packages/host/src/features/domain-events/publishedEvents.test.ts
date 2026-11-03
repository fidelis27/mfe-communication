import { describe, expect, it } from "vitest";
import { getUnpublishedEvents } from "./publishedEvents";

describe("getUnpublishedEvents", () => {
  it("returns each new event once and records its id for future updates", () => {
    const publishedIds = new Set(["event-1"]);
    const event2 = { eventId: "event-2", type: "STUDENT_CREATED" };

    expect(
      getUnpublishedEvents(
        [{ eventId: "event-1", type: "STUDENT_CREATED" }, event2, event2],
        publishedIds,
      ),
    ).toEqual([event2]);
    expect(publishedIds).toEqual(new Set(["event-1", "event-2"]));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as auth from "./auth";
import { safeParseDomainEvent, type DomainEventType, useDomainEvents } from "./events";

describe("domain event validation", () => {
  it("accepts valid version 1 events and rejects malformed payloads", () => {
    const valid = safeParseDomainEvent({
      eventId: "evt-1",
      type: "STUDENT_CREATED",
      version: 1,
      source: "backend",
      correlationId: "corr-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        id: "student-1",
        name: "Ana",
        institutionId: "institution-1",
        status: "active",
      },
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.payload.id).toBe("student-1");
    }

    const invalidPayload = safeParseDomainEvent({
      eventId: "evt-2",
      type: "STUDENT_CREATED",
      version: 1,
      source: "backend",
      correlationId: "corr-2",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: { id: "student-2" },
    });

    expect(invalidPayload.success).toBe(false);
  });

  it("rejects unknown versions", () => {
    const unsupported = safeParseDomainEvent({
      eventId: "evt-3",
      type: "STUDENT_CREATED",
      version: 2,
      source: "backend",
      correlationId: "corr-3",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        id: "student-3",
        name: "Bia",
        institutionId: "institution-1",
        status: "active",
      },
    });

    expect(unsupported.success).toBe(false);
  });

  it("accepts backend event payloads and their institution scope", () => {
    const backendEvents: Array<{ type: DomainEventType; payload: unknown }> = [
      {
        type: "STUDENT_TRANSFERRED",
        payload: {
          studentId: "student-1",
          institutionId: "institution-2",
          sourceEnrollment: "enrollment-1",
          destinationEnrollment: "enrollment-2",
        },
      },
      {
        type: "ENROLLMENT_SUSPENDED",
        payload: {
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          reason: "Leave",
          date: "2026-01-01",
        },
      },
      {
        type: "ENROLLMENT_REOPENED",
        payload: { studentId: "student-1", enrollmentId: "enrollment-1" },
      },
      {
        type: "ENROLLMENT_CREATED",
        payload: {
          id: "enrollment-1",
          studentId: "student-1",
          institutionId: "institution-1",
          status: "active",
        },
      },
      {
        type: "USER_UPDATED",
        payload: {
          actorId: "user-1",
          targetId: "user-2",
          before: { name: "Ana", status: "active", superAdmin: false },
          after: { name: "Ana Silva", status: "active", superAdmin: false },
        },
      },
      {
        type: "GROUP_MEMBERSHIP_UPDATED",
        payload: {
          actorId: "user-1",
          targetId: "user-2",
          before: { role: "member" },
          after: { role: "admin" },
        },
      },
      {
        type: "GROUP_MEMBERSHIP_REMOVED",
        payload: {
          actorId: "user-1",
          targetId: "user-2",
          before: { role: "member" },
          after: null,
        },
      },
    ];

    for (const [index, event] of backendEvents.entries()) {
      const parsed = safeParseDomainEvent({
        eventId: `evt-${index}`,
        ...event,
        version: 1,
        source: "backend",
        correlationId: "corr-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
        institutionIds: ["institution-1"],
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.institutionIds).toEqual(["institution-1"]);
      }
    }
  });
});

describe("useDomainEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores malformed payloads and preserves deduplication", async () => {
    const socket = {
      close: vi.fn(),
      onclose: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onmessage: null as ((message: { data: string }) => void) | null,
      onopen: null as (() => void) | null,
    };

    vi.spyOn(auth, "authenticatedWebSocket").mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() => useDomainEvents("http://localhost:3333"));

    await waitFor(() => expect(auth.authenticatedWebSocket).toHaveBeenCalledTimes(1));
    socket.onopen?.();

    await waitFor(() => expect(result.current.connection).toBe("connected"));

    socket.onmessage?.({ data: "{" });
    expect(socket.close).not.toHaveBeenCalled();

    socket.onmessage?.({
      data: JSON.stringify({
        eventId: "evt-a",
        type: "STUDENT_CREATED",
        version: 1,
        source: "backend",
        correlationId: "corr-a",
        occurredAt: "2026-01-01T00:00:00.000Z",
        payload: {
          id: "student-a",
          name: "Ana",
          institutionId: "institution-1",
          status: "active",
        },
      }),
    });

    socket.onmessage?.({
      data: JSON.stringify({
        eventId: "evt-a",
        type: "STUDENT_CREATED",
        version: 1,
        source: "backend",
        correlationId: "corr-a",
        occurredAt: "2026-01-01T00:00:00.000Z",
        payload: {
          id: "student-a",
          name: "Ana",
          institutionId: "institution-1",
          status: "active",
        },
      }),
    });

    socket.onmessage?.({
      data: JSON.stringify({
        eventId: "evt-b",
        type: "STUDENT_CREATED",
        version: 1,
        source: "backend",
        correlationId: "corr-b",
        occurredAt: "2026-01-01T00:00:00.000Z",
        payload: { id: "student-b" },
      }),
    });

    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0].eventId).toBe("evt-a");
    expect(result.current.connection).toBe("connected");
  });

  it("closes a socket that resolves after the hook unmounts", async () => {
    let resolveSocket!: (socket: WebSocket) => void;
    const connection = new Promise<WebSocket>((resolve) => {
      resolveSocket = resolve;
    });
    const socket = {
      close: vi.fn(),
      onclose: null,
      onerror: null,
      onmessage: null,
      onopen: null,
    };
    vi.spyOn(auth, "authenticatedWebSocket").mockReturnValue(connection);

    const { unmount } = renderHook(() => useDomainEvents("http://localhost:3333"));
    await waitFor(() => expect(auth.authenticatedWebSocket).toHaveBeenCalledTimes(1));
    unmount();

    resolveSocket(socket as unknown as WebSocket);
    await waitFor(() => expect(socket.close).toHaveBeenCalledTimes(1));
  });
});

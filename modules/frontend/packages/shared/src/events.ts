import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { authenticatedWebSocket } from "./auth";
import { listen } from "./bus";
import { captureHostError } from "./sentry";

export const institutionEventTypes = [
  "INSTITUTION_CREATED",
  "INSTITUTION_UPDATED",
  "INSTITUTION_INACTIVATED",
] as const;
export const studentEventTypes = ["STUDENT_CREATED", "STUDENT_UPDATED"] as const;
export const enrollmentEventTypes = [
  "STUDENT_TRANSFERRED",
  "ENROLLMENT_SUSPENDED",
  "ENROLLMENT_REOPENED",
  "ENROLLMENT_CREATED",
] as const;
export const userEventTypes = ["USER_UPDATED"] as const;
export const groupEventTypes = ["GROUP_MEMBERSHIP_UPDATED", "GROUP_MEMBERSHIP_REMOVED"] as const;
export const domainEventTypes = [
  ...institutionEventTypes,
  ...studentEventTypes,
  ...enrollmentEventTypes,
  ...userEventTypes,
  ...groupEventTypes,
] as const;

export type InstitutionEventType = (typeof institutionEventTypes)[number];
export type StudentEventType = (typeof studentEventTypes)[number];
export type EnrollmentEventType = (typeof enrollmentEventTypes)[number];
export type UserEventType = (typeof userEventTypes)[number];
export type GroupEventType = (typeof groupEventTypes)[number];
export type DomainEventType = (typeof domainEventTypes)[number];

const institutionCreatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
});
const institutionUpdatedPayloadSchema = institutionCreatedPayloadSchema;
const institutionInactivatedPayloadSchema = z.object({ id: z.string() });
const studentCreatedPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  institutionId: z.string(),
  status: z.string(),
});
const studentUpdatedPayloadSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  status: z.string().optional(),
});
const studentTransferredPayloadSchema = z.object({
  studentId: z.string(),
  institutionId: z.string(),
  sourceEnrollment: z.string(),
  destinationEnrollment: z.string(),
});
const enrollmentSuspendedPayloadSchema = z.object({
  studentId: z.string(),
  enrollmentId: z.string(),
  reason: z.string(),
  date: z.string(),
});
const enrollmentReopenedPayloadSchema = z.object({
  studentId: z.string(),
  enrollmentId: z.string(),
});
const enrollmentCreatedPayloadSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  institutionId: z.string(),
  status: z.string(),
  suspensionReason: z.string().optional(),
  suspendedAt: z.string().optional(),
});
const userSnapshotSchema = z.object({
  name: z.string(),
  status: z.string(),
  superAdmin: z.boolean(),
});
const userUpdatedPayloadSchema = z.object({
  actorId: z.string(),
  targetId: z.string(),
  before: userSnapshotSchema,
  after: userSnapshotSchema,
});
const membershipSnapshotSchema = z.object({ role: z.enum(["admin", "member"]) });
const groupMembershipUpdatedPayloadSchema = z.object({
  actorId: z.string(),
  targetId: z.string(),
  before: membershipSnapshotSchema,
  after: membershipSnapshotSchema,
});
const groupMembershipRemovedPayloadSchema = z.object({
  actorId: z.string(),
  targetId: z.string(),
  before: membershipSnapshotSchema,
  after: z.null(),
});

export const eventPayloadSchemas = {
  INSTITUTION_CREATED: institutionCreatedPayloadSchema,
  INSTITUTION_UPDATED: institutionUpdatedPayloadSchema,
  INSTITUTION_INACTIVATED: institutionInactivatedPayloadSchema,
  STUDENT_CREATED: studentCreatedPayloadSchema,
  STUDENT_UPDATED: studentUpdatedPayloadSchema,
  STUDENT_TRANSFERRED: studentTransferredPayloadSchema,
  ENROLLMENT_SUSPENDED: enrollmentSuspendedPayloadSchema,
  ENROLLMENT_REOPENED: enrollmentReopenedPayloadSchema,
  ENROLLMENT_CREATED: enrollmentCreatedPayloadSchema,
  USER_UPDATED: userUpdatedPayloadSchema,
  GROUP_MEMBERSHIP_UPDATED: groupMembershipUpdatedPayloadSchema,
  GROUP_MEMBERSHIP_REMOVED: groupMembershipRemovedPayloadSchema,
} as const satisfies Record<DomainEventType, z.ZodTypeAny>;

export type EventPayloadMap = {
  [K in DomainEventType]: z.infer<(typeof eventPayloadSchemas)[K]>;
};

const domainEventEnvelopeSchema = z.object({
  eventId: z.string(),
  type: z.enum(domainEventTypes),
  version: z.number().int(),
  source: z.string(),
  correlationId: z.string(),
  occurredAt: z.string(),
  institutionIds: z.array(z.string()).optional(),
  payload: z.unknown(),
});

export const domainEventSchema = z.discriminatedUnion("type", [
  domainEventEnvelopeSchema.extend({
    type: z.literal("INSTITUTION_CREATED"),
    payload: eventPayloadSchemas.INSTITUTION_CREATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("INSTITUTION_UPDATED"),
    payload: eventPayloadSchemas.INSTITUTION_UPDATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("INSTITUTION_INACTIVATED"),
    payload: eventPayloadSchemas.INSTITUTION_INACTIVATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("STUDENT_CREATED"),
    payload: eventPayloadSchemas.STUDENT_CREATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("STUDENT_UPDATED"),
    payload: eventPayloadSchemas.STUDENT_UPDATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("STUDENT_TRANSFERRED"),
    payload: eventPayloadSchemas.STUDENT_TRANSFERRED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("ENROLLMENT_SUSPENDED"),
    payload: eventPayloadSchemas.ENROLLMENT_SUSPENDED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("ENROLLMENT_REOPENED"),
    payload: eventPayloadSchemas.ENROLLMENT_REOPENED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("ENROLLMENT_CREATED"),
    payload: eventPayloadSchemas.ENROLLMENT_CREATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("USER_UPDATED"),
    payload: eventPayloadSchemas.USER_UPDATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("GROUP_MEMBERSHIP_UPDATED"),
    payload: eventPayloadSchemas.GROUP_MEMBERSHIP_UPDATED,
  }),
  domainEventEnvelopeSchema.extend({
    type: z.literal("GROUP_MEMBERSHIP_REMOVED"),
    payload: eventPayloadSchemas.GROUP_MEMBERSHIP_REMOVED,
  }),
]);

type DomainEventEnvelope = Omit<z.infer<typeof domainEventEnvelopeSchema>, "type" | "payload">;
export type DomainEvent<TType extends DomainEventType = DomainEventType> = {
  [T in TType]: DomainEventEnvelope & { type: T; payload: EventPayloadMap[T] };
}[TType];

export type DomainConnection = "connecting" | "connected" | "offline";

export function safeParseDomainEvent(
  value: unknown,
): { success: true; data: DomainEvent } | { success: false; error: Error } {
  const parsed = domainEventSchema.safeParse(value);

  if (!parsed.success) {
    captureHostError(parsed.error, { moduleName: "shared/domain-events" });
    return { success: false, error: new Error("Invalid domain event envelope or payload") };
  }

  const data = parsed.data;
  if (data.version !== 1) {
    const error = new Error(`Unsupported domain event version: ${String(data.version)}`);
    captureHostError(error, { moduleName: "shared/domain-events" });
    return { success: false, error };
  }

  return { success: true, data };
}

export function isDomainEvent(value: unknown): value is DomainEvent {
  return safeParseDomainEvent(value).success;
}

export function useHostReady() {
  const [ready, setReady] = useState(
    typeof globalThis !== "undefined" &&
      (globalThis as typeof globalThis & { __mfeHostReady?: boolean }).__mfeHostReady === true,
  );

  useEffect(() => {
    const sync = () => {
      setReady(
        typeof globalThis !== "undefined" &&
          (globalThis as typeof globalThis & { __mfeHostReady?: boolean }).__mfeHostReady === true,
      );
    };

    sync();
    return listen("host", "host:ready", ({ ready: hostReady }) => {
      setReady(hostReady);
    });
  }, []);

  return ready;
}

export function useDomainEvents(apiUrl: string) {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [connection, setConnection] = useState<DomainConnection>(apiUrl ? "connecting" : "offline");

  useEffect(() => {
    const unsubscribeEvent = listen("domain", "domain:event", (event) => {
      setEvents((current: DomainEvent[]) =>
        current.some((item) => item.eventId === event.eventId) ? current : [event, ...current],
      );
    });
    const unsubscribeConnection = listen("domain", "domain:connection", (status) => {
      setConnection(status);
    });

    if (!apiUrl) {
      return () => {
        unsubscribeEvent();
        unsubscribeConnection();
      };
    }

    let stopped = false;
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    const socketUrl = `${apiUrl.replace(/^http/, "ws")}/events`;

    const connect = async () => {
      if (stopped) return;
      setConnection(retryAttempt === 0 ? "connecting" : "offline");

      let connectedSocket: WebSocket;
      try {
        connectedSocket = await authenticatedWebSocket(socketUrl);
      } catch {
        setConnection("offline");
        return;
      }

      if (stopped) {
        connectedSocket.close();
        return;
      }

      const activeSocket = connectedSocket;
      socket = activeSocket;
      activeSocket.onopen = () => {
        retryAttempt = 0;
        setConnection("connected");
      };
      activeSocket.onclose = () => {
        if (stopped) return;
        setConnection("offline");
        const delay = Math.min(1000 * 2 ** retryAttempt, 10000);
        retryAttempt += 1;
        retryTimer = window.setTimeout(() => {
          void connect();
        }, delay);
      };
      activeSocket.onerror = () => activeSocket.close();
      activeSocket.onmessage = (message) => {
        let event: unknown;
        try {
          event = JSON.parse(message.data) as unknown;
        } catch (error) {
          captureHostError(error, { moduleName: "shared/domain-events" });
          return;
        }

        const parsed = safeParseDomainEvent(event);
        if (!parsed.success) return;
        setEvents((current: DomainEvent[]) =>
          current.some((item) => item.eventId === parsed.data.eventId)
            ? current
            : [parsed.data, ...current],
        );
      };
    };

    void connect();
    return () => {
      stopped = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
      unsubscribeEvent();
      unsubscribeConnection();
    };
  }, [apiUrl]);

  return { events, connection };
}

export function useDomainEventSync(
  events: readonly DomainEvent[],
  handler: (event: DomainEvent) => void,
) {
  const handlerRef = useRef(handler);
  const lastProcessedEventId = useRef<string | undefined>();
  handlerRef.current = handler;

  useEffect(() => {
    for (const event of events) {
      if (event.eventId === lastProcessedEventId.current) break;
      handlerRef.current(event);
    }

    if (events.length) lastProcessedEventId.current = events[0].eventId;
  }, [events]);
}

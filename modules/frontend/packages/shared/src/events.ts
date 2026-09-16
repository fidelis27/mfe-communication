import { useEffect, useState } from "react";

export type InstitutionEventType =
  "INSTITUTION_CREATED" | "INSTITUTION_UPDATED" | "INSTITUTION_INACTIVATED";
export type StudentEventType = "STUDENT_CREATED" | "STUDENT_UPDATED";
export type EnrollmentEventType =
  "STUDENT_TRANSFERRED" | "ENROLLMENT_SUSPENDED" | "ENROLLMENT_REOPENED";
export type DomainEventType = InstitutionEventType | StudentEventType | EnrollmentEventType;

export type EventPayloadMap = {
  INSTITUTION_CREATED: { id: string; name?: string };
  INSTITUTION_UPDATED: { id: string; name?: string };
  INSTITUTION_INACTIVATED: { id: string };
  STUDENT_CREATED: { id: string; name: string; institutionId: string; status: string };
  STUDENT_UPDATED: { id: string; institutionId: string; status?: string };
  STUDENT_TRANSFERRED: {
    studentId: string;
    institutionId: string;
    sourceEnrollment: string;
    destinationEnrollment: string;
  };
  ENROLLMENT_SUSPENDED: {
    studentId: string;
    enrollmentId: string;
    institutionId: string;
    reason: string;
    date: string;
  };
  ENROLLMENT_REOPENED: { studentId: string; enrollmentId: string; institutionId: string };
};

export type DomainEvent<TType extends DomainEventType = DomainEventType> = {
  eventId: string;
  type: TType;
  version: number;
  source: string;
  correlationId: string;
  occurredAt: string;
  payload: EventPayloadMap[TType];
};

export type DomainConnection = "connecting" | "connected" | "offline";

function isDomainEvent(value: unknown): value is DomainEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<DomainEvent>;
  return (
    typeof event.eventId === "string" &&
    typeof event.type === "string" &&
    typeof event.version === "number" &&
    typeof event.source === "string" &&
    typeof event.correlationId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload === "object" &&
    event.payload !== null
  );
}

export function useDomainEvents(apiUrl: string, demoUser: string) {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [connection, setConnection] = useState<DomainConnection>("connecting");

  useEffect(() => {
    let stopped = false;
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    const socketUrl = `${apiUrl.replace(/^http/, "ws")}/events?demoUser=${encodeURIComponent(demoUser)}`;

    const connect = () => {
      if (stopped) return;
      setConnection(retryAttempt === 0 ? "connecting" : "offline");
      socket = new WebSocket(socketUrl);
      socket.onopen = () => {
        retryAttempt = 0;
        setConnection("connected");
      };
      socket.onclose = () => {
        if (stopped) return;
        setConnection("offline");
        const delay = Math.min(1000 * 2 ** retryAttempt, 10000);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close();
      socket.onmessage = (message) => {
        try {
          const event: unknown = JSON.parse(message.data);
          if (!isDomainEvent(event) || event.version !== 1) return;
          setEvents((current) =>
            current.some((item) => item.eventId === event.eventId) ? current : [event, ...current],
          );
        } catch {
          socket?.close();
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [apiUrl, demoUser]);

  return { events, connection };
}

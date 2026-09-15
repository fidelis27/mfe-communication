import { useEffect, useState } from "react";
import "./App.css";

type DomainEvent = {
  eventId: string;
  type: string;
  version: number;
  source: string;
  correlationId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";
const socketUrl = `${apiUrl.replace(/^http/, "ws")}/events?demoUser=${encodeURIComponent(demoUser)}`;

const labels: Record<string, string> = {
  STUDENT_CREATED: "Estudante cadastrado",
  STUDENT_TRANSFERRED: "Estudante transferido",
  ENROLLMENT_SUSPENDED: "Vínculo trancado",
  ENROLLMENT_REOPENED: "Vínculo reaberto",
};

export default function App() {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">(
    "connecting",
  );

  useEffect(() => {
    fetch(`${apiUrl}/events/history?limit=30`, { headers: { "x-demo-user": demoUser } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o histórico.");
        return (await response.json()) as DomainEvent[];
      })
      .then((history) => setEvents(history))
      .catch(() => setConnection("offline"));

    let stopped = false;
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;

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
          const event = JSON.parse(message.data) as DomainEvent;
          setEvents((current) =>
            current.some((item) => item.eventId === event.eventId)
              ? current
              : [event, ...current].slice(0, 30),
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
  }, []);

  return (
    <main className="activity-shell">
      <section className="activity-hero">
        <div>
          <p className="eyebrow">Secretaria escolar · tempo real</p>
          <h1>Atividade do sistema.</h1>
          <p className="lede">Uma linha do tempo viva das alterações que chegam do backend.</p>
        </div>
        <div className={`connection ${connection}`}>
          <i />{" "}
          {connection === "connected"
            ? "Conectado"
            : connection === "connecting"
              ? "Conectando"
              : "Offline"}
        </div>
      </section>
      <section className="activity-feed" aria-live="polite">
        <header>
          <span>Eventos recentes</span>
          <strong>{events.length.toString().padStart(2, "0")}</strong>
        </header>
        {events.length === 0 ? (
          <div className="empty">
            <span>--</span>
            <p>
              {connection === "connected"
                ? "Aguardando uma alteração no sistema."
                : "Não foi possível conectar ao canal de eventos."}
            </p>
          </div>
        ) : (
          events.map((event) => (
            <article className="event-row" key={event.eventId}>
              <div className="event-pin" />
              <div className="event-content">
                <h2>{labels[event.type] ?? event.type}</h2>
                <p>
                  {event.source} · versão {event.version}
                </p>
                <small>
                  {new Date(event.occurredAt).toLocaleString("pt-BR")} · {event.correlationId}
                </small>
              </div>
              <span className="event-type">{event.type}</span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

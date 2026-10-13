import { useEffect, useState } from "react";
import { authenticatedFetch, useDomainEvents, useHostReady, useListen } from "@mfe/shared";
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

const labels: Record<string, string> = {
  STUDENT_CREATED: "Estudante cadastrado",
  STUDENT_TRANSFERRED: "Estudante transferido",
  ENROLLMENT_SUSPENDED: "Vínculo trancado",
  ENROLLMENT_REOPENED: "Vínculo reaberto",
};

export default function App() {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "success" | "empty" | "error">(
    "loading",
  );
  const [historyError, setHistoryError] = useState("");
  const hostReady = useHostReady();
  const fallback = useDomainEvents(hostReady ? "" : apiUrl);
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">(
    "connecting",
  );

  useListen("domain", "domain:connection", (status) => {
    if (status === "connecting" || status === "connected" || status === "offline") {
      setConnection(status);
    }
  });

  function appendEvent(type: string, payload: Record<string, unknown>): void {
    const nextEvent: DomainEvent = {
      eventId: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      version: 1,
      source: "host-bus",
      correlationId: "local-bus",
      occurredAt: new Date().toISOString(),
      payload,
    };
    setEvents((current) => mergeEvent(current, nextEvent));
    setHistoryState("success");
  }

  useListen("domain", "STUDENT_CREATED", (payload) => {
    appendEvent("STUDENT_CREATED", payload as Record<string, unknown>);
  });

  useListen("domain", "STUDENT_TRANSFERRED", (payload) => {
    appendEvent("STUDENT_TRANSFERRED", payload as Record<string, unknown>);
  });

  useListen("domain", "ENROLLMENT_SUSPENDED", (payload) => {
    appendEvent("ENROLLMENT_SUSPENDED", payload as Record<string, unknown>);
  });

  useListen("domain", "ENROLLMENT_REOPENED", (payload) => {
    appendEvent("ENROLLMENT_REOPENED", payload as Record<string, unknown>);
  });

  function mergeEvent(current: DomainEvent[], source: DomainEvent): DomainEvent[] {
    const next = [source, ...current];
    return next
      .filter(
        (event, index, array) =>
          index === array.findIndex((candidate) => candidate.eventId === event.eventId),
      )
      .slice(0, 30);
  }

  async function loadHistory() {
    setHistoryState("loading");
    setHistoryError("");
    try {
      const response = await authenticatedFetch(`${apiUrl}/events/history?limit=30`);
      if (!response.ok) throw new Error("Não foi possível carregar o histórico.");
      const history = (await response.json()) as DomainEvent[];
      setEvents(history);
      setHistoryState(history.length ? "success" : "empty");
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Erro inesperado.");
      setHistoryState("error");
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!hostReady && fallback.events.length === 0) return;
    if (hostReady) return;
    setEvents((current) => {
      const next = [...fallback.events, ...current];
      return next
        .filter(
          (event, index, array) =>
            index === array.findIndex((candidate) => candidate.eventId === event.eventId),
        )
        .slice(0, 30);
    });
    setConnection(fallback.connection);
    setHistoryState("success");
  }, [fallback.connection, fallback.events, hostReady]);

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
      <section className="activity-feed" aria-live="polite" aria-busy={historyState === "loading"}>
        <header>
          <span>Eventos recentes</span>
          <strong>{events.length.toString().padStart(2, "0")}</strong>
        </header>
        {historyState === "loading" ? (
          <div className="empty">
            <span>...</span>
            <p>Carregando histórico de atividade...</p>
          </div>
        ) : historyState === "error" ? (
          <div className="empty error-state">
            <span>!</span>
            <p>{historyError}</p>
            <button type="button" onClick={() => void loadHistory()}>
              Tentar novamente
            </button>
          </div>
        ) : historyState === "empty" ? (
          <div className="empty">
            <span>--</span>
            <p>Aguardando uma alteração no sistema.</p>
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

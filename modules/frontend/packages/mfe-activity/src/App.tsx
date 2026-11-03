import { type DomainEvent, useDomainEventSync, useDomainEvents, useHostReady } from "@mfe/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  activityQueryKeys,
  mergeActivityEvents,
  useActivityHistory,
} from "./features/activity/hooks";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

const labels: Record<string, string> = {
  STUDENT_CREATED: "Estudante cadastrado",
  STUDENT_TRANSFERRED: "Estudante transferido",
  ENROLLMENT_SUSPENDED: "Vínculo trancado",
  ENROLLMENT_REOPENED: "Vínculo reaberto",
};

export default function App() {
  const hostReady = useHostReady();
  const fallback = useDomainEvents(hostReady ? "" : apiUrl);
  const queryClient = useQueryClient();
  const historyQuery = useActivityHistory(apiUrl);
  const events = historyQuery.data ?? [];
  const historyState = historyQuery.isFetching
    ? "loading"
    : historyQuery.isError
      ? "error"
      : events.length
        ? "success"
        : "empty";

  useDomainEventSync(fallback.events, (event) => {
    if (!labels[event.type]) return;
    const queryKey = activityQueryKeys.history(apiUrl);
    queryClient.setQueryData<DomainEvent[]>(queryKey, (current = []) =>
      mergeActivityEvents(current, [event]),
    );
  });

  return (
    <main className="activity-shell">
      <section className="activity-hero">
        <div>
          <p className="eyebrow">Secretaria escolar · tempo real</p>
          <h1>Atividade do sistema.</h1>
          <p className="lede">Uma linha do tempo viva das alterações que chegam do backend.</p>
        </div>
        <div className={`connection ${fallback.connection}`}>
          <i />{" "}
          {fallback.connection === "connected"
            ? "Conectado"
            : fallback.connection === "connecting"
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
            <p>
              {historyQuery.error instanceof Error
                ? historyQuery.error.message
                : "Erro inesperado."}
            </p>
            <button type="button" onClick={() => void historyQuery.refetch()}>
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

import { useEffect, useRef } from "react";
import { useDomainEventSync, useDomainEvents, useHostReady } from "@mfe/shared";
import { useQueryClient } from "@tanstack/react-query";
import { type DashboardData } from "./features/dashboard/api";
import { dashboardQueryKeys, useDashboardData } from "./features/dashboard/hooks";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export default function App() {
  const emptyData: DashboardData = {
    institutions: [],
    students: [],
    enrollments: [],
  };
  const hostReady = useHostReady();
  const fallback = useDomainEvents(hostReady ? "" : apiUrl);
  const queryClient = useQueryClient();
  const dashboardQuery = useDashboardData(apiUrl);
  const data = dashboardQuery.data ?? emptyData;
  const state = dashboardQuery.isFetching
    ? "loading"
    : dashboardQuery.isError
      ? "error"
      : "success";
  const refreshTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (refreshTimer.current !== undefined) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  useDomainEventSync(fallback.events, (event) => {
    if (
      event.type !== "STUDENT_CREATED" &&
      event.type !== "STUDENT_UPDATED" &&
      event.type !== "INSTITUTION_CREATED" &&
      event.type !== "INSTITUTION_UPDATED" &&
      event.type !== "INSTITUTION_INACTIVATED" &&
      event.type !== "STUDENT_TRANSFERRED" &&
      event.type !== "ENROLLMENT_SUSPENDED" &&
      event.type !== "ENROLLMENT_REOPENED" &&
      event.type !== "ENROLLMENT_CREATED"
    ) {
      return;
    }

    if (refreshTimer.current !== undefined) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.data(apiUrl) });
      refreshTimer.current = undefined;
    }, 100);
  });

  const activeEnrollments = data.enrollments.filter(
    (enrollment) => enrollment.status === "active",
  ).length;
  const suspendedEnrollments = data.enrollments.filter(
    (enrollment) => enrollment.status === "suspended",
  ).length;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">Secretaria escolar · visão geral</p>
          <h1>O pulso da operação.</h1>
          <p className="lede">
            Indicadores atualizados a partir dos dados autorizados da secretaria.
          </p>
        </div>
        <span className={`sync ${state}`}>
          <i />{" "}
          {state === "success"
            ? `${fallback.connection === "connected" ? "Tempo real" : "Reconectando"} · atualizado ${new Date(dashboardQuery.dataUpdatedAt).toLocaleTimeString("pt-BR")}`
            : state === "loading"
              ? "Carregando"
              : "Falha ao atualizar"}
        </span>
      </section>
      <section className="metrics" aria-live="polite" aria-busy={dashboardQuery.isFetching}>
        <article className="metric metric-large">
          <span>Instituições ativas</span>
          <strong>
            {data.institutions.filter((institution) => institution.status === "active").length}
          </strong>
          <small>escopo atual</small>
        </article>
        <article className="metric">
          <span>Estudantes</span>
          <strong>{data.students.length}</strong>
          <small>cadastros visíveis</small>
        </article>
        <article className="metric">
          <span>Vínculos ativos</span>
          <strong>{activeEnrollments}</strong>
          <small>em andamento</small>
        </article>
        <article className="metric metric-accent">
          <span>Trancados</span>
          <strong>{suspendedEnrollments}</strong>
          <small>pedem atenção</small>
        </article>
      </section>
      <section className="dashboard-note">
        <div className="note-mark">↗</div>
        <div>
          {state === "loading" && <p>Carregando indicadores autorizados...</p>}
          {dashboardQuery.isError && (
            <>
              <h2>Não foi possível atualizar</h2>
              <p>
                {dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : "Erro inesperado."}
              </p>
              <button type="button" onClick={() => void dashboardQuery.refetch()}>
                Tentar novamente
              </button>
            </>
          )}
          {state === "success" && (
            <>
              <h2>Dados em movimento</h2>
              <p>
                Este painel reage às alterações emitidas pelo backend e respeita o escopo do usuário
                conectado.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

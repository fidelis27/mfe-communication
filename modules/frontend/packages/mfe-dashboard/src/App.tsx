import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch, initializeAuth, useDomainEvents } from "@mfe/shared";
import "./App.css";

type Institution = { id: string; status: string };
type Student = { id: string; status: string };
type Enrollment = { id: string; status: string };
type DashboardData = {
  institutions: Institution[];
  students: Student[];
  enrollments: Enrollment[];
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL ?? "";
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM ?? "";
const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "";

export default function App() {
  const [data, setData] = useState<DashboardData>({
    institutions: [],
    students: [],
    enrollments: [],
  });
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const { connection } = useDomainEvents(apiUrl);

  useEffect(() => {
    if (!keycloakUrl || !keycloakRealm || !keycloakClientId) return;
    void initializeAuth({
      url: keycloakUrl,
      realm: keycloakRealm,
      clientId: keycloakClientId,
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    setErrorMessage("");
    try {
      const [institutions, students, enrollments] = await Promise.all([
        authenticatedFetch(`${apiUrl}/institutions`),
        authenticatedFetch(`${apiUrl}/students`),
        authenticatedFetch(`${apiUrl}/enrollments`),
      ]);
      if (![institutions, students, enrollments].every((response) => response.ok))
        throw new Error("Não foi possível atualizar os indicadores.");
      setData({
        institutions: await institutions.json(),
        students: await students.json(),
        enrollments: await enrollments.json(),
      });
      setUpdatedAt(new Date());
      setState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
            ? `${connection === "connected" ? "Tempo real" : "Reconectando"} · atualizado ${updatedAt?.toLocaleTimeString("pt-BR")}`
            : state === "loading"
              ? "Carregando"
              : "Falha ao atualizar"}
        </span>
      </section>
      <section className="metrics" aria-live="polite" aria-busy={state === "loading"}>
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
          {state === "error" && (
            <>
              <h2>Não foi possível atualizar</h2>
              <p>{errorMessage}</p>
              <button type="button" onClick={() => void load()}>
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

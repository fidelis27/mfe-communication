import { useCallback, useEffect, useState } from "react";
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
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";
const socketUrl = `${apiUrl.replace(/^http/, "ws")}/events?demoUser=${encodeURIComponent(demoUser)}`;

export default function App() {
  const [data, setData] = useState<DashboardData>({
    institutions: [],
    students: [],
    enrollments: [],
  });
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">(
    "connecting",
  );

  const load = useCallback(async () => {
    try {
      const headers = { "x-demo-user": demoUser };
      const [institutions, students, enrollments] = await Promise.all([
        fetch(`${apiUrl}/institutions`, { headers }),
        fetch(`${apiUrl}/students`, { headers }),
        fetch(`${apiUrl}/enrollments`, { headers }),
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
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
    let stopped = false;
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    const connect = () => {
      if (stopped) return;
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
      socket.onmessage = () => void load();
    };
    connect();
    return () => {
      stopped = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
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
      <section className="metrics" aria-live="polite">
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
          <h2>Dados em movimento</h2>
          <p>
            Este painel reage às alterações emitidas pelo backend e respeita o escopo do usuário
            conectado.
          </p>
        </div>
      </section>
    </main>
  );
}

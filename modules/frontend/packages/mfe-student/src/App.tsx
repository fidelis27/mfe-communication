import { FormEvent, useCallback, useEffect, useState } from "react";
import { useDomainEvents } from "@mfe/shared";
import "./App.css";

type Student = {
  id: string;
  name: string;
  institutionId: string;
  status: string;
};

type Institution = {
  id: string;
  name: string;
  cnpj?: string | null;
  status?: string;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const { events, connection } = useDomainEvents(apiUrl, demoUser);

  const loadInstitutions = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/institutions`, {
        headers: { "x-demo-user": demoUser },
      });
      if (!response.ok) {
        throw new Error("Não foi possível carregar as instituições.");
      }
      const result = (await response.json()) as Institution[];
      setInstitutions(result);
      if (result.length > 0) {
        setInstitutionId((current) => current || result[0].id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar instituições.");
      setState("error");
    }
  }, []);

  const loadStudents = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/students`, {
        headers: { "x-demo-user": demoUser },
        signal,
      });
      if (!response.ok) throw new Error("Não foi possível carregar os estudantes.");
      const result = (await response.json()) as Student[];
      setStudents(result);
      setState(result.length === 0 ? "empty" : "success");
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadInstitutions();
    void loadStudents(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadInstitutions, loadStudents]);

  useEffect(() => {
    const event = events.find((item) => item.type === "STUDENT_CREATED");
    if (!event) return;
    const student = event.payload as unknown as Student;
    setStudents((current) =>
      current.some((item) => item.id === student.id) ? current : [student, ...current],
    );
    setState("success");
  }, [events]);

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!institutionId) {
      setMessage("Selecione uma instituição antes de cadastrar.");
      setState("error");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user": demoUser },
        body: JSON.stringify({ name, institutionId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível cadastrar o estudante.");
      }
      setName("");
      if (institutions.length > 0) {
        setInstitutionId(institutions[0].id);
      }
      setMessage("Estudante cadastrado.");
      setState("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  return (
    <main className="student-shell">
      <section className="student-hero">
        <p className="eyebrow">Secretaria escolar · estudantes</p>
        <h1>Vínculos que acompanham cada trajetória.</h1>
        <p className="lede">
          Cadastre estudantes e acompanhe as alterações persistidas em tempo real.
        </p>
        <span className="connection">
          <i />{" "}
          {connection === "connected"
            ? "Eventos conectados"
            : connection === "connecting"
              ? "Conectando eventos"
              : "Eventos offline"}{" "}
          · {apiUrl}
        </span>
      </section>

      <section className="student-grid">
        <form className="student-form" onSubmit={createStudent}>
          <div className="section-heading">
            <span className="section-number">01</span>
            <h2>Novo estudante</h2>
          </div>
          <label htmlFor="student-name">
            Nome completo
            <input
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Souza"
              required
            />
          </label>
          <label htmlFor="student-institution">
            Instituição
            <select
              id="student-institution"
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
              required
              disabled={institutions.length === 0}
            >
              {institutions.length === 0 ? (
                <option value="">Carregando instituições...</option>
              ) : (
                institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="submit">
            Cadastrar estudante <span>→</span>
          </button>
          {message && <p className={`form-message ${state}`}>{message}</p>}
        </form>

        <section className="student-list" aria-live="polite" aria-busy={state === "loading"}>
          <div className="section-heading">
            <span className="section-number">02</span>
            <h2>Estudantes recentes</h2>
            <strong>{students.length.toString().padStart(2, "0")}</strong>
          </div>
          {state === "loading" && <p className="empty-state">Carregando estudantes...</p>}
          {state === "error" && (
            <div className="empty-state error-state">
              <p>{message}</p>
              <button type="button" onClick={() => void loadStudents()}>
                Tentar novamente
              </button>
            </div>
          )}
          {state === "empty" && <p className="empty-state">Nenhum estudante cadastrado ainda.</p>}
          {students.map((student) => (
            <article className="student-row" key={student.id}>
              <div className="avatar">{student.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <h3>{student.name}</h3>
                <p>{student.institutionId}</p>
              </div>
              <span className="status">{student.status}</span>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

import { FormEvent, useEffect, useState } from "react";
import "./App.css";

type Student = {
  id: string;
  name: string;
  institutionId: string;
  status: string;
};

type DomainEvent = {
  type: string;
  payload: Student;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";
const websocketUrl = `${apiUrl.replace(/^http/, "ws")}/events?demoUser=${encodeURIComponent(demoUser)}`;

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("transfer-origin");
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/students`, { headers: { "x-demo-user": demoUser } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os estudantes.");
        return response.json() as Promise<Student[]>;
      })
      .then((result) => {
        if (!active) return;
        setStudents(result);
        setState(result.length === 0 ? "empty" : "success");
      })
      .catch((error: Error) => {
        if (!active) return;
        setMessage(error.message);
        setState("error");
      });

    const socket = new WebSocket(websocketUrl);
    socket.onmessage = (event) => {
      const domainEvent = JSON.parse(event.data) as DomainEvent;
      if (domainEvent.type !== "STUDENT_CREATED") return;
      setStudents((current) =>
        current.some((student) => student.id === domainEvent.payload.id)
          ? current
          : [domainEvent.payload, ...current],
      );
      setState("success");
    };

    return () => {
      active = false;
      socket.close();
    };
  }, []);

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
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
          <i /> API conectada em {apiUrl}
        </span>
      </section>

      <section className="student-grid">
        <form className="student-form" onSubmit={createStudent}>
          <div className="section-heading">
            <span className="section-number">01</span>
            <h2>Novo estudante</h2>
          </div>
          <label>
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Souza"
              required
            />
          </label>
          <label>
            Instituição
            <input
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
              required
            />
          </label>
          <button type="submit">
            Cadastrar estudante <span>→</span>
          </button>
          {message && <p className={`form-message ${state}`}>{message}</p>}
        </form>

        <section className="student-list" aria-live="polite">
          <div className="section-heading">
            <span className="section-number">02</span>
            <h2>Estudantes recentes</h2>
            <strong>{students.length.toString().padStart(2, "0")}</strong>
          </div>
          {state === "loading" && <p className="empty-state">Carregando estudantes...</p>}
          {state === "error" && <p className="empty-state error-state">{message}</p>}
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

import { FormEvent, useEffect, useState } from "react";
import "./App.css";

type User = { id: string; name: string; email: string; status: string; superAdmin: boolean };
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      const response = await fetch(`${apiUrl}/users`, { headers: { "x-demo-user": demoUser } });
      if (!response.ok) throw new Error("Não foi possível carregar as pessoas.");
      const result = (await response.json()) as User[];
      setUsers(result);
      setState(result.length ? "success" : "empty");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user": demoUser },
        body: JSON.stringify({ name, email, superAdmin }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível cadastrar a pessoa.");
      }
      setName("");
      setEmail("");
      setSuperAdmin(false);
      setMessage("Pessoa cadastrada.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Secretaria escolar · acesso</p>
          <h1>Pessoas e permissões.</h1>
          <p className="lede">Mantenha o mapa de acesso da secretaria claro, ativo e auditável.</p>
        </div>
        <span className="scope-chip">Escopo: {demoUser}</span>
      </section>
      <section className="admin-grid">
        <form className="admin-form" onSubmit={createUser}>
          <div className="section-heading">
            <span>01</span>
            <h2>Nova pessoa</h2>
          </div>
          <label htmlFor="admin-name">
            Nome
            <input
              id="admin-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Souza"
              required
            />
          </label>
          <label htmlFor="admin-email">
            E-mail
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ana@instituicao.edu.br"
              required
            />
          </label>
          <label className="check" htmlFor="admin-super-admin">
            <input
              id="admin-super-admin"
              type="checkbox"
              checked={superAdmin}
              onChange={(event) => setSuperAdmin(event.target.checked)}
            />{" "}
            Superadministrador
          </label>
          <button type="submit">
            Adicionar pessoa <b>→</b>
          </button>
          {message && (
            <p
              className={state === "error" ? "message error" : "message"}
              role={state === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>
        <section className="user-list" aria-live="polite">
          <div className="section-heading">
            <span>02</span>
            <h2>Pessoas cadastradas</h2>
            <strong>{users.length.toString().padStart(2, "0")}</strong>
          </div>
          {state === "loading" && <p className="empty">Carregando pessoas...</p>}
          {state === "error" && <p className="empty error">{message}</p>}
          {state === "empty" && <p className="empty">Nenhuma pessoa cadastrada.</p>}
          {users.map((user) => (
            <article className="user-row" key={user.id}>
              <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
              <span className={user.superAdmin ? "role elevated" : "role"}>
                {user.superAdmin ? "superadmin" : "membro"}
              </span>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

import { FormEvent, useEffect, useState } from "react";
import "./App.css";

type User = { id: string; name: string; email: string; status: string; superAdmin: boolean };
type Group = { id: string; institutionId: string };
type Membership = {
  userId: string;
  groupId: string;
  institutionId: string;
  role: "admin" | "member";
};
type Institution = { id: string; name: string; cnpj?: string | null; status?: string };
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";
const canGrantSuperAdmin = import.meta.env.VITE_DEMO_SUPER_ADMIN === "true";

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupInstitutionId, setGroupInstitutionId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<Membership["role"]>("member");
  const [groupState, setGroupState] = useState<"loading" | "empty" | "success" | "error">(
    "loading",
  );
  const [groupMessage, setGroupMessage] = useState("");

  async function loadUsers() {
    try {
      const response = await fetch(`${apiUrl}/users`, { headers: { "x-demo-user": demoUser } });
      if (!response.ok) throw new Error("Não foi possível carregar as pessoas.");
      const result = (await response.json()) as User[];
      setUsers(result);
      setMemberUserId((current) => current || result[0]?.id || "");
      setState(result.length ? "success" : "empty");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  async function loadInstitutions() {
    try {
      const response = await fetch(`${apiUrl}/institutions`, {
        headers: { "x-demo-user": demoUser },
      });
      if (!response.ok) throw new Error("Não foi possível carregar as instituições.");
      const result = (await response.json()) as Institution[];
      setInstitutions(result);
      setGroupInstitutionId((current) => current || result[0]?.id || "");
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupState("error");
    }
  }

  async function loadGroups() {
    try {
      const response = await fetch(`${apiUrl}/groups`, { headers: { "x-demo-user": demoUser } });
      if (!response.ok) throw new Error("Não foi possível carregar os grupos.");
      const result = (await response.json()) as Group[];
      setGroups(result);
      setSelectedGroupId((current) => current || result[0]?.id || "");
      setGroupState(result.length ? "success" : "empty");
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupState("error");
    }
  }

  async function loadMemberships(groupId: string) {
    if (!groupId) {
      setMemberships([]);
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/groups/${groupId}/members`, {
        headers: { "x-demo-user": demoUser },
      });
      if (!response.ok) throw new Error("Não foi possível carregar os membros.");
      setMemberships((await response.json()) as Membership[]);
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupState("error");
    }
  }

  useEffect(() => {
    void loadUsers();
    void loadInstitutions();
    void loadGroups();
  }, []);

  useEffect(() => {
    void loadMemberships(selectedGroupId);
  }, [selectedGroupId]);

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

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupMessage("");
    try {
      const response = await fetch(`${apiUrl}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user": demoUser },
        body: JSON.stringify({ institutionId: groupInstitutionId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível criar o grupo.");
      }
      const created = (await response.json()) as Group;
      setGroupInstitutionId((current) => current || institutions[0]?.id || "");
      setSelectedGroupId(created.id);
      setGroupMessage("Grupo criado.");
      await loadGroups();
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupState("error");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId) return;
    setGroupMessage("");
    try {
      const response = await fetch(`${apiUrl}/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user": demoUser },
        body: JSON.stringify({ userId: memberUserId, role: memberRole }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível adicionar o membro.");
      }
      setMemberUserId(users[0]?.id ?? "");
      setGroupMessage("Membro adicionado.");
      await loadMemberships(selectedGroupId);
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupState("error");
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
          {canGrantSuperAdmin && (
            <label className="check" htmlFor="admin-super-admin">
              <input
                id="admin-super-admin"
                type="checkbox"
                checked={superAdmin}
                onChange={(event) => setSuperAdmin(event.target.checked)}
              />{" "}
              Superadministrador
            </label>
          )}
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
        <section className="user-list" aria-live="polite" aria-busy={state === "loading"}>
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
      <section className="groups-panel">
        <div className="section-heading">
          <span>03</span>
          <h2>Grupos e acessos</h2>
          <strong>{groups.length.toString().padStart(2, "0")}</strong>
        </div>
        <div className="groups-grid">
          <form className="group-form" onSubmit={createGroup}>
            <label htmlFor="group-institution">
              Nova instituição
              <select
                id="group-institution"
                value={groupInstitutionId}
                onChange={(event) => setGroupInstitutionId(event.target.value)}
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
            <button type="submit" disabled={institutions.length === 0}>
              Criar grupo <b>→</b>
            </button>
          </form>
          <div className="group-browser">
            <label htmlFor="group-select">
              Grupo da instituição
              <select
                id="group-select"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={!groups.length}
              >
                {!groups.length && <option value="">Nenhum grupo</option>}
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    Grupo de {institutions.find((institution) => institution.id === group.institutionId)?.name ??
                      "instituição não identificada"}
                  </option>
                ))}
              </select>
            </label>
            {groupState === "loading" && <p className="empty">Carregando grupos...</p>}
            {groupState === "empty" && <p className="empty">Nenhum grupo cadastrado.</p>}
            {groupState === "error" && <p className="empty error">{groupMessage}</p>}
            {selectedGroupId && (
              <>
                <p className="member-caption">Pessoa do grupo e nível de acesso</p>
                <form className="member-form" onSubmit={addMember}>
                  <select
                    aria-label="Pessoa do grupo"
                    value={memberUserId}
                    onChange={(event) => setMemberUserId(event.target.value)}
                    required
                    disabled={!users.length}
                  >
                    {!users.length && <option value="">Nenhuma pessoa</option>}
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.id})
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Papel"
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value as Membership["role"])}
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <button type="submit" aria-label="Adicionar membro" disabled={!users.length}>
                    +
                  </button>
                </form>
                {memberships.map((membership) => {
                  const member = users.find((user) => user.id === membership.userId);
                  return (
                    <article
                      className="member-row"
                      key={`${membership.userId}-${membership.groupId}`}
                    >
                      <span>{member?.name ?? membership.userId}</span>
                      <span className={membership.role === "admin" ? "role elevated" : "role"}>
                        {membership.role}
                      </span>
                    </article>
                  );
                })}
              </>
            )}
          </div>
        </div>
        {groupMessage && groupState !== "error" && (
          <p className="message" role="status">
            {groupMessage}
          </p>
        )}
      </section>
    </main>
  );
}

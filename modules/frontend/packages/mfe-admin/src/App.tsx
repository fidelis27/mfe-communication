import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminUser,
  authenticatedFetch,
  type AuthIdentity,
  type GroupCandidate,
  type GroupMembership,
  type GroupSummary,
  type InstitutionSummary,
  type MembershipRole,
  readAuthIdentity,
} from "@mfe/shared";
import "./App.css";

type ListState = "loading" | "ready" | "empty" | "error";
type AdminTab = "people" | "groups";
type Notice = {
  id: number;
  kind: "success" | "error";
  message: string;
};
type UserFormErrors = Partial<Record<"name" | "email" | "form", string>>;
type GroupFormErrors = Partial<Record<"institutionId" | "name" | "form", string>>;
type MemberFormErrors = Partial<Record<"userId" | "role" | "form", string>>;
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void>;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const canGrantSuperAdmin = import.meta.env.VITE_DEMO_SUPER_ADMIN === "true";
const PAGE_SIZE = 20;

function translateRole(role: MembershipRole) {
  return role === "admin" ? "Administrador" : "Membro";
}

function translateStatus(status: string) {
  return status.toLowerCase() === "inactive" ? "Inativo" : "Ativo";
}

function parseErrorMessage(body: { message?: string; error?: string } | null, fallback: string) {
  return body?.message ?? body?.error ?? fallback;
}

function mapUserFormError(message: string): UserFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("e-mail") || normalized.includes("email")) return { email: message };
  if (normalized.includes("nome")) return { name: message };
  return { form: message };
}

function mapGroupFormError(message: string): GroupFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("institui")) return { institutionId: message };
  if (normalized.includes("nome")) return { name: message };
  return { form: message };
}

function mapMemberFormError(message: string): MemberFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("papel")) return { role: message };
  if (
    normalized.includes("pessoa") ||
    normalized.includes("usuário") ||
    normalized.includes("usuario") ||
    normalized.includes("membro")
  ) {
    return { userId: message };
  }
  return { form: message };
}

async function readErrorBody(response: Response) {
  try {
    return (await response.json()) as { message?: string; error?: string };
  } catch {
    return null;
  }
}

function ToastRegion({
  notices,
  onDismiss,
}: {
  notices: Notice[];
  onDismiss: (id: number) => void;
}) {
  if (!notices.length) return null;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {notices.map((notice) => (
        <section
          className={notice.kind === "error" ? "toast error" : "toast"}
          key={notice.id}
          role={notice.kind === "success" ? "status" : "alert"}
        >
          <p>{notice.message}</p>
          <button type="button" className="toast-dismiss" onClick={() => onDismiss(notice.id)}>
            Dispensar
          </button>
        </section>
      ))}
    </div>
  );
}

function ConfirmDialog({
  dialog,
  busy,
  onCancel,
}: {
  dialog: ConfirmDialogState;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-backdrop">
      <section
        aria-describedby="confirm-description"
        aria-labelledby="confirm-title"
        aria-modal="true"
        className="confirm-dialog"
        role="alertdialog"
      >
        <p className="eyebrow">Confirmação necessária</p>
        <h2 id="confirm-title">{dialog.title}</h2>
        <p id="confirm-description">{dialog.description}</p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={dialog.tone === "danger" ? "danger-button" : undefined}
            onClick={() => void dialog.onConfirm()}
            disabled={busy}
          >
            {busy ? "Salvando..." : dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [scope, setScope] = useState<AuthIdentity | null>(null);
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("people");
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticeTimers = useRef<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userListState, setUserListState] = useState<ListState>("loading");
  const [userListError, setUserListError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState<UserFormErrors>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [visibleUsers, setVisibleUsers] = useState(PAGE_SIZE);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([]);
  const [institutionsError, setInstitutionsError] = useState("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupListState, setGroupListState] = useState<ListState>("loading");
  const [groupListError, setGroupListError] = useState("");
  const [groupInstitutionId, setGroupInstitutionId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupFormErrors, setGroupFormErrors] = useState<GroupFormErrors>({});
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [membershipState, setMembershipState] = useState<ListState>("loading");
  const [membershipError, setMembershipError] = useState("");
  const [candidates, setCandidates] = useState<GroupCandidate[]>([]);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("member");
  const [memberFormErrors, setMemberFormErrors] = useState<MemberFormErrors>({});
  const [addingMember, setAddingMember] = useState(false);
  const [pendingMembershipIds, setPendingMembershipIds] = useState<string[]>([]);

  const isSuperAdmin = scope?.roles.includes("super_admin") ?? false;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const selfMembership = memberships.find((membership) => membership.userId === scope?.userId);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = peopleSearch.trim().toLowerCase();
    if (!normalizedSearch) return users;
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [peopleSearch, users]);

  const visibleUserList = filteredUsers.slice(0, visibleUsers);

  function dismissNotice(id: number) {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }

  function addNotice(message: string, kind: Notice["kind"]) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotices((current) => [...current, { id, kind, message }]);
    if (kind === "success") {
      const timer = window.setTimeout(() => dismissNotice(id), 5000);
      noticeTimers.current.push(timer);
    }
  }

  useEffect(() => {
    const timers = noticeTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    void readAuthIdentity()
      .then((identity) => setScope(identity))
      .finally(() => setScopeLoaded(true));
    void loadGroups();
  }, []);

  useEffect(() => {
    if (!scopeLoaded) return;
    if (!isSuperAdmin) {
      setActiveTab("groups");
      return;
    }

    void loadUsers();
    void loadInstitutions();
  }, [isSuperAdmin, scopeLoaded]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMemberships([]);
      setCandidates([]);
      setMembershipState("empty");
      return;
    }

    void Promise.all([loadMemberships(selectedGroupId), loadCandidates(selectedGroupId)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    setVisibleUsers(PAGE_SIZE);
  }, [peopleSearch]);

  async function loadUsers() {
    setUserListState("loading");
    setUserListError("");
    try {
      const response = await authenticatedFetch(`${apiUrl}/users`);
      if (!response.ok) {
        throw new Error(
          parseErrorMessage(await readErrorBody(response), "Não foi possível carregar as pessoas."),
        );
      }

      const result = (await response.json()) as AdminUser[];
      setUsers(result);
      setUserListState(result.length ? "ready" : "empty");
    } catch (error) {
      setUserListError(error instanceof Error ? error.message : "Erro inesperado.");
      setUserListState("error");
    }
  }

  async function loadInstitutions() {
    setInstitutionsError("");
    try {
      const response = await authenticatedFetch(`${apiUrl}/institutions`);
      if (!response.ok) {
        throw new Error(
          parseErrorMessage(
            await readErrorBody(response),
            "Não foi possível carregar as instituições.",
          ),
        );
      }

      const result = (await response.json()) as InstitutionSummary[];
      setInstitutions(result);
      setGroupInstitutionId((current) => current || result[0]?.id || "");
    } catch (error) {
      setInstitutionsError(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  async function loadGroups() {
    setGroupListState("loading");
    setGroupListError("");
    try {
      const response = await authenticatedFetch(`${apiUrl}/groups`);
      if (!response.ok) {
        throw new Error(
          parseErrorMessage(await readErrorBody(response), "Não foi possível carregar os grupos."),
        );
      }

      const result = (await response.json()) as GroupSummary[];
      setGroups(result);
      setSelectedGroupId((current) =>
        result.some((group) => group.id === current) ? current : (result[0]?.id ?? ""),
      );
      setGroupListState(result.length ? "ready" : "empty");
    } catch (error) {
      setGroupListError(error instanceof Error ? error.message : "Erro inesperado.");
      setGroupListState("error");
    }
  }

  async function loadMemberships(groupId: string) {
    setMembershipState("loading");
    setMembershipError("");
    try {
      const response = await authenticatedFetch(`${apiUrl}/groups/${groupId}/members`);
      if (!response.ok) {
        throw new Error(
          parseErrorMessage(await readErrorBody(response), "Não foi possível carregar os membros."),
        );
      }

      const result = (await response.json()) as GroupMembership[];
      setMemberships(result);
      setMembershipState(result.length ? "ready" : "empty");
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "Erro inesperado.");
      setMembershipState("error");
    }
  }

  async function loadCandidates(groupId: string) {
    try {
      const response = await authenticatedFetch(`${apiUrl}/groups/${groupId}/candidates`);
      if (!response.ok) {
        throw new Error(
          parseErrorMessage(
            await readErrorBody(response),
            "Não foi possível carregar as pessoas disponíveis.",
          ),
        );
      }

      const result = (await response.json()) as GroupCandidate[];
      setCandidates(result);
      setMemberUserId((current) =>
        result.some((candidate) => candidate.id === current) ? current : (result[0]?.id ?? ""),
      );
    } catch (error) {
      setCandidates([]);
      addNotice(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as pessoas disponíveis.",
        "error",
      );
    }
  }

  async function refreshGroupDetails(groupId: string) {
    await Promise.all([loadMemberships(groupId), loadCandidates(groupId)]);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserFormErrors({});
    setCreatingUser(true);

    try {
      const response = await authenticatedFetch(`${apiUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, superAdmin }),
      });

      if (!response.ok) {
        const message = parseErrorMessage(
          await readErrorBody(response),
          "Não foi possível cadastrar a pessoa.",
        );
        setUserFormErrors(mapUserFormError(message));
        addNotice(message, "error");
        return;
      }

      setName("");
      setEmail("");
      setSuperAdmin(false);
      addNotice("Pessoa cadastrada.", "success");
      await loadUsers();
    } finally {
      setCreatingUser(false);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupFormErrors({});
    setCreatingGroup(true);

    try {
      const response = await authenticatedFetch(`${apiUrl}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: groupInstitutionId, name: groupName }),
      });

      if (!response.ok) {
        const message = parseErrorMessage(
          await readErrorBody(response),
          "Não foi possível criar o grupo.",
        );
        setGroupFormErrors(mapGroupFormError(message));
        addNotice(message, "error");
        return;
      }

      const created = (await response.json()) as GroupSummary;
      setGroupName("");
      setSelectedGroupId(created.id);
      addNotice("Grupo criado.", "success");
      await loadGroups();
    } finally {
      setCreatingGroup(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId) return;

    setMemberFormErrors({});
    setAddingMember(true);

    try {
      const response = await authenticatedFetch(`${apiUrl}/groups/${selectedGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberUserId, role: memberRole }),
      });

      if (!response.ok) {
        const message = parseErrorMessage(
          await readErrorBody(response),
          "Não foi possível adicionar o membro.",
        );
        setMemberFormErrors(mapMemberFormError(message));
        addNotice(message, "error");
        return;
      }

      addNotice("Membro adicionado.", "success");
      await refreshGroupDetails(selectedGroupId);
    } finally {
      setAddingMember(false);
    }
  }

  async function updateMembershipRole(userId: string, role: MembershipRole) {
    if (!selectedGroupId) return;

    setPendingMembershipIds((current) => [...current, userId]);
    try {
      const response = await authenticatedFetch(
        `${apiUrl}/groups/${selectedGroupId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );

      if (!response.ok) {
        throw new Error(
          parseErrorMessage(await readErrorBody(response), "Não foi possível atualizar o papel."),
        );
      }

      addNotice("Papel atualizado.", "success");
      await refreshGroupDetails(selectedGroupId);
    } catch (error) {
      addNotice(error instanceof Error ? error.message : "Erro inesperado.", "error");
    } finally {
      setPendingMembershipIds((current) => current.filter((id) => id !== userId));
    }
  }

  function requestMembershipRemoval(membership: GroupMembership) {
    setConfirmDialog({
      title: "Remover acesso do grupo?",
      description: `Confirme a remoção de ${membership.userName} do grupo ${selectedGroup?.name ?? "selecionado"}.`,
      confirmLabel: "Remover",
      tone: "danger",
      onConfirm: async () => {
        if (!selectedGroupId) return;

        setConfirmBusy(true);
        setPendingMembershipIds((current) => [...current, membership.userId]);
        try {
          const response = await authenticatedFetch(
            `${apiUrl}/groups/${selectedGroupId}/members/${membership.userId}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            throw new Error(
              parseErrorMessage(
                await readErrorBody(response),
                "Não foi possível remover o membro.",
              ),
            );
          }

          addNotice("Membro removido.", "success");
          setConfirmDialog(null);
          await refreshGroupDetails(selectedGroupId);
        } catch (error) {
          addNotice(error instanceof Error ? error.message : "Erro inesperado.", "error");
        } finally {
          setPendingMembershipIds((current) => current.filter((id) => id !== membership.userId));
          setConfirmBusy(false);
        }
      },
    });
  }

  function requestStatusToggle(user: AdminUser) {
    const nextStatus = user.status.toLowerCase() === "inactive" ? "active" : "inactive";
    const nextStatusLabel = translateStatus(nextStatus);

    setConfirmDialog({
      title: `${nextStatus === "inactive" ? "Desativar" : "Ativar"} pessoa?`,
      description: `Confirme a alteração de status de ${user.name} para ${nextStatusLabel.toLowerCase()}.`,
      confirmLabel: nextStatus === "inactive" ? "Desativar" : "Ativar",
      tone: nextStatus === "inactive" ? "danger" : "default",
      onConfirm: async () => {
        setConfirmBusy(true);
        setPendingUserIds((current) => [...current, user.id]);
        try {
          const response = await authenticatedFetch(`${apiUrl}/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          });

          if (!response.ok) {
            throw new Error(
              parseErrorMessage(
                await readErrorBody(response),
                "Não foi possível atualizar o status.",
              ),
            );
          }

          addNotice(`Status alterado para ${nextStatusLabel.toLowerCase()}.`, "success");
          setConfirmDialog(null);
          await loadUsers();
        } catch (error) {
          addNotice(error instanceof Error ? error.message : "Erro inesperado.", "error");
        } finally {
          setPendingUserIds((current) => current.filter((id) => id !== user.id));
          setConfirmBusy(false);
        }
      },
    });
  }

  const scopeLabel = isSuperAdmin
    ? "Superadministrador"
    : selfMembership
      ? `${translateRole(selfMembership.role)} do grupo ${selectedGroup?.name ?? ""}`.trim()
      : scope?.email
        ? `Usuário autenticado · ${scope.email}`
        : "Usuário autenticado";

  return (
    <main className="admin-shell">
      <ToastRegion notices={notices} onDismiss={dismissNotice} />
      {confirmDialog && (
        <ConfirmDialog
          dialog={confirmDialog}
          busy={confirmBusy}
          onCancel={() => !confirmBusy && setConfirmDialog(null)}
        />
      )}

      <section className="admin-heading">
        <div>
          <p className="eyebrow">Secretaria escolar · acesso</p>
          <h1>Pessoas e permissões.</h1>
          <p className="lede">Mantenha o mapa de acesso da secretaria claro, ativo e auditável.</p>
        </div>
        <span className="scope-chip">
          {scopeLoaded ? scopeLabel : "Carregando escopo do usuário..."}
        </span>
      </section>

      <section className="tabs-shell">
        <div aria-label="Seções administrativas" className="tabs" role="tablist">
          {isSuperAdmin && (
            <button
              aria-selected={activeTab === "people"}
              className={activeTab === "people" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("people")}
              role="tab"
              type="button"
            >
              Pessoas
            </button>
          )}
          <button
            aria-selected={activeTab === "groups"}
            className={activeTab === "groups" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("groups")}
            role="tab"
            type="button"
          >
            Grupos e acessos
          </button>
        </div>

        {activeTab === "people" && isSuperAdmin && (
          <section className="panel-surface" role="tabpanel">
            <div className="admin-grid">
              <form className="admin-form" onSubmit={createUser}>
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Novo cadastro</p>
                    <h2>Adicionar pessoa</h2>
                  </div>
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
                {userFormErrors.name && <p className="field-error">{userFormErrors.name}</p>}

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
                {userFormErrors.email && <p className="field-error">{userFormErrors.email}</p>}

                {canGrantSuperAdmin && (
                  <label className="check" htmlFor="admin-super-admin">
                    <input
                      id="admin-super-admin"
                      type="checkbox"
                      checked={superAdmin}
                      onChange={(event) => setSuperAdmin(event.target.checked)}
                    />
                    Superadministrador
                  </label>
                )}

                <button type="submit" disabled={creatingUser}>
                  {creatingUser ? "Salvando..." : "Adicionar pessoa"}
                </button>
                {userFormErrors.form && <p className="field-error">{userFormErrors.form}</p>}
              </form>

              <section
                className="user-list"
                aria-busy={userListState === "loading"}
                aria-live="polite"
              >
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Gestão de pessoas</p>
                    <h2>Pessoas cadastradas</h2>
                  </div>
                  <strong>{filteredUsers.length.toString().padStart(2, "0")}</strong>
                </div>

                <label className="search-field" htmlFor="people-search">
                  Buscar por nome ou e-mail
                  <input
                    id="people-search"
                    type="search"
                    value={peopleSearch}
                    onChange={(event) => setPeopleSearch(event.target.value)}
                    placeholder="Ex.: ana@instituicao.edu.br"
                  />
                </label>

                {userListState === "loading" && <p className="empty">Carregando pessoas...</p>}
                {userListState === "error" && <p className="empty error">{userListError}</p>}
                {userListState === "empty" && <p className="empty">Nenhuma pessoa cadastrada.</p>}
                {userListState === "ready" && !filteredUsers.length && (
                  <p className="empty">Nenhum resultado para a busca atual.</p>
                )}

                {visibleUserList.map((user) => {
                  const userBusy = pendingUserIds.includes(user.id);
                  const nextAction =
                    user.status.toLowerCase() === "inactive" ? "Ativar" : "Desativar";

                  return (
                    <article className="user-row" key={user.id}>
                      <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                      <div className="user-copy">
                        <h3>{user.name}</h3>
                        <p>{user.email}</p>
                      </div>
                      <div className="user-meta">
                        <span
                          className={
                            user.status.toLowerCase() === "inactive"
                              ? "status-badge muted"
                              : "status-badge"
                          }
                        >
                          {translateStatus(user.status)}
                        </span>
                        <span className={user.superAdmin ? "role-badge elevated" : "role-badge"}>
                          {user.superAdmin ? "Superadministrador" : "Membro"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={userBusy}
                        onClick={() => requestStatusToggle(user)}
                      >
                        {userBusy ? "Salvando..." : nextAction}
                      </button>
                    </article>
                  );
                })}

                {filteredUsers.length > visibleUsers && (
                  <button
                    type="button"
                    className="secondary-button load-more"
                    onClick={() => setVisibleUsers((current) => current + PAGE_SIZE)}
                  >
                    Carregar mais
                  </button>
                )}
              </section>
            </div>
          </section>
        )}

        {activeTab === "groups" && (
          <section className="panel-surface" role="tabpanel">
            <div className="section-heading groups-header">
              <div>
                <p className="section-kicker">Escopos ativos</p>
                <h2>Grupos e acessos</h2>
              </div>
              <strong>{groups.length.toString().padStart(2, "0")}</strong>
            </div>

            {groupListState === "error" && <p className="empty error">{groupListError}</p>}
            {groupListState === "empty" && <p className="empty">Nenhum grupo cadastrado.</p>}

            <div className={isSuperAdmin ? "groups-grid" : "groups-grid single-column"}>
              {isSuperAdmin && (
                <form className="group-form" onSubmit={createGroup}>
                  <div className="subsection-heading">
                    <p className="section-kicker">Novo grupo</p>
                    <h3>Criar grupo</h3>
                  </div>

                  <label htmlFor="group-institution">
                    Instituição
                    <select
                      id="group-institution"
                      value={groupInstitutionId}
                      onChange={(event) => setGroupInstitutionId(event.target.value)}
                      required
                      disabled={!institutions.length}
                    >
                      {!institutions.length && <option value="">Selecione uma instituição</option>}
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {groupFormErrors.institutionId && (
                    <p className="field-error">{groupFormErrors.institutionId}</p>
                  )}

                  <label htmlFor="group-name">
                    Nome do grupo
                    <input
                      id="group-name"
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                      placeholder="Ex.: Turma 2026 A"
                      required
                    />
                  </label>
                  {groupFormErrors.name && <p className="field-error">{groupFormErrors.name}</p>}
                  {institutionsError && <p className="field-error">{institutionsError}</p>}

                  <button type="submit" disabled={creatingGroup || !institutions.length}>
                    {creatingGroup ? "Salvando..." : "Criar grupo"}
                  </button>
                  {groupFormErrors.form && <p className="field-error">{groupFormErrors.form}</p>}
                </form>
              )}

              <section className="group-browser" aria-live="polite">
                <div className="subsection-heading">
                  <p className="section-kicker">Escopo selecionado</p>
                  <h3>Gerenciar acessos</h3>
                </div>

                <label htmlFor="group-select">
                  Grupo
                  <select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    disabled={!groups.length}
                  >
                    {!groups.length && <option value="">Nenhum grupo disponível</option>}
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} — {group.institutionName}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedGroup && (
                  <div className="group-summary">
                    <p>{selectedGroup.name}</p>
                    <small>{selectedGroup.institutionName}</small>
                  </div>
                )}

                {selectedGroupId && (
                  <>
                    <form className="member-form" onSubmit={addMember}>
                      <label htmlFor="member-user">
                        Pessoa
                        <select
                          id="member-user"
                          value={memberUserId}
                          onChange={(event) => setMemberUserId(event.target.value)}
                          required
                          disabled={!candidates.length || addingMember}
                        >
                          {!candidates.length && (
                            <option value="">Nenhuma pessoa disponível</option>
                          )}
                          {candidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name} — {candidate.email}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label htmlFor="member-role">
                        Papel
                        <select
                          id="member-role"
                          value={memberRole}
                          onChange={(event) => setMemberRole(event.target.value as MembershipRole)}
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </label>

                      <button type="submit" disabled={addingMember || !candidates.length}>
                        {addingMember ? "Salvando..." : "Adicionar"}
                      </button>
                    </form>
                    {(memberFormErrors.userId ||
                      memberFormErrors.role ||
                      memberFormErrors.form) && (
                      <div className="field-stack">
                        {memberFormErrors.userId && (
                          <p className="field-error">{memberFormErrors.userId}</p>
                        )}
                        {memberFormErrors.role && (
                          <p className="field-error">{memberFormErrors.role}</p>
                        )}
                        {memberFormErrors.form && (
                          <p className="field-error">{memberFormErrors.form}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {membershipState === "loading" && selectedGroupId && (
                  <p className="empty">Carregando membros...</p>
                )}
                {membershipState === "error" && <p className="empty error">{membershipError}</p>}
                {membershipState === "empty" && selectedGroupId && (
                  <p className="empty">Nenhum membro vinculado.</p>
                )}

                {memberships.map((membership) => {
                  const memberBusy = pendingMembershipIds.includes(membership.userId);

                  return (
                    <article className="member-row" key={`${membership.userId}-${selectedGroupId}`}>
                      <div className="member-copy">
                        <strong>{membership.userName}</strong>
                        <p>{membership.userEmail}</p>
                      </div>
                      <div className="member-actions">
                        <label
                          className="inline-field"
                          htmlFor={`membership-role-${membership.userId}`}
                        >
                          Papel
                          <select
                            id={`membership-role-${membership.userId}`}
                            value={membership.role}
                            disabled={memberBusy}
                            onChange={(event) =>
                              void updateMembershipRole(
                                membership.userId,
                                event.target.value as MembershipRole,
                              )
                            }
                          >
                            <option value="member">Membro</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          className="ghost-button danger-text"
                          disabled={memberBusy}
                          onClick={() => requestMembershipRemoval(membership)}
                        >
                          {memberBusy ? "Salvando..." : "Remover"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminUser,
  type AuthIdentity,
  type GroupMembership,
  type MembershipRole,
  PAGE_SIZE,
  Pagination,
  readAuthIdentity,
  useDomainEventSync,
  useDomainEvents,
  useHostReady,
  usePaginatedItems,
} from "@mfe/shared";
import { PageHeader, ToastRegion as SharedToastRegion, useConfirm } from "@mfe/shared/ui";
import { useQueryClient } from "@tanstack/react-query";
import type {
  AdminTab,
  GroupFormErrors,
  ListState,
  MemberFormErrors,
  Notice,
  UserFormErrors,
} from "./types";
import {
  mapGroupFormError,
  mapMemberFormError,
  mapUserFormError,
  translateRole,
  translateStatus,
} from "./presentation";
import { adminQueryKeys } from "./hooks";
import {
  useAddGroupMember,
  useCreateGroup,
  useCreateUser,
  useGroupCandidates,
  useGroupMembers,
  useGroups,
  useInstitutions,
  useRemoveGroupMember,
  useUpdateGroupMemberRole,
  useUpdateUserStatus,
  useUsers,
} from "./hooks";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const canGrantSuperAdmin = import.meta.env.VITE_DEMO_SUPER_ADMIN === "true";
const EMPTY_LIST: never[] = [];

export default function App() {
  const [scope, setScope] = useState<AuthIdentity | null>(null);
  const [scopeLoaded, setScopeLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("people");
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticeTimers = useRef<number[]>([]);
  const { confirm, dialog: confirmationDialog } = useConfirm();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState<UserFormErrors>({});
  const [peopleSearch, setPeopleSearch] = useState("");
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  const [groupInstitutionId, setGroupInstitutionId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupFormErrors, setGroupFormErrors] = useState<GroupFormErrors>({});
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("member");
  const [memberFormErrors, setMemberFormErrors] = useState<MemberFormErrors>({});
  const [pendingMembershipIds, setPendingMembershipIds] = useState<string[]>([]);

  const isSuperAdmin = scope?.roles.includes("super_admin") ?? false;
  const queryClient = useQueryClient();
  const hostReady = useHostReady();
  const domainEvents = useDomainEvents(hostReady ? "" : apiUrl);
  const usersQuery = useUsers(apiUrl, scopeLoaded && isSuperAdmin);
  const institutionsQuery = useInstitutions(apiUrl, scopeLoaded && isSuperAdmin);
  const groupsQuery = useGroups(apiUrl);
  const membershipsQuery = useGroupMembers(apiUrl, selectedGroupId);
  const candidatesQuery = useGroupCandidates(apiUrl, selectedGroupId);
  const createUserMutation = useCreateUser(apiUrl);
  const createGroupMutation = useCreateGroup(apiUrl);
  const addGroupMemberMutation = useAddGroupMember(apiUrl);
  const updateGroupMemberRoleMutation = useUpdateGroupMemberRole(apiUrl);
  const removeGroupMemberMutation = useRemoveGroupMember(apiUrl);
  const updateUserStatusMutation = useUpdateUserStatus(apiUrl);
  const users = usersQuery.data ?? EMPTY_LIST;
  const institutions = institutionsQuery.data ?? EMPTY_LIST;
  const groups = groupsQuery.data ?? EMPTY_LIST;
  const memberships: GroupMembership[] = membershipsQuery.data ?? EMPTY_LIST;
  const candidates = candidatesQuery.data ?? EMPTY_LIST;
  const {
    pageItems: pageGroups,
    setPage: setGroupsPage,
    ...groupsPagination
  } = usePaginatedItems(groups);
  const membershipsPagination = usePaginatedItems(memberships);
  const userListState: ListState = usersQuery.isFetching
    ? "loading"
    : usersQuery.isError
      ? "error"
      : users.length
        ? "ready"
        : "empty";
  const groupListState: ListState = groupsQuery.isFetching
    ? "loading"
    : groupsQuery.isError
      ? "error"
      : groups.length
        ? "ready"
        : "empty";
  const membershipState: ListState = membershipsQuery.isFetching
    ? "loading"
    : membershipsQuery.isError
      ? "error"
      : memberships.length
        ? "ready"
        : "empty";
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
  const peoplePagination = usePaginatedItems(filteredUsers);

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
  }, []);

  useEffect(() => {
    if (!scopeLoaded) return;
    if (!isSuperAdmin) {
      setActiveTab("groups");
      return;
    }
  }, [isSuperAdmin, scopeLoaded]);

  useEffect(() => {
    if (!groupsQuery.data) return;
    setSelectedGroupId((current) =>
      groupsQuery.data.some((group) => group.id === current)
        ? current
        : (groupsQuery.data[0]?.id ?? ""),
    );
  }, [groupsQuery.data]);

  useEffect(() => {
    const selectedGroupIndex = groups.findIndex((group) => group.id === selectedGroupId);
    if (selectedGroupIndex >= 0) {
      setGroupsPage(Math.floor(selectedGroupIndex / PAGE_SIZE) + 1);
    }
  }, [groups, selectedGroupId, setGroupsPage]);

  useEffect(() => {
    if (institutions.length) {
      setGroupInstitutionId((current) => current || institutions[0].id);
    }
  }, [institutions]);

  useEffect(() => {
    if (candidates.length) {
      setMemberUserId((current) =>
        candidates.some((candidate) => candidate.id === current) ? current : candidates[0].id,
      );
    }
  }, [candidates]);

  useDomainEventSync(domainEvents.events, (event) => {
    if (event.type === "USER_UPDATED") {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.users(apiUrl) });
    } else if (
      event.type === "GROUP_MEMBERSHIP_UPDATED" ||
      event.type === "GROUP_MEMBERSHIP_REMOVED"
    ) {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members", apiUrl] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "candidates", apiUrl] });
    } else if (
      event.type === "INSTITUTION_CREATED" ||
      event.type === "INSTITUTION_UPDATED" ||
      event.type === "INSTITUTION_INACTIVATED"
    ) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.institutions(apiUrl) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups(apiUrl) });
    }
  });

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserFormErrors({});

    try {
      await createUserMutation.mutateAsync({ name, email, superAdmin });
      peoplePagination.setPage(1);
      setName("");
      setEmail("");
      setSuperAdmin(false);
      addNotice("Pessoa cadastrada.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível cadastrar a pessoa.";
      setUserFormErrors(mapUserFormError(message));
      addNotice(message, "error");
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupFormErrors({});

    try {
      const created = await createGroupMutation.mutateAsync({
        institutionId: groupInstitutionId,
        name: groupName,
      });
      setGroupName("");
      setSelectedGroupId(created.id);
      addNotice("Grupo criado.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o grupo.";
      setGroupFormErrors(mapGroupFormError(message));
      addNotice(message, "error");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId) return;

    setMemberFormErrors({});

    try {
      await addGroupMemberMutation.mutateAsync({
        groupId: selectedGroupId,
        input: { userId: memberUserId, role: memberRole },
      });
      addNotice("Membro adicionado.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível adicionar o membro.";
      setMemberFormErrors(mapMemberFormError(message));
      addNotice(message, "error");
    }
  }

  async function updateMembershipRole(userId: string, role: MembershipRole) {
    if (!selectedGroupId) return;

    setPendingMembershipIds((current) => [...current, userId]);
    try {
      await updateGroupMemberRoleMutation.mutateAsync({
        groupId: selectedGroupId,
        userId,
        role,
      });
      addNotice("Papel atualizado.", "success");
    } catch (error) {
      addNotice(error instanceof Error ? error.message : "Erro inesperado.", "error");
    } finally {
      setPendingMembershipIds((current) => current.filter((id) => id !== userId));
    }
  }

  function requestMembershipRemoval(membership: GroupMembership) {
    void confirm(
      {
        title: "Remover acesso do grupo?",
        description: `Confirme a remoção de ${membership.userName} do grupo ${selectedGroup?.name ?? "selecionado"}.`,
        confirmLabel: "Remover",
        tone: "danger",
      },
      async () => {
        if (!selectedGroupId) return;

        setPendingMembershipIds((current) => [...current, membership.userId]);
        try {
          await removeGroupMemberMutation.mutateAsync({
            groupId: selectedGroupId,
            userId: membership.userId,
          });
          addNotice("Membro removido.", "success");
        } finally {
          setPendingMembershipIds((current) => current.filter((id) => id !== membership.userId));
        }
      },
    );
  }

  function requestStatusToggle(user: AdminUser) {
    const nextStatus = user.status.toLowerCase() === "inactive" ? "active" : "inactive";
    const nextStatusLabel = translateStatus(nextStatus);

    void confirm(
      {
        title: `${nextStatus === "inactive" ? "Desativar" : "Ativar"} pessoa?`,
        description: `Confirme a alteração de status de ${user.name} para ${nextStatusLabel.toLowerCase()}.`,
        confirmLabel: nextStatus === "inactive" ? "Desativar" : "Ativar",
        tone: nextStatus === "inactive" ? "danger" : "default",
      },
      async () => {
        setPendingUserIds((current) => [...current, user.id]);
        try {
          await updateUserStatusMutation.mutateAsync({ userId: user.id, status: nextStatus });
          addNotice(`Status alterado para ${nextStatusLabel.toLowerCase()}.`, "success");
        } finally {
          setPendingUserIds((current) => current.filter((id) => id !== user.id));
        }
      },
    );
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
      <SharedToastRegion
        notices={notices}
        onDismiss={(id) => {
          if (typeof id === "number") dismissNotice(id);
        }}
      />
      {confirmationDialog}

      <section className="admin-heading">
        <PageHeader
          eyebrow="Secretaria escolar · acesso"
          title="Pessoas e permissões."
          description={
            <p className="lede">
              Mantenha o mapa de acesso da secretaria claro, ativo e auditável.
            </p>
          }
          actions={
            <span className="scope-chip">
              {scopeLoaded ? scopeLabel : "Carregando escopo do usuário..."}
            </span>
          }
        />
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

                <button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Salvando..." : "Adicionar pessoa"}
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
                    onChange={(event) => {
                      setPeopleSearch(event.target.value);
                      peoplePagination.setPage(1);
                    }}
                    placeholder="Ex.: ana@instituicao.edu.br"
                  />
                </label>

                {userListState === "loading" && <p className="empty">Carregando pessoas...</p>}
                {userListState === "error" && (
                  <p className="empty error">
                    {usersQuery.error instanceof Error
                      ? usersQuery.error.message
                      : "Não foi possível carregar as pessoas."}
                  </p>
                )}
                {userListState === "empty" && <p className="empty">Nenhuma pessoa cadastrada.</p>}
                {userListState === "ready" && !filteredUsers.length && (
                  <p className="empty">Nenhum resultado para a busca atual.</p>
                )}

                {peoplePagination.pageItems.map((user) => {
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

                <Pagination
                  label="pessoas"
                  page={peoplePagination.page}
                  pageCount={peoplePagination.pageCount}
                  totalItems={filteredUsers.length}
                  onPageChange={peoplePagination.setPage}
                />
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

            {groupListState === "error" && (
              <p className="empty error">
                {groupsQuery.error instanceof Error
                  ? groupsQuery.error.message
                  : "Não foi possível carregar os grupos."}
              </p>
            )}
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
                  {institutionsQuery.isError && (
                    <p className="field-error">
                      {institutionsQuery.error instanceof Error
                        ? institutionsQuery.error.message
                        : "Não foi possível carregar as instituições."}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={createGroupMutation.isPending || !institutions.length}
                  >
                    {createGroupMutation.isPending ? "Salvando..." : "Criar grupo"}
                  </button>
                  {groupFormErrors.form && <p className="field-error">{groupFormErrors.form}</p>}
                </form>
              )}

              <section className="group-browser" aria-live="polite">
                <div className="subsection-heading">
                  <p className="section-kicker">Escopo selecionado</p>
                  <h3>Gerenciar acessos</h3>
                </div>

                <div className="group-picker">
                  <p className="group-picker-label">Grupo</p>
                  {groups.length ? (
                    <div className="group-options" role="group" aria-label="Grupos disponíveis">
                      {pageGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          className="group-option"
                          aria-label={`${group.name} — ${group.institutionName}`}
                          aria-pressed={selectedGroupId === group.id}
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            membershipsPagination.setPage(1);
                          }}
                        >
                          <span>{group.name}</span>
                          <small>{group.institutionName}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">Nenhum grupo disponível.</p>
                  )}
                  <Pagination
                    label="grupos"
                    page={groupsPagination.page}
                    pageCount={groupsPagination.pageCount}
                    totalItems={groups.length}
                    onPageChange={setGroupsPage}
                  />
                </div>

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
                          disabled={!candidates.length || addGroupMemberMutation.isPending}
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

                      <button
                        type="submit"
                        disabled={addGroupMemberMutation.isPending || !candidates.length}
                      >
                        {addGroupMemberMutation.isPending ? "Salvando..." : "Adicionar"}
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
                {membershipState === "error" && (
                  <p className="empty error">
                    {membershipsQuery.error instanceof Error
                      ? membershipsQuery.error.message
                      : "Não foi possível carregar os membros."}
                  </p>
                )}
                {candidatesQuery.isError && (
                  <p className="field-error">
                    {candidatesQuery.error instanceof Error
                      ? candidatesQuery.error.message
                      : "Não foi possível carregar as pessoas disponíveis."}
                  </p>
                )}
                {membershipState === "empty" && selectedGroupId && (
                  <p className="empty">Nenhum membro vinculado.</p>
                )}

                {membershipsPagination.pageItems.map((membership) => {
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
                <Pagination
                  label="membros"
                  page={membershipsPagination.page}
                  pageCount={membershipsPagination.pageCount}
                  totalItems={memberships.length}
                  onPageChange={membershipsPagination.setPage}
                />
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

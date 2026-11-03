import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import { createQueryWrapper } from "./test-utils";

const sharedMocks = vi.hoisted(() => ({
  readAuthIdentity: vi.fn(),
}));

vi.mock("@mfe/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mfe/shared")>()),
  ...sharedMocks,
}));

const institutions = [{ id: "inst-1", name: "Instituição Demo" }];
const groups = [
  {
    id: "group-1",
    institutionId: "inst-1",
    institutionName: "Instituição Demo",
    name: "Grupo Verde",
  },
];
const members = [
  {
    userId: "viewer-1",
    userName: "Ana Admin",
    userEmail: "ana@demo",
    role: "admin" as const,
  },
  {
    userId: "user-2",
    userName: "Bruno Membro",
    userEmail: "bruno@demo",
    role: "member" as const,
  },
];
const candidates = [{ id: "cand-1", name: "João Pessoa", email: "joao@demo" }];
let apiFetch: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  if (status === 204) return Promise.resolve(new Response(null, { status }));
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function setupAuthenticatedFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  apiFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", apiFetch);
}

describe("Admin UX", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.set(globalThis, "__mfeHostReady", true);
  });

  it("hides people management for non-superadmins and shows the real scope", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: [],
    });
    setupAuthenticatedFetch((url) => {
      if (url.endsWith("/groups")) return jsonResponse(groups);
      if (url.endsWith("/groups/group-1/members")) return jsonResponse(members);
      if (url.endsWith("/groups/group-1/candidates")) return jsonResponse(candidates);
      return jsonResponse([]);
    });

    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() =>
      expect(screen.getByText("Administrador do grupo Grupo Verde")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("tab", { name: "Pessoas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Criar grupo")).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Grupo Verde — Instituição Demo" }),
    ).toBeInTheDocument();
  });

  it("uses group names and candidate labels while creating groups", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });

    setupAuthenticatedFetch((url, init) => {
      if (!init?.method && url.endsWith("/users")) {
        return jsonResponse([
          {
            id: "user-1",
            name: "Pessoa Existente",
            email: "pessoa@demo",
            status: "active",
            superAdmin: false,
          },
        ]);
      }
      if (!init?.method && url.endsWith("/institutions")) return jsonResponse(institutions);
      if (!init?.method && url.endsWith("/groups")) return jsonResponse(groups);
      if (!init?.method && url.endsWith("/groups/group-1/members")) return jsonResponse(members);
      if (!init?.method && url.endsWith("/groups/group-1/candidates"))
        return jsonResponse(candidates);
      if (init?.method === "POST" && url.endsWith("/groups")) {
        return jsonResponse(
          {
            id: "group-2",
            institutionId: "inst-1",
            institutionName: "Instituição Demo",
            name: "Turma 2026 A",
          },
          201,
        );
      }
      return jsonResponse([]);
    });

    render(<App />, { wrapper: createQueryWrapper() });

    fireEvent.click(screen.getByRole("tab", { name: "Grupos e acessos" }));

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "João Pessoa — joao@demo" })).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("option", { name: "Grupo Verde — Instituição Demo" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nome do grupo"), {
      target: { value: "Turma 2026 A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/groups"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ institutionId: "inst-1", name: "Turma 2026 A" }),
        }),
      ),
    );
  });

  it("keeps the people list visible when createUser fails", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });

    setupAuthenticatedFetch((url, init) => {
      if (!init?.method && url.endsWith("/users")) {
        return jsonResponse([
          {
            id: "user-1",
            name: "Pessoa Existente",
            email: "pessoa@demo",
            status: "active",
            superAdmin: false,
          },
        ]);
      }
      if (init?.method === "POST" && url.endsWith("/users")) {
        return jsonResponse({ message: "E-mail já cadastrado." }, 409);
      }
      if (!init?.method && url.endsWith("/institutions")) return jsonResponse(institutions);
      if (!init?.method && url.endsWith("/groups")) return jsonResponse(groups);
      if (!init?.method && url.endsWith("/groups/group-1/members")) return jsonResponse(members);
      if (!init?.method && url.endsWith("/groups/group-1/candidates"))
        return jsonResponse(candidates);
      return jsonResponse([]);
    });

    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(screen.getByText("Pessoa Existente")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Nova Pessoa" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar pessoa" }));

    await waitFor(() => expect(screen.getAllByText("E-mail já cadastrado.")).toHaveLength(2));
    expect(screen.getByText("Pessoa Existente")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma pessoa cadastrada.")).not.toBeInTheDocument();
  });

  it("cancels active list requests when the remote unmounts", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });
    const requestSignals: AbortSignal[] = [];
    setupAuthenticatedFetch((_url, init) => {
      if (init?.signal) requestSignals.push(init.signal);
      return new Promise<Response>(() => {});
    });

    const { unmount } = render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(requestSignals.length).toBeGreaterThanOrEqual(3));
    unmount();

    expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
  });

  it("updates member roles and removes members with an alertdialog confirmation", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });

    setupAuthenticatedFetch((url, init) => {
      if (!init?.method && url.endsWith("/users")) return jsonResponse([]);
      if (!init?.method && url.endsWith("/institutions")) return jsonResponse(institutions);
      if (!init?.method && url.endsWith("/groups")) return jsonResponse(groups);
      if (!init?.method && url.endsWith("/groups/group-1/members")) return jsonResponse(members);
      if (!init?.method && url.endsWith("/groups/group-1/candidates"))
        return jsonResponse(candidates);
      if (init?.method === "PATCH" && url.endsWith("/groups/group-1/members/user-2")) {
        return jsonResponse({
          userId: "user-2",
          groupId: "group-1",
          institutionId: "inst-1",
          role: "admin",
        });
      }
      if (init?.method === "DELETE" && url.endsWith("/groups/group-1/members/user-2")) {
        return jsonResponse({}, 204);
      }
      return jsonResponse([]);
    });

    const { container } = render(<App />, { wrapper: createQueryWrapper() });

    fireEvent.click(screen.getByRole("tab", { name: "Grupos e acessos" }));

    await waitFor(() => expect(screen.getByText("Bruno Membro")).toBeInTheDocument());

    fireEvent.change(container.querySelector("#membership-role-user-2")!, {
      target: { value: "admin" },
    });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/groups/group-1/members/user-2"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "admin" }),
        }),
      ),
    );

    const memberRow = screen.getByText("Bruno Membro").closest(".member-row");
    expect(memberRow).not.toBeNull();
    fireEvent.click(within(memberRow!).getByRole("button", { name: "Remover" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Bruno Membro/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remover" }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/groups/group-1/members/user-2"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("filters people, loads more results, and confirms status changes", async () => {
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });

    const users = Array.from({ length: 21 }, (_, index) => ({
      id: `user-${index + 1}`,
      name: `Pessoa ${index + 1}`,
      email: `pessoa${index + 1}@demo`,
      status: "active",
      superAdmin: false,
    }));

    setupAuthenticatedFetch((url, init) => {
      if (!init?.method && url.endsWith("/users")) return jsonResponse(users);
      if (init?.method === "PATCH" && url.endsWith("/users/user-1")) {
        return jsonResponse({
          id: "user-1",
          name: "Pessoa 1",
          email: "pessoa1@demo",
          status: "inactive",
          superAdmin: false,
        });
      }
      if (!init?.method && url.endsWith("/institutions")) return jsonResponse(institutions);
      if (!init?.method && url.endsWith("/groups")) return jsonResponse(groups);
      if (!init?.method && url.endsWith("/groups/group-1/members")) return jsonResponse(members);
      if (!init?.method && url.endsWith("/groups/group-1/candidates"))
        return jsonResponse(candidates);
      return jsonResponse([]);
    });

    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(screen.getByText("Pessoa 20")).toBeInTheDocument());
    expect(screen.queryByText("Pessoa 21")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() => expect(screen.getByText("Pessoa 21")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Buscar por nome ou e-mail"), {
      target: { value: "pessoa21@demo" },
    });
    await waitFor(() => expect(screen.getByText("Pessoa 21")).toBeInTheDocument());
    expect(screen.queryByText("Pessoa 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por nome ou e-mail"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Desativar" })[0]);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Desativar" }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/user-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "inactive" }),
        }),
      ),
    );
  });
});

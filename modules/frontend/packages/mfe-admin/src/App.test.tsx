import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

describe("Admin states and accessibility", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows loading and empty states without exposing superadmin control by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })),
    );
    render(<App />);
    expect(screen.getByText("Carregando pessoas...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Nenhuma pessoa cadastrada.")).toBeInTheDocument());
    expect(screen.queryByLabelText("Superadministrador")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("shows an error when user loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 500 }))),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByText("Não foi possível carregar as pessoas.")).not.toHaveLength(0),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("loads real institution and user IDs for group creation and membership", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/institutions")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "inst-123", name: "Instituição Demo" }]), {
            status: 200,
          }),
        );
      }

      if (url.includes("/users")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "user-456", name: "Ana Souza", email: "ana@demo", status: "active", superAdmin: false }]),
            { status: 200 },
          ),
        );
      }

      if (init?.method === "POST" && url.includes("/groups") && !url.includes("/members")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "group-789", institutionId: "inst-123" }), {
            status: 201,
          }),
        );
      }

      if (url.includes("/groups")) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText("Nova instituição")).toHaveValue("inst-123"));

    const createGroupButton = screen.getByRole("button", { name: /criar grupo/i });
    fireEvent.submit(createGroupButton.closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/groups"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ institutionId: "inst-123" }),
      }),
    ));

    await waitFor(() => expect(screen.getByLabelText("Pessoa do grupo")).toHaveValue("user-456"));
    const addMemberButton = screen.getByRole("button", { name: "Adicionar membro" });
    fireEvent.submit(addMemberButton.closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/groups/group-789/members"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "user-456", role: "member" }),
      }),
    ));
  });
});

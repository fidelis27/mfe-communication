import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { vi } from "vitest";
import App from "./App";

expect.extend(toHaveNoViolations);

const sharedMocks = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  readAuthIdentity: vi.fn(),
}));

vi.mock("@mfe/shared", () => sharedMocks);

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function setupAuthenticatedFetch() {
  sharedMocks.authenticatedFetch.mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

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
      if (!init?.method && url.endsWith("/institutions")) {
        return jsonResponse([{ id: "inst-1", name: "Instituição Demo" }]);
      }
      if (!init?.method && url.endsWith("/groups")) {
        return jsonResponse([
          {
            id: "group-1",
            institutionId: "inst-1",
            institutionName: "Instituição Demo",
            name: "Grupo Verde",
          },
        ]);
      }
      if (!init?.method && url.endsWith("/groups/group-1/members")) {
        return jsonResponse([
          {
            userId: "viewer-1",
            userName: "Ana Admin",
            userEmail: "ana@demo",
            role: "admin",
          },
        ]);
      }
      if (!init?.method && url.endsWith("/groups/group-1/candidates")) {
        return jsonResponse([{ id: "cand-1", name: "João Pessoa", email: "joao@demo" }]);
      }

      return jsonResponse([]);
    },
  );
}

describe("Admin accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMocks.readAuthIdentity.mockResolvedValue({
      userId: "viewer-1",
      email: "ana@demo",
      name: "Ana Admin",
      roles: ["super_admin"],
    });
    setupAuthenticatedFetch();
  });

  it("has no detectable axe violations on the people tab", async () => {
    const { container } = render(<App />);

    await waitFor(() => expect(screen.getByText("Pessoa Existente")).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no detectable axe violations on the groups tab", async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Grupos e acessos" }));
    await waitFor(() => expect(screen.getByText("Grupo Verde")).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });
});

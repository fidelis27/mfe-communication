import { render, screen, waitFor } from "@testing-library/react";
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
});

import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 })),
  );
}

describe("Institution states and accessibility", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows loading and then the empty state", async () => {
    mockFetch([]);
    render(<App />);
    expect(screen.getByText("Carregando instituições...")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Nenhuma instituição cadastrada.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/)).toBeInTheDocument();
  });

  it("shows the error state when loading fails", async () => {
    mockFetch({}, false);
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByText("Não foi possível carregar as instituições.")).not.toHaveLength(0),
    );
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});

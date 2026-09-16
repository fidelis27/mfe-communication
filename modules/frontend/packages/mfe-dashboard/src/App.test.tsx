import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

class MockWebSocket {
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  close() {}
}

describe("Dashboard states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows loading and then the success state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
        ),
    );
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(<App />);
    expect(screen.getByText("Carregando indicadores autorizados...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Dados em movimento")).toBeInTheDocument());
  });

  it("shows retry when an indicator request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 500 }))),
    );
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(<App />);
    await waitFor(() => expect(screen.getByText("Não foi possível atualizar")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});

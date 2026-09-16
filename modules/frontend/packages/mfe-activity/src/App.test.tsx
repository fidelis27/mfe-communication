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

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 })),
  );
  vi.stubGlobal("WebSocket", MockWebSocket);
}

describe("Activity states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows loading and empty states", async () => {
    mockFetch([]);
    render(<App />);
    expect(screen.getByText("Carregando histórico de atividade...")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Aguardando uma alteração no sistema.")).toBeInTheDocument(),
    );
  });

  it("shows the retry action on history error", async () => {
    mockFetch({}, false);
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar o histórico.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});

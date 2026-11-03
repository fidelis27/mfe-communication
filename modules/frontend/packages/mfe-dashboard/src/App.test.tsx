import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import App from "./App";
import { createQueryWrapper } from "./test-utils";

class MockWebSocket {
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  close() {}
}

describe("Dashboard states", () => {
  beforeEach(() => Reflect.set(globalThis, "__mfeHostReady", true));
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
  });

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
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByText("Carregando indicadores autorizados...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Dados em movimento")).toBeInTheDocument());
  });

  it("shows retry when an indicator request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 500 }))),
    );
    vi.stubGlobal("WebSocket", MockWebSocket);
    render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(screen.getByText("Não foi possível atualizar")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("cancels all indicator requests when the remote unmounts", async () => {
    const requestSignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.signal) requestSignals.push(init.signal);
        return new Promise<Response>(() => {});
      }),
    );

    const { unmount } = render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(requestSignals).toHaveLength(3));
    unmount();

    expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
  });
});

import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { dispatch, type DomainEvent } from "@mfe/shared";
import App from "./App";
import { createQueryWrapper } from "./test-utils";

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
  beforeEach(() => Reflect.set(globalThis, "__mfeHostReady", true));
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
  });

  it("shows loading and empty states", async () => {
    mockFetch([]);
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByText("Carregando histórico de atividade...")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Aguardando uma alteração no sistema.")).toBeInTheDocument(),
    );
  });

  it("shows the retry action on history error", async () => {
    mockFetch({}, false);
    render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() =>
      expect(
        screen.getByText("O serviço está temporariamente indisponível. Tente novamente."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("cancels the history request when the remote unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal;
        return new Promise<Response>(() => {});
      }),
    );

    const { unmount } = render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(requestSignal).toBeDefined());
    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps a live event received while history is loading", async () => {
    let resolveHistory!: (response: Response) => void;
    const historyResponse = new Promise<Response>((resolve) => {
      resolveHistory = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => historyResponse),
    );

    render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const event: DomainEvent<"STUDENT_CREATED"> = {
      eventId: "evt-live-1",
      type: "STUDENT_CREATED",
      version: 1,
      source: "backend",
      correlationId: "correlation-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        id: "student-1",
        name: "Ana",
        institutionId: "institution-1",
        status: "active",
      },
    };
    act(() => dispatch("domain", "domain:event", event));
    act(() => resolveHistory(new Response(JSON.stringify([]), { status: 200 })));

    expect(await screen.findByText("Estudante cadastrado")).toBeInTheDocument();
  });
});

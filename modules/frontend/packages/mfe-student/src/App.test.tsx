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

describe("Student", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aborts the initial fetch when the component unmounts", () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal;
        return new Promise<Response>(() => {});
      }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(<App />);
    unmount();

    expect(requestSignal?.aborted).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    vi.unstubAllGlobals();
  });

  it("loads institutions only once during the initial render", async () => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.endsWith("/institutions")
        ? [{ id: "institution-1", name: "Instituicao Demo" }]
        : [];
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByLabelText("Instituição")).toHaveValue("institution-1"));
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/institutions")),
    ).toHaveLength(1);
  });
});

import { render } from "@testing-library/react";
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
});

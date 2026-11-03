import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import { createQueryWrapper } from "./test-utils";

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

    const { unmount } = render(<App />, { wrapper: createQueryWrapper() });
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

    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(screen.getByLabelText("Instituição")).toHaveValue("institution-1"));
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/institutions")),
    ).toHaveLength(1);
  });

  it("renders no more than 20 students and navigates to the next page", async () => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    const students = Array.from({ length: 25 }, (_, index) => ({
      id: `student-${index + 1}`,
      name: `Estudante ${index + 1}`,
      institutionId: "institution-1",
      status: "active",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.endsWith("/institutions")
          ? [{ id: "institution-1", name: "Instituicao Demo" }]
          : students;
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }),
    );

    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(20));
    expect(screen.queryByText("Estudante 21")).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Paginação de estudantes" })).getByRole(
        "button",
        { name: "Próxima" },
      ),
    );
    expect(await screen.findByText("Estudante 21")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });
});

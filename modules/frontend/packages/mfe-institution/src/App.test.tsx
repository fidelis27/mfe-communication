import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import App from "./App";
import { createQueryWrapper } from "./test-utils";

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 })),
  );
}

describe("Institution states and accessibility", () => {
  beforeEach(() => Reflect.set(globalThis, "__mfeHostReady", true));
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
  });

  it("shows loading and then the empty state", async () => {
    mockFetch([]);
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByText("Carregando instituições...")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Nenhuma instituição cadastrada.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/)).toBeInTheDocument();
  });

  it("shows the error state when loading fails", async () => {
    mockFetch({}, false);
    render(<App />, { wrapper: createQueryWrapper() });
    await waitFor(() =>
      expect(
        screen.getAllByText("O serviço está temporariamente indisponível. Tente novamente."),
      ).not.toHaveLength(0),
    );
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("cancels the institutions request when the remote unmounts", async () => {
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

  it("renders no more than 20 institutions and navigates to the next page", async () => {
    const institutions = Array.from({ length: 25 }, (_, index) => ({
      id: `institution-${index + 1}`,
      name: `Instituição ${index + 1}`,
      status: "active",
    }));
    mockFetch(institutions);
    render(<App />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(20));
    expect(screen.queryByText("Instituição 21")).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Paginação de instituições" })).getByRole(
        "button",
        { name: "Próxima" },
      ),
    );

    expect(await screen.findByText("Instituição 21")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });
});

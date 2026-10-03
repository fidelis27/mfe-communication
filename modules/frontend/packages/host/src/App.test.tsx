import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  initializeAuth: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  subscribeToAuthState: vi.fn(),
  useDispatch: vi.fn(() => vi.fn()),
  useDomainEvents: vi.fn(() => ({ events: [], connection: "connected" })),
  useListen: vi.fn(),
}));

vi.mock("@mfe/shared", () => authMocks);

async function renderHost(options: { authenticated: boolean; path?: string }) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
  window.history.pushState({}, "", options.path ?? "/estudantes");
  authMocks.initializeAuth.mockResolvedValue(options.authenticated);
  authMocks.subscribeToAuthState.mockReturnValue(() => {});

  const { default: App } = await import("./App");
  return render(<App />);
}

describe("Host navigation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders module links with real href targets", async () => {
    await renderHost({ authenticated: true, path: "/admin" });

    await waitFor(() => expect(screen.getByTestId("remote-mock")).toBeInTheDocument());

    expect(screen.getByRole("link", { name: /estudantes/i })).toHaveAttribute(
      "href",
      "/estudantes",
    );
    expect(screen.getByRole("link", { name: /instituições/i })).toHaveAttribute(
      "href",
      "/instituicoes",
    );
    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("aria-current", "page");
  });

  it("updates history with client-side navigation on plain clicks", async () => {
    await renderHost({ authenticated: true, path: "/estudantes" });

    await waitFor(() => expect(screen.getByTestId("remote-mock")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("link", { name: /dashboard/i }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    );
    expect(window.location.pathname).toBe("/dashboard");
  });
});

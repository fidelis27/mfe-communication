import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  initializeAuth: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  subscribeToAuthState: vi.fn(),
  useDomainEvents: vi.fn(() => ({ events: [], connection: "connected" })),
}));

vi.mock("@mfe/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mfe/shared")>()),
  ...authMocks,
}));

import { listen, type DomainEvent } from "@mfe/shared";

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
    Reflect.deleteProperty(globalThis, "__mfeBus");
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

  it("publishes each domain event only once, including under StrictMode", async () => {
    const received: string[] = [];
    const unsubscribe = listen("domain", "STUDENT_CREATED", (payload) => {
      received.push(payload.id);
    });

    const eventOne: DomainEvent<"STUDENT_CREATED"> = {
      eventId: "event-1",
      type: "STUDENT_CREATED",
      version: 1,
      source: "test",
      correlationId: "test",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: { id: "student-1", name: "Ana", institutionId: "institution-1", status: "active" },
    };
    const eventTwo: DomainEvent<"STUDENT_CREATED"> = {
      ...eventOne,
      eventId: "event-2",
      payload: { ...eventOne.payload, id: "student-2" },
    };

    authMocks.useDomainEvents.mockReturnValue({
      events: [],
      connection: "connected",
    });
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
    authMocks.initializeAuth.mockResolvedValue(true);
    authMocks.subscribeToAuthState.mockReturnValue(() => {});
    window.history.pushState({}, "", "/estudantes");
    const { default: App } = await import("./App");
    const { rerender } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    act(() => {
      authMocks.useDomainEvents.mockReturnValue({
        events: [eventOne],
        connection: "connected",
      });
      rerender(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });

    act(() => {
      authMocks.useDomainEvents.mockReturnValue({
        events: [eventTwo, eventOne],
        connection: "connected",
      });
      rerender(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });

    expect(received).toEqual(["student-1", "student-2"]);
    unsubscribe();
  });
});

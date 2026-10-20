import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { vi } from "vitest";

expect.extend(toHaveNoViolations);

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

async function renderHost() {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
  window.history.pushState({}, "", "/admin");
  authMocks.initializeAuth.mockResolvedValue(true);
  authMocks.subscribeToAuthState.mockReturnValue(() => {});

  const { default: App } = await import("./App");
  return render(<App />);
}

describe("Host accessibility", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("has no detectable axe violations in the authenticated shell", async () => {
    const { container } = await renderHost();

    await waitFor(() => expect(screen.getByTestId("remote-mock")).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });
});

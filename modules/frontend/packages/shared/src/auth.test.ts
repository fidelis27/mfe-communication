import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

describe("shared Supabase auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Reflect.deleteProperty(globalThis, "__secretariaSupabaseAuthBridge");
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabaseMocks.createClient.mockReturnValue({
      auth: {
        getSession: supabaseMocks.getSession,
        onAuthStateChange: supabaseMocks.onAuthStateChange,
        signInWithPassword: supabaseMocks.signInWithPassword,
        signOut: supabaseMocks.signOut,
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("requires Supabase configuration", async () => {
    const auth = await import("./auth");
    await expect(auth.initializeAuth({ url: "", anonKey: "" })).rejects.toThrow(
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required",
    );
  });

  it("creates one persistent client with automatic token refresh", async () => {
    const auth = await import("./auth");
    const config = { url: "https://project.supabase.co", anonKey: "public-key" };

    await Promise.all([auth.initializeAuth(config), auth.initializeAuth(config)]);

    expect(supabaseMocks.createClient).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      config.url,
      config.anonKey,
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        }),
      }),
    );
  });

  it("sends the current access token and removes the demo identity header", async () => {
    const session = { access_token: "signed-access-token" };
    supabaseMocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const auth = await import("./auth");
    await auth.initializeAuth({ url: "https://project.supabase.co", anonKey: "public-key" });
    await auth.authenticatedFetch("/students", {
      headers: { "Content-Type": "application/json", "x-demo-user": "demo" },
    });

    const [, request] = fetchMock.mock.calls[0];
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer signed-access-token",
    });
  });

  it("reuses the host session when a remote loads a separate shared-package copy", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "signed-access-token" } },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const hostAuth = await import("./auth");
    await hostAuth.initializeAuth({ url: "https://project.supabase.co", anonKey: "public-key" });

    vi.resetModules();
    const remoteAuth = await import("./auth");
    await remoteAuth.authenticatedFetch("/students");

    expect(supabaseMocks.createClient).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.headers.Authorization).toMatch(/^Bearer /);
  });

  it("preserves the abort signal while requesting without a session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    const auth = await import("./auth");
    await auth.initializeAuth({ url: "https://project.supabase.co", anonKey: "public-key" });
    await auth.authenticatedFetch("/students", { signal: controller.signal });

    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  });

  it("surfaces login errors instead of creating a success-shaped session", async () => {
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error("invalid credentials"),
    });
    const auth = await import("./auth");
    await auth.initializeAuth({ url: "https://project.supabase.co", anonKey: "public-key" });

    await expect(auth.login("person@example.com", "wrong-password")).rejects.toThrow(
      "invalid credentials",
    );
  });

  it("parses auth identity from the access token payload", async () => {
    const auth = await import("./auth");
    const payload = {
      sub: "user-123",
      email: "admin@example.com",
      user_metadata: { full_name: "Ana Admin" },
      app_metadata: { roles: ["super_admin", "member"] },
    };
    const token = `header.${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "")}.signature`;

    expect(auth.parseAuthIdentity(token)).toEqual({
      userId: "user-123",
      email: "admin@example.com",
      name: "Ana Admin",
      roles: ["super_admin", "member"],
    });
  });
});

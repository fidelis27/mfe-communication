import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "./types";

export type AuthConfig = {
  url: string;
  anonKey: string;
};

let client: SupabaseClient | undefined;
let initialization: Promise<boolean> | undefined;
let currentSession: Session | null = null;

type AuthBridge = {
  accessToken: () => Promise<string | undefined>;
};

type GlobalAuthState = typeof globalThis & {
  __secretariaSupabaseAuthBridge?: AuthBridge;
};

function globalAuthBridge(): AuthBridge | undefined {
  return (globalThis as GlobalAuthState).__secretariaSupabaseAuthBridge;
}

export function initializeAuth(config: AuthConfig): Promise<boolean> {
  if (!config.url || !config.anonKey) {
    return Promise.reject(new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required"));
  }

  if (!client) {
    const existingBridge = globalAuthBridge();
    if (existingBridge) return existingBridge.accessToken().then(Boolean);

    client = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
    client.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
    });
    (globalThis as GlobalAuthState).__secretariaSupabaseAuthBridge = {
      accessToken: readLocalAccessToken,
    };
  }

  initialization ??= client.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      currentSession = data.session;
      return Boolean(currentSession);
    })
    .catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });

  return initialization;
}

export function isAuthenticated(): boolean {
  return Boolean(currentSession);
}

export function subscribeToAuthState(callback: (authenticated: boolean) => void): () => void {
  if (!client) throw new Error("Supabase auth has not been initialized");
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    callback(Boolean(session));
  });
  return () => data.subscription.unsubscribe();
}

export async function accessToken(): Promise<string | undefined> {
  if (!client) return globalAuthBridge()?.accessToken();
  return readLocalAccessToken();
}

export async function readAuthIdentity(): Promise<AuthIdentity | null> {
  const token = await accessToken();
  return token ? parseAuthIdentity(token) : null;
}

async function readLocalAccessToken(): Promise<string | undefined> {
  if (!client) return undefined;
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  currentSession = data.session;
  return data.session?.access_token;
}

export async function login(email: string, password: string): Promise<void> {
  if (!client) throw new Error("Supabase auth has not been initialized");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Login did not establish an authenticated session");
  currentSession = data.session;
}

export async function logout(): Promise<void> {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
  currentSession = null;
}

export function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = normalizeHeaders(init.headers);
  removeHeader(headers, "x-demo-user");

  if (!client && !globalAuthBridge()) return fetch(input, { ...init, headers });

  return accessToken().then((token) => {
    removeHeader(headers, "authorization");
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(input, { ...init, headers });
  });
}

export async function authenticatedWebSocket(url: string): Promise<WebSocket> {
  const token = await accessToken();
  if (!token) throw new Error("User is not authenticated");
  return new WebSocket(url, [`bearer.${token}`]);
}

function normalizeHeaders(source: HeadersInit | undefined): Record<string, string> {
  if (source instanceof Headers) return Object.fromEntries(source.entries());
  if (Array.isArray(source)) return Object.fromEntries(source);
  return { ...(source ?? {}) };
}

function removeHeader(headers: Record<string, string>, name: string): void {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) delete headers[key];
  }
}

export function parseAuthIdentity(token: string): AuthIdentity | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const decoded = JSON.parse(decodeJwtPart(payload)) as {
      sub?: string;
      email?: string;
      user_metadata?: { name?: string; full_name?: string };
      app_metadata?: { roles?: unknown };
    };
    const roles = Array.isArray(decoded.app_metadata?.roles)
      ? decoded.app_metadata.roles.filter((role): role is string => typeof role === "string")
      : [];

    if (!decoded.sub) return null;

    return {
      userId: decoded.sub,
      email: decoded.email ?? null,
      name: decoded.user_metadata?.name ?? decoded.user_metadata?.full_name ?? null,
      roles,
    };
  } catch {
    return null;
  }
}

function decodeJwtPart(part: string): string {
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

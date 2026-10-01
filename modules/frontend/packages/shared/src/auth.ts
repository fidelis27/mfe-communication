import Keycloak, { type KeycloakConfig } from "keycloak-js";

export type AuthConfig = KeycloakConfig & {
  onLoad?: "check-sso" | "login-required";
  silentCheckSsoRedirectUri?: string;
};

let client: Keycloak | undefined;
let initialization: Promise<boolean> | undefined;

export function initializeAuth(config: AuthConfig): Promise<boolean> {
  if (!client) {
    const { onLoad = "check-sso", silentCheckSsoRedirectUri, ...keycloakConfig } = config;
    client = new Keycloak(keycloakConfig);
    initialization = client.init({
      onLoad,
      pkceMethod: "S256",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri,
    });
  }
  return initialization ?? Promise.resolve(Boolean(client.authenticated));
}

export function isAuthenticated(): boolean {
  return Boolean(client?.authenticated);
}

export async function accessToken(): Promise<string | undefined> {
  if (!client?.authenticated) return undefined;
  try {
    await client.updateToken(30);
  } catch {
    await client.login();
    return undefined;
  }
  return client.token;
}

export async function login(): Promise<void> {
  if (!client) throw new Error("Keycloak has not been initialized");
  await client.login();
}

export async function logout(): Promise<void> {
  if (!client) return;
  await client.logout({ redirectUri: window.location.origin });
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  if (!client?.authenticated) {
    const headers = { ...(init.headers as Record<string, string> | undefined) };
    delete headers["x-demo-user"];
    return fetch(input, { ...init, headers });
  }

  const token = await accessToken();
  const headers = { ...(init.headers as Record<string, string> | undefined) };
  if (token) headers.Authorization = `Bearer ${token}`;
  delete headers["x-demo-user"];
  return fetch(input, { ...init, headers });
}

export async function authenticatedWebSocket(url: string): Promise<WebSocket> {
  const token = await accessToken();
  if (!token || !client?.authenticated) {
    throw new Error("User is not authenticated");
  }

  return new WebSocket(url, [`bearer.${token}`]);
}
import type { Plugin } from "vite";

const REMOTE_URLS = [
  "VITE_MFE_STUDENT_URL",
  "VITE_MFE_INSTITUTION_URL",
  "VITE_MFE_ACTIVITY_URL",
  "VITE_MFE_DASHBOARD_URL",
  "VITE_MFE_ADMIN_URL",
] as const;

function getOrigin(name: string, value: string | undefined, allowUsername = false): URL {
  if (!value) {
    throw new Error(`Content Security Policy requires ${name} to be configured.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Content Security Policy requires ${name} to be a valid URL.`);
  }

  const isLocalHttp =
    url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    (!isLocalHttp && url.protocol !== "https:") ||
    (url.username && !allowUsername) ||
    url.password
  ) {
    throw new Error(
      `Content Security Policy requires ${name} to use HTTPS (HTTP is allowed for localhost E2E).`,
    );
  }

  return url;
}

function websocketOrigin(url: URL): string {
  return url.origin.replace(/^http/, "ws");
}

export function buildContentSecurityPolicy(env: Record<string, string | undefined>): string {
  const remoteOrigins = REMOTE_URLS.map((name) => getOrigin(name, env[name]).origin);
  const apiUrl = getOrigin("VITE_API_URL", env.VITE_API_URL);
  const supabaseUrl = getOrigin("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL);
  const sentryOrigin = env.VITE_SENTRY_DSN
    ? getOrigin("VITE_SENTRY_DSN", env.VITE_SENTRY_DSN, true).origin
    : undefined;
  const connectSources = new Set([
    "'self'",
    apiUrl.origin,
    websocketOrigin(apiUrl),
    supabaseUrl.origin,
    websocketOrigin(supabaseUrl),
    ...(sentryOrigin ? [sentryOrigin] : []),
  ]);
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(remoteOrigins)].join(" ")}`,
    `connect-src ${[...connectSources].join(" ")}`,
    `style-src 'self' ${[...new Set(remoteOrigins)].join(" ")}`,
    "img-src 'self' data:",
    `font-src 'self' ${[...new Set(remoteOrigins)].join(" ")}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  return directives.join("; ");
}

export function contentSecurityPolicyPlugin(env: Record<string, string | undefined>): Plugin {
  return {
    name: "host-content-security-policy",
    apply: "build",
    transformIndexHtml() {
      const content = buildContentSecurityPolicy(env);
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content,
          },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContentSecurityPolicy, contentSecurityPolicyPlugin } from "../securityHeaders";

const env = {
  VITE_API_URL: "https://api.example.test/v1",
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_MFE_STUDENT_URL: "https://student.example.test",
  VITE_MFE_INSTITUTION_URL: "https://institution.example.test",
  VITE_MFE_ACTIVITY_URL: "https://activity.example.test",
  VITE_MFE_DASHBOARD_URL: "https://dashboard.example.test",
  VITE_MFE_ADMIN_URL: "https://admin.example.test",
};

describe("host Content Security Policy", () => {
  it("allows the configured remote, API, Supabase, and Sentry origins", () => {
    const policy = buildContentSecurityPolicy({
      ...env,
      VITE_MFE_STUDENT_URL: "https://student.example.test/app",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
    });

    expect(policy).toContain(
      "script-src 'self' https://student.example.test https://institution.example.test https://activity.example.test https://dashboard.example.test https://admin.example.test",
    );
    expect(policy).toContain(
      "connect-src 'self' https://api.example.test wss://api.example.test https://project.supabase.co wss://project.supabase.co https://example.ingest.sentry.io",
    );
    expect(policy).toContain(
      "style-src 'self' https://student.example.test https://institution.example.test https://activity.example.test https://dashboard.example.test https://admin.example.test",
    );
    expect(policy).toContain("img-src 'self' data:");
    expect(policy).toContain(
      "font-src 'self' https://student.example.test https://institution.example.test https://activity.example.test https://dashboard.example.test https://admin.example.test",
    );
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it("fails with the name of a missing required environment variable", () => {
    const missingAdmin: Record<string, string | undefined> = { ...env };
    delete missingAdmin.VITE_MFE_ADMIN_URL;

    expect(() => buildContentSecurityPolicy(missingAdmin)).toThrow(
      "Content Security Policy requires VITE_MFE_ADMIN_URL to be configured.",
    );
  });

  it("only applies the policy to production builds", () => {
    expect(contentSecurityPolicyPlugin(env).apply).toBe("build");
  });

  it("configures the required security headers on the host and all remotes", () => {
    const host = JSON.parse(
      readFileSync(resolve("modules/frontend/packages/host/vercel.json"), "utf8"),
    ) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
    const hostHeaders = host.headers.flatMap((rule) => rule.headers);
    expect(hostHeaders).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ]),
    );
    expect(hostHeaders.map(({ key }) => key)).not.toContain("X-XSS-Protection");
    expect(hostHeaders.map(({ key }) => key)).not.toContain("Access-Control-Allow-Origin");

    for (const remote of ["student", "institution", "activity", "dashboard", "admin"]) {
      const config = JSON.parse(
        readFileSync(resolve(`modules/frontend/packages/mfe-${remote}/vercel.json`), "utf8"),
      ) as { headers: { headers: { key: string; value: string }[] }[] };
      expect(config.headers.flatMap((rule) => rule.headers)).toEqual([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      ]);
    }
  });
});

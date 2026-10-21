import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Source maps are only generated and uploaded when SENTRY_AUTH_TOKEN is set (CI / production builds).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryPlugins = sentryAuthToken
  ? [
      sentryVitePlugin({
        org: "fidelis",
        project: "mfe-dashboard",
        authToken: sentryAuthToken,
        release: { name: process.env.VITE_SENTRY_RELEASE },
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
      }),
    ]
  : [];

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mfe_dashboard",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/Root.tsx" },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "@mfe/shared": { singleton: true },
      },
    }),
    ...sentryPlugins,
  ],
  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: false,
    sourcemap: sentryAuthToken ? "hidden" : false,
  },
});

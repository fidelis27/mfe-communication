import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mfe_dashboard",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "@mfe/shared": { singleton: true },
      },
    }),
  ],
  build: { target: "esnext", modulePreload: false, cssCodeSplit: false },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "host",
      remotes: {
        mfe_student: "http://localhost:4173/assets/remoteEntry.js",
        mfe_activity: "http://localhost:4176/assets/remoteEntry.js",
        mfe_institution: "http://localhost:4175/assets/remoteEntry.js",
        mfe_dashboard: "http://localhost:4178/assets/remoteEntry.js",
        mfe_admin: "http://localhost:4179/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: { target: "esnext", modulePreload: false, cssCodeSplit: false },
});

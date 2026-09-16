import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const remoteUrl = (name: string, fallback: string) =>
    `${env[name] ?? fallback}/assets/remoteEntry.js`;

  return {
    plugins: [
      react(),
      federation({
        name: "host",
        remotes: {
          mfe_student: remoteUrl("VITE_MFE_STUDENT_URL", "http://localhost:4173"),
          mfe_activity: remoteUrl("VITE_MFE_ACTIVITY_URL", "http://localhost:4176"),
          mfe_institution: remoteUrl("VITE_MFE_INSTITUTION_URL", "http://localhost:4175"),
          mfe_dashboard: remoteUrl("VITE_MFE_DASHBOARD_URL", "http://localhost:4178"),
          mfe_admin: remoteUrl("VITE_MFE_ADMIN_URL", "http://localhost:4179"),
        },
        shared: ["react", "react-dom"],
      }),
    ],
    build: { target: "esnext", modulePreload: false, cssCodeSplit: false },
  };
});

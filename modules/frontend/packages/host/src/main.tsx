import React from "react";
import { createRoot } from "react-dom/client";
import { initHostSentry } from "@mfe/shared";
import App from "./App";

initHostSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { createMfeSentry } from "@mfe/shared";
import App from "./App";

const { withMfeSentry } = createMfeSentry({
  name: "mfe-admin",
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
});

export default withMfeSentry(App);

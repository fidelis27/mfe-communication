import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMfeSentry } from "@mfe/shared";
import App from "./App";

const { withMfeSentry } = createMfeSentry({
  name: "mfe-activity",
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
});

const SentryApp = withMfeSentry(App);
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <SentryApp />
    </QueryClientProvider>
  );
}

import * as Sentry from "@sentry/react";
import {
  Component,
  createElement,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";

export type SentryOptions = {
  /** Public DSN of the Sentry project. When empty, Sentry stays disabled (no-op). */
  dsn?: string;
  environment?: string;
  release?: string;
};

const REPORTED = Symbol.for("mfe.sentry.reported");

function markReported(error: unknown) {
  if (typeof error === "object" && error !== null) {
    (error as Record<symbol, unknown>)[REPORTED] = true;
  }
}

function wasReported(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<symbol, unknown>)[REPORTED] === true
  );
}

/**
 * Initializes the global Sentry client. Only the host calls this; each MFE reports to
 * its own project through `createMfeSentry`, which never touches the global client.
 */
export function initHostSentry({ dsn, environment, release }: SentryOptions) {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: environment === "production" ? 0.2 : 1.0,
  });
  return true;
}

/** Reports an error caught by the host, unless an MFE already reported it to its own project. */
export function captureHostError(
  error: unknown,
  context?: { moduleName?: string; componentStack?: string },
) {
  if (wasReported(error)) return;
  Sentry.captureException(error, {
    tags: context?.moduleName ? { mfe: context.moduleName } : undefined,
    contexts: context?.componentStack
      ? { react: { componentStack: context.componentStack } }
      : undefined,
  });
}

type MfeBoundaryProps = { report: (error: unknown, info: ErrorInfo) => void; children?: ReactNode };
type MfeBoundaryState = { error: unknown; phase: "ok" | "caught" | "rethrow" };

/**
 * Reports to the MFE project, then rethrows so the host's RemoteBoundary still shows its
 * fallback UI. The rethrow must happen on a later render: throwing straight away would skip
 * componentDidCatch (it only runs once the boundary commits), and nothing would be reported.
 */
class MfeBoundary extends Component<MfeBoundaryProps, MfeBoundaryState> {
  state: MfeBoundaryState = { error: null, phase: "ok" };

  static getDerivedStateFromError(error: unknown): MfeBoundaryState {
    return { error, phase: "caught" };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.report(error, info);
    this.setState({ phase: "rethrow" });
  }

  render() {
    if (this.state.phase === "rethrow") throw this.state.error;
    if (this.state.phase === "caught") return null;
    return this.props.children;
  }
}

/**
 * Creates an isolated Sentry client for one MFE, so its errors land in its own project
 * even when it runs inside the host (which owns the global client).
 */
export function createMfeSentry({
  name,
  dsn,
  environment,
  release,
}: SentryOptions & { name: string }) {
  let scope: Sentry.Scope | undefined;

  if (dsn) {
    const client = new Sentry.BrowserClient({
      dsn,
      environment,
      release,
      transport: Sentry.makeFetchTransport,
      stackParser: Sentry.defaultStackParser,
      // Global handlers and breadcrumbs belong to the host's client; keep the rest.
      integrations: Sentry.getDefaultIntegrations({}).filter(
        (integration) =>
          !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(integration.name),
      ),
    });
    scope = new Sentry.Scope();
    scope.setClient(client);
    scope.setTag("mfe", name);
    client.init();
  }

  function capture(error: unknown, info?: ErrorInfo) {
    markReported(error);
    scope?.captureException(error, {
      captureContext: info?.componentStack
        ? { contexts: { react: { componentStack: info.componentStack } } }
        : undefined,
    });
  }

  function withMfeSentry<P extends object>(Wrapped: ComponentType<P>): ComponentType<P> {
    const WithSentry = (props: P) =>
      createElement(MfeBoundary, { report: capture }, createElement(Wrapped, props));
    WithSentry.displayName = `WithSentry(${Wrapped.displayName ?? Wrapped.name ?? name})`;
    return WithSentry;
  }

  return { capture, withMfeSentry };
}

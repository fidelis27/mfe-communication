import { render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { captureHostError, createMfeSentry, initHostSentry } from "./sentry";

const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/react")>()),
  captureException: sentry.captureException,
}));

class Catcher extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <p>host fallback</p> : this.props.children;
  }
}

function Boom(): never {
  throw new Error("boom");
}

describe("sentry helpers", () => {
  it("stays disabled without a DSN", () => {
    expect(initHostSentry({})).toBe(false);
  });

  it("renders the wrapped MFE untouched when there is no DSN", () => {
    const { withMfeSentry } = createMfeSentry({ name: "mfe-test" });
    const Wrapped = withMfeSentry(() => <p>mfe content</p>);
    render(<Wrapped />);
    expect(screen.getByText("mfe content")).toBeInTheDocument();
  });

  it("rethrows MFE errors to the host boundary and prevents a duplicate host report", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { withMfeSentry } = createMfeSentry({ name: "mfe-test" });
    const Wrapped = withMfeSentry(Boom);

    let caught: unknown;
    class Spy extends Catcher {
      componentDidCatch(error: unknown) {
        caught = error;
      }
    }
    render(
      <Spy>
        <Wrapped />
      </Spy>,
    );

    expect(screen.getByText("host fallback")).toBeInTheDocument();
    captureHostError(caught, { moduleName: "Test" });
    expect(sentry.captureException).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("reports host-level errors that no MFE reported", () => {
    captureHostError(new Error("chunk load failed"), { moduleName: "Estudantes" });
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { mfe: "Estudantes" } }),
    );
  });
});

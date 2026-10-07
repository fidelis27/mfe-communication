import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

expect.extend(toHaveNoViolations);

type ViewState = "loading" | "empty" | "error" | "filled";

function setupFetch(state: ViewState) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      if (state === "loading") return new Promise<Response>(() => {});
      const url = String(input);
      const body =
        state !== "filled"
          ? []
          : url.endsWith("/institutions")
            ? [{ id: "institution-1", status: "active" }]
            : url.endsWith("/students")
              ? [{ id: "student-1", status: "active" }]
              : [{ id: "enrollment-1", status: "active" }];
      return Promise.resolve(
        new Response(JSON.stringify(state === "error" ? {} : body), {
          status: state === "error" ? 500 : 200,
        }),
      );
    }),
  );
}

describe("Dashboard accessibility states", () => {
  beforeEach(() => Reflect.set(globalThis, "__mfeHostReady", true));
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
  });

  it.each(["loading", "empty", "error", "filled"] as const)(
    "has no detectable axe violations in the %s state",
    async (state) => {
      setupFetch(state);
      const { container } = render(<App />);

      if (state === "loading") {
        expect(screen.getByText("Carregando indicadores autorizados...")).toBeInTheDocument();
      } else if (state === "error") {
        await waitFor(() =>
          expect(screen.getByText("Não foi possível atualizar")).toBeInTheDocument(),
        );
      } else {
        await waitFor(() => expect(screen.getByText("Dados em movimento")).toBeInTheDocument());
        const metrics = container.querySelector(".metrics");
        if (!metrics) throw new Error("Dashboard metrics were not rendered");
        expect(metrics).toHaveTextContent(state === "empty" ? "0" : "1");
      }

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

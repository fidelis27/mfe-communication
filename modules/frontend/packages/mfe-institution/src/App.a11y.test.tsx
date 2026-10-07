import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

expect.extend(toHaveNoViolations);

type ViewState = "loading" | "empty" | "error" | "filled";

function setupFetch(state: ViewState) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      if (state === "loading") return new Promise<Response>(() => {});
      const body =
        state === "filled"
          ? [{ id: "institution-1", name: "Instituição Demo", status: "active" }]
          : [];
      return Promise.resolve(
        new Response(JSON.stringify(state === "error" ? { error: "Falha" } : body), {
          status: state === "error" ? 500 : 200,
        }),
      );
    }),
  );
}

describe("Institution accessibility states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["loading", "empty", "error", "filled"] as const)(
    "has no detectable axe violations in the %s state",
    async (state) => {
      setupFetch(state);
      const { container } = render(<App />);

      if (state === "loading") {
        expect(screen.getByText("Carregando instituições...")).toBeInTheDocument();
      } else if (state === "empty") {
        await waitFor(() =>
          expect(screen.getByText("Nenhuma instituição cadastrada.")).toBeInTheDocument(),
        );
      } else if (state === "error") {
        await waitFor(() =>
          expect(
            screen.getAllByText("Não foi possível carregar as instituições."),
          ).not.toHaveLength(0),
        );
      } else {
        await waitFor(() => expect(screen.getByText("Instituição Demo")).toBeInTheDocument());
      }

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

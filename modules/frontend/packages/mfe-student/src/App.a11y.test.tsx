import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

expect.extend(toHaveNoViolations);

type ViewState = "loading" | "empty" | "error" | "filled";

function setupFetch(state: ViewState) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      if (state === "loading") return new Promise<Response>(() => {});
      const url = String(input);
      if (state === "error") {
        return Promise.resolve(new Response(JSON.stringify({ error: "Falha" }), { status: 500 }));
      }
      const body =
        state === "empty"
          ? []
          : url.endsWith("/institutions")
            ? [{ id: "institution-1", name: "Instituição Demo", status: "active" }]
            : [
                {
                  id: "student-1",
                  name: "Estudante Demo",
                  institutionId: "institution-1",
                  status: "active",
                },
              ];
      return Promise.resolve(new Response(JSON.stringify(body)));
    }),
  );
}

describe("Student accessibility states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["loading", "empty", "error", "filled"] as const)(
    "has no detectable axe violations in the %s state",
    async (state) => {
      setupFetch(state);
      const { container } = render(<App />);

      if (state === "loading") {
        expect(screen.getByText("Carregando estudantes...")).toBeInTheDocument();
      } else if (state === "empty") {
        await waitFor(() =>
          expect(screen.getByText("Nenhum estudante cadastrado ainda.")).toBeInTheDocument(),
        );
      } else if (state === "error") {
        await waitFor(() =>
          expect(screen.getAllByText("Não foi possível carregar os estudantes.")).not.toHaveLength(
            0,
          ),
        );
      } else {
        await waitFor(() => expect(screen.getByText("Estudante Demo")).toBeInTheDocument());
      }

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

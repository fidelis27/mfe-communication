import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
          ? [
              {
                eventId: "event-1",
                type: "STUDENT_CREATED",
                version: 1,
                source: "test",
                correlationId: "test",
                occurredAt: "2026-01-01T00:00:00.000Z",
                payload: { id: "student-1", name: "Estudante Demo" },
              },
            ]
          : [];
      return Promise.resolve(
        new Response(JSON.stringify(state === "error" ? {} : body), {
          status: state === "error" ? 500 : 200,
        }),
      );
    }),
  );
}

describe("Activity accessibility states", () => {
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
        expect(screen.getByText("Carregando histórico de atividade...")).toBeInTheDocument();
      } else if (state === "empty") {
        await waitFor(() =>
          expect(screen.getByText("Aguardando uma alteração no sistema.")).toBeInTheDocument(),
        );
      } else if (state === "error") {
        await waitFor(() =>
          expect(screen.getByText("Não foi possível carregar o histórico.")).toBeInTheDocument(),
        );
      } else {
        await waitFor(() => expect(screen.getByText("Estudante cadastrado")).toBeInTheDocument());
      }

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

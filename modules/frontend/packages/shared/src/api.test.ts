import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({ authenticatedFetch: vi.fn() }));

vi.mock("./auth", () => mocks);

import { requestJson, requestVoid } from "./api";

const responseSchema = z.object({ id: z.string() });

describe("shared API requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a successful response against its schema", async () => {
    mocks.authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "student-1" }), { status: 200 }),
    );

    await expect(requestJson("/students", responseSchema)).resolves.toEqual({ id: "student-1" });
  });

  it("normalizes non-2xx responses and preserves backend error messages", async () => {
    mocks.authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "E-mail já cadastrado." }), { status: 409 }),
    );

    await expect(
      requestJson("/users", responseSchema, {}, "Falha ao criar pessoa."),
    ).rejects.toMatchObject({
      name: "ApiError",
      kind: "http",
      status: 409,
      backendMessage: "E-mail já cadastrado.",
      message: "E-mail já cadastrado.",
    });
  });

  it("maps authorization failures to a friendly message", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response("{}", { status: 403 }));

    await expect(requestVoid("/groups", {}, "Falha ao atualizar grupo.")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Você não tem permissão para realizar esta ação.",
    });
  });

  it("reports invalid JSON responses", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(requestJson("/students", responseSchema)).rejects.toMatchObject({
      name: "ApiError",
      kind: "invalid_json",
      status: 200,
    });
  });

  it("reports responses that do not match the endpoint schema", async () => {
    mocks.authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 123 }), { status: 200 }),
    );

    await expect(requestJson("/students", responseSchema)).rejects.toMatchObject({
      name: "ApiError",
      kind: "invalid_response",
      status: 200,
    });
  });

  it("preserves aborted requests without wrapping them", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mocks.authenticatedFetch.mockRejectedValue(abortError);

    await expect(requestJson("/students", responseSchema)).rejects.toBe(abortError);
  });

  it("normalizes network errors with the endpoint fallback", async () => {
    mocks.authenticatedFetch.mockRejectedValue(new Error("network unavailable"));

    await expect(
      requestJson("/students", responseSchema, {}, "Não foi possível carregar estudantes."),
    ).rejects.toMatchObject({
      name: "ApiError",
      kind: "network",
      message: "Não foi possível carregar estudantes.",
    });
  });

  it("accepts successful no-content mutations", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(requestVoid("/students", { method: "POST" })).resolves.toBeUndefined();
  });
});

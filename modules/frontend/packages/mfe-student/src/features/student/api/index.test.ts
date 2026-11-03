import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudent, getInstitutions, getStudents } from "./index";

describe("student feature API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads validated institutions and students and submits a student", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/institutions")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "inst-1", name: "Escola", status: "active" }])),
        );
      }
      if (url.endsWith("/students") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "student-2",
              name: "Ana",
              institutionId: "inst-1",
              status: "active",
            }),
            { status: 201 },
          ),
        );
      }
      if (url.endsWith("/students")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: "student-1", name: "Ana", institutionId: "inst-1", status: "active" },
            ]),
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getInstitutions("https://api.test")).resolves.toHaveLength(1);
    await expect(getStudents("https://api.test")).resolves.toMatchObject([{ id: "student-1" }]);
    await expect(
      createStudent("https://api.test", { name: "Ana", institutionId: "inst-1" }),
    ).resolves.toMatchObject({ id: "student-2" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.test/students",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Ana", institutionId: "inst-1" }),
      }),
    );
  });
});

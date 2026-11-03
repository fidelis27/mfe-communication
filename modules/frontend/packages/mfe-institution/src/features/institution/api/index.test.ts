import { afterEach, describe, expect, it, vi } from "vitest";
import { createInstitution, getInstitutions } from "./index";

describe("institution feature API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads validated institutions and creates one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "inst-1", name: "Escola", status: "active" }])),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "inst-2", name: "Escola", cnpj: "", status: "active" }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getInstitutions("https://api.test")).resolves.toMatchObject([
      { id: "inst-1", name: "Escola" },
    ]);
    await expect(
      createInstitution("https://api.test", { name: "Escola", cnpj: "" }),
    ).resolves.toMatchObject({ id: "inst-2" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.test/institutions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Escola", cnpj: "" }),
      }),
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "./index";

describe("dashboard feature API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads and validates all dashboard resources", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const resource = url.substring(url.lastIndexOf("/") + 1);
      const bodies: Record<string, unknown[]> = {
        institutions: [{ id: "inst-1", status: "active" }],
        students: [{ id: "student-1", status: "active" }],
        enrollments: [{ id: "enrollment-1", status: "suspended" }],
      };
      return Promise.resolve(new Response(JSON.stringify(bodies[resource])));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDashboardData("https://api.test")).resolves.toEqual({
      institutions: [{ id: "inst-1", status: "active" }],
      students: [{ id: "student-1", status: "active" }],
      enrollments: [{ id: "enrollment-1", status: "suspended" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

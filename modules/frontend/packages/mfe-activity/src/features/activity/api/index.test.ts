import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventHistory } from "./index";

describe("activity feature API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads event history using the requested limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getEventHistory("https://api.test", 15)).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/events/history?limit=15",
      expect.objectContaining({ signal: undefined }),
    );
  });
});

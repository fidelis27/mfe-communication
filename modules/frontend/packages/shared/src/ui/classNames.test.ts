import { describe, expect, it } from "vitest";
import { cx } from "./classNames";

describe("cx", () => {
  const styles = { active: "active_hash", button: "button_hash" };

  it("maps multiple local classes and ignores false values", () => {
    expect(cx(styles, "button", false, "active")).toBe("button_hash active_hash");
  });

  it("reports classes missing from the module", () => {
    expect(() => cx(styles, "missing")).toThrow("Unknown CSS Module class: missing");
  });
});

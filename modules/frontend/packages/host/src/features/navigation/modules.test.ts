import { describe, expect, it } from "vitest";
import { moduleFromPath, moduleLabel, modules } from "./modules";

describe("host navigation modules", () => {
  it("maps configured paths to modules and unknown paths to the preparation state", () => {
    for (const module of modules) {
      expect(moduleFromPath(module.path)).toBe(module.id);
      expect(moduleLabel(module.id)).toBe(module.label);
    }

    expect(moduleFromPath("/unknown")).toBe("preparing");
    expect(moduleLabel("unknown")).toBe("Módulo em preparação");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkDocs } from "./check-docs.mjs";

let rootDir: string;

function write(relativePath: string, content: string): void {
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function addIndexLinks(...links: string[]): void {
  const indexPath = path.join(rootDir, "docs/README.md");
  fs.appendFileSync(indexPath, `\n${links.map((link) => `- [${link}](${link})`).join("\n")}\n`);
}

function check() {
  return checkDocs(rootDir);
}

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "check-docs-"));
  write("docs/README.md", "# Documentation\n\n- [Guide](./guide.md)\n");
  write("docs/guide.md", "# Guide\n\nGuide content.\n");
});

afterEach(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

describe("checkDocs", () => {
  it("accepts a valid index and linked document", () => {
    expect(check().errors).toEqual([]);
  });

  it("ignores generated Playwright report Markdown", () => {
    write("playwright-report/data/report.md", "# Generated report\n");
    write("test-results/case/error-context.md", "# Generated report\n");
    expect(check().errors).toEqual([]);
  });

  it("accepts GitHub's required pull-request template filename", () => {
    write(".github/PULL_REQUEST_TEMPLATE.md", "# Pull request\n");
    expect(check().errors).toEqual([]);
  });

  it("fails when an active document is not indexed", () => {
    write("docs/orphan.md", "# Orphan\n");
    expect(check().errors.join("\n")).toContain("not reachable from docs/README.md");
  });

  it("fails when an active document appears more than once in the index", () => {
    addIndexLinks("./guide.md");
    expect(check().errors.join("\n")).toContain("appears more than once in docs/README.md");
  });

  it("fails on missing relative targets and anchors", () => {
    write(
      "docs/guide.md",
      "# Guide\n\n[Missing](./missing.md) and [anchor](./README.md#absent).\n",
    );
    const errors = check().errors.join("\n");
    expect(errors).toContain("target does not exist");
    expect(errors).toContain('anchor "#absent" does not exist');
  });

  it("fails filenames outside lowercase ASCII kebab case", () => {
    write("docs/Bad_file.md", "# Bad file\n");
    addIndexLinks("./Bad_file.md");
    expect(check().errors.join("\n")).toContain("filename must use lowercase ASCII kebab-case");
  });

  it("fails gaps in ADR numbering", () => {
    write("docs/adr/0001-first.md", "# ADR One\n");
    write("docs/adr/0003-third.md", "# ADR Three\n");
    addIndexLinks("./adr/0001-first.md", "./adr/0003-third.md");
    expect(check().errors.join("\n")).toContain("missing ADR number 0002");
  });

  it("fails duplicate ADR numbers", () => {
    write("docs/adr/0001-first.md", "# ADR One\n");
    write("docs/adr/nested/0001-second.md", "# ADR Second\n");
    addIndexLinks("./adr/0001-first.md", "./adr/nested/0001-second.md");
    expect(check().errors.join("\n")).toContain("ADR number 0001 duplicates");
  });

  it("fails documents without an H1 title", () => {
    write("docs/guide.md", "A document without a title.\n");
    expect(check().errors.join("\n")).toContain("document must have an H1 title");
  });

  it("fails duplicate H1 titles", () => {
    write("docs/another-guide.md", "# Guide\n");
    addIndexLinks("./another-guide.md");
    expect(check().errors.join("\n")).toContain('H1 duplicates "docs/another-guide.md"');
  });

  it("fails unapproved root-level Markdown files", () => {
    write("NOTES.md", "# Notes\n");
    expect(check().errors.join("\n")).toContain("root-level Markdown file is not on the allowlist");
  });

  it("fails archive files without a top notice", () => {
    write("docs/archive/old-plan.md", "# Old plan\n");
    addIndexLinks("./archive/old-plan.md");
    expect(check().errors.join("\n")).toContain('archive notice must include "Archived"');
  });

  it("fails active documents that link directly to archived files", () => {
    write(
      "docs/archive/old-plan.md",
      "> Archived (2026-01-01): old. Not maintained.\n\n# Old plan\n",
    );
    write("docs/guide.md", "# Guide\n\n[Old plan](./archive/old-plan.md).\n");
    addIndexLinks("./archive/old-plan.md");
    expect(check().errors.join("\n")).toContain(
      "archived documents must be linked through docs/README.md",
    );
  });

  it("warns but does not fail when a document exceeds 400 lines", () => {
    write("docs/guide.md", `# Guide\n${"content\n".repeat(400)}`);
    const result = check();
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toContain("over 400");
  });

  it("accepts archived notices, contiguous ADRs, and frozen PERF task identifiers", () => {
    write(
      "docs/archive/old-plan.md",
      "> Archived (2026-01-01): old. Not maintained.\n\n# Old plan\n",
    );
    write("docs/adr/0001-first.md", "# ADR One\n");
    write("docs/adr/0002-second.md", "# ADR Two\n");
    write("docs/performance-tasks/PERF-002-shared-domain-events.md", "# PERF Two\n");
    addIndexLinks(
      "./archive/old-plan.md",
      "./adr/0001-first.md",
      "./adr/0002-second.md",
      "./performance-tasks/PERF-002-shared-domain-events.md",
    );
    expect(check().errors).toEqual([]);
  });

  it("requires ADRs to be linked from an ADR index when it exists", () => {
    write("docs/adr/README.md", "# Decisions\n");
    write("docs/adr/0001-first.md", "# ADR One\n");
    addIndexLinks("./adr/README.md", "./adr/0001-first.md");
    expect(check().errors.join("\n")).toContain("must be listed in docs/adr/README.md");
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_MARKDOWN_ALLOWLIST = new Set([
  "README.md",
  "CHANGELOG.md",
  "LICENSE.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const ADR_FILENAME = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const PERF_FILENAME = /^PERF-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function listMarkdownFiles(rootDir) {
  const files = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        [".git", "node_modules", "playwright-report", "test-results"].includes(entry.name)
      ) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        files.push(toPosix(path.relative(rootDir, absolutePath)));
      }
    }
  }

  visit(rootDir);
  return files.sort();
}

function stripCode(content) {
  let fence;

  return content
    .split(/\r?\n/)
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence.character &&
          marker[1].length >= fence.length &&
          /^\s*$/.test(line.slice(marker[0].length))
        ) {
          fence = undefined;
        }
        return "";
      }

      if (marker) {
        fence = { character: marker[1][0], length: marker[1].length };
        return "";
      }

      return line.replace(/(`+).*?\1/g, "");
    })
    .join("\n");
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function collectLinks(content) {
  const cleanContent = stripCode(content);
  const links = [];
  const definitions = new Map();
  const definitionPattern = /^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm;

  for (const match of cleanContent.matchAll(definitionPattern)) {
    const target = match[2] ?? match[3];
    definitions.set(match[1].trim().toLowerCase(), target);
    links.push({ target, line: lineNumberAt(cleanContent, match.index) });
  }

  const inlinePattern = /!?\[[^\]]*\]\(\s*(<[^>]+>|(?:\\.|[^)])*)\)/g;
  for (const match of cleanContent.matchAll(inlinePattern)) {
    const rawTarget = match[1].trim();
    const target = rawTarget.startsWith("<")
      ? rawTarget.slice(1, rawTarget.indexOf(">"))
      : rawTarget.split(/\s+/)[0];
    links.push({ target, line: lineNumberAt(cleanContent, match.index) });
  }

  const referencePattern = /!?\[([^\]]+)\]\[([^\]]*)\]/g;
  for (const match of cleanContent.matchAll(referencePattern)) {
    const label = (match[2] || match[1]).trim().toLowerCase();
    const target = definitions.get(label);
    if (target) {
      links.push({ target, line: lineNumberAt(cleanContent, match.index) });
    }
  }

  const htmlPattern = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  for (const match of cleanContent.matchAll(htmlPattern)) {
    links.push({
      target: match[1] ?? match[2],
      line: lineNumberAt(cleanContent, match.index),
    });
  }

  return links;
}

function headingAnchors(content) {
  const anchors = new Set();
  const counts = new Map();
  const cleanContent = stripCode(content);

  for (const match of cleanContent.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const heading = match[1]
      .replace(/<[^>]*>/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .trim();
    const base = heading
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  for (const match of cleanContent.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) {
    anchors.add(match[1]);
  }

  return anchors;
}

function normalizeLabel(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function insideRoot(rootDir, candidate) {
  const relative = path.relative(rootDir, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function checkFilename(relativePath, errors) {
  const filename = path.posix.basename(relativePath);
  const isRootFile = !relativePath.includes("/");

  if (relativePath === ".github/PULL_REQUEST_TEMPLATE.md") {
    return;
  }
  if (isRootFile && ROOT_MARKDOWN_ALLOWLIST.has(filename)) {
    return;
  }
  if (filename === "README.md") {
    return;
  }
  if (relativePath.startsWith("docs/adr/")) {
    if (!ADR_FILENAME.test(filename)) {
      errors.push(`${relativePath}: ADR filenames must use NNNN-kebab-case.md.`);
    }
    return;
  }
  // Frozen performance-task identifiers retain their established uppercase prefix.
  if (relativePath.startsWith("docs/performance-tasks/") && PERF_FILENAME.test(filename)) {
    return;
  }
  if (!KEBAB_CASE.test(filename)) {
    errors.push(`${relativePath}: filename must use lowercase ASCII kebab-case.`);
  }
}

function resolveLink(rootDir, sourcePath, target) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) {
    return { external: true };
  }

  const hashIndex = target.indexOf("#");
  const beforeHash = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : target.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf("?");
  const fileReference = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);

  let decodedPath;
  let decodedFragment;
  try {
    decodedPath = decodeURIComponent(fileReference);
    decodedFragment = decodeURIComponent(fragment);
  } catch {
    return { error: "contains an invalid percent-encoded path or anchor" };
  }

  const sourceAbsolute = path.join(rootDir, sourcePath);
  const targetAbsolute = decodedPath
    ? path.resolve(rootDir, path.dirname(sourcePath), decodedPath)
    : sourceAbsolute;

  if (!insideRoot(rootDir, targetAbsolute)) {
    return { error: "resolves outside the repository" };
  }

  const targetPath = toPosix(path.relative(rootDir, targetAbsolute));
  if (!fs.existsSync(targetAbsolute)) {
    return { error: `target does not exist: ${targetPath}` };
  }

  return {
    absolutePath: targetAbsolute,
    fragment: decodedFragment,
    path: targetPath,
    isDirectory: fs.statSync(targetAbsolute).isDirectory(),
  };
}

export function checkDocs(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const errors = [];
  const warnings = [];
  const markdownFiles = listMarkdownFiles(root);
  const contentByPath = new Map();
  const linksByPath = new Map();
  const anchorsByPath = new Map();
  const headings = new Map();

  for (const relativePath of markdownFiles) {
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    contentByPath.set(relativePath, content);
    checkFilename(relativePath, errors);

    const h1Matches = [...stripCode(content).matchAll(/^#\s+(.+?)\s*#*\s*$/gm)];
    if (h1Matches.length === 0) {
      errors.push(`${relativePath}: document must have an H1 title.`);
    } else {
      const title = normalizeLabel(h1Matches[0][1]);
      const previous = headings.get(title);
      if (previous) {
        errors.push(`${relativePath}: H1 duplicates "${previous}" (${title}).`);
      } else {
        headings.set(title, relativePath);
      }
    }

    const lineCount = content.split(/\r?\n/).length - (content.endsWith("\n") ? 1 : 0);
    if (lineCount > 400) {
      warnings.push(`${relativePath}: ${lineCount} lines (over 400).`);
    }
  }

  const adrEntries = markdownFiles.filter(
    (relativePath) =>
      relativePath.startsWith("docs/adr/") && path.posix.basename(relativePath) !== "README.md",
  );
  const adrNumbers = new Map();
  for (const relativePath of adrEntries) {
    const match = ADR_FILENAME.exec(path.posix.basename(relativePath));
    if (!match) {
      continue;
    }
    const number = Number(match[1]);
    const previous = adrNumbers.get(number);
    if (previous) {
      errors.push(`${relativePath}: ADR number ${match[1]} duplicates ${previous}.`);
    } else {
      adrNumbers.set(number, relativePath);
    }
  }
  if (adrNumbers.size > 0) {
    const largest = Math.max(...adrNumbers.keys());
    for (let number = 1; number <= largest; number += 1) {
      if (!adrNumbers.has(number)) {
        errors.push(`docs/adr/: missing ADR number ${String(number).padStart(4, "0")}.`);
      }
    }
  }

  for (const relativePath of markdownFiles) {
    const content = contentByPath.get(relativePath);
    if (relativePath.startsWith("docs/archive/")) {
      const notice = content.split(/\r?\n/).slice(0, 5).join("\n");
      if (
        !/\barchived\s*\(\d{4}-\d{2}-\d{2}\)\s*:\s*\S/i.test(notice) ||
        !/\bnot maintained\b/i.test(notice)
      ) {
        errors.push(
          `${relativePath}: archive notice must include "Archived", an ISO date, a reason, and "Not maintained" at the top.`,
        );
      }
    }

    const links = collectLinks(content).map((link) => {
      const resolved = resolveLink(root, relativePath, link.target);
      if (resolved.external) {
        return { ...link, external: true };
      }
      if (resolved.error) {
        errors.push(`${relativePath}:${link.line}: link "${link.target}" ${resolved.error}.`);
        return { ...link, invalid: true };
      }

      if (resolved.fragment && !resolved.isDirectory) {
        const targetContent = contentByPath.get(resolved.path);
        if (targetContent && /\.md$/i.test(resolved.path)) {
          const anchors = anchorsByPath.get(resolved.path) ?? headingAnchors(targetContent);
          anchorsByPath.set(resolved.path, anchors);
          if (!anchors.has(resolved.fragment)) {
            errors.push(
              `${relativePath}:${link.line}: anchor "#${resolved.fragment}" does not exist in ${resolved.path}.`,
            );
            return { ...link, ...resolved, invalid: true };
          }
        }
      }

      return { ...link, ...resolved };
    });
    linksByPath.set(relativePath, links);
  }

  const rootMarkdown = markdownFiles.filter((relativePath) => !relativePath.includes("/"));
  for (const relativePath of rootMarkdown) {
    if (!ROOT_MARKDOWN_ALLOWLIST.has(relativePath)) {
      errors.push(`${relativePath}: root-level Markdown file is not on the allowlist.`);
    }
  }

  const docsIndex = "docs/README.md";
  if (!contentByPath.has(docsIndex)) {
    errors.push(`${docsIndex}: documentation index is required.`);
  } else {
    const activeDocs = markdownFiles.filter(
      (relativePath) =>
        relativePath.startsWith("docs/") &&
        relativePath !== docsIndex &&
        !relativePath.startsWith("docs/archive/"),
    );
    const reachable = new Set([docsIndex]);
    const queue = [docsIndex];
    while (queue.length > 0) {
      const source = queue.shift();
      for (const link of linksByPath.get(source) ?? []) {
        if (
          !link.invalid &&
          !link.external &&
          link.path?.startsWith("docs/") &&
          /\.md$/i.test(link.path) &&
          contentByPath.has(link.path) &&
          !reachable.has(link.path)
        ) {
          reachable.add(link.path);
          queue.push(link.path);
        }
      }
    }

    const indexLinks = linksByPath.get(docsIndex) ?? [];
    const indexLinkCounts = new Map();
    for (const link of indexLinks) {
      if (!link.invalid && !link.external && link.path?.startsWith("docs/")) {
        indexLinkCounts.set(link.path, (indexLinkCounts.get(link.path) ?? 0) + 1);
      }
    }
    for (const relativePath of activeDocs) {
      if (!reachable.has(relativePath)) {
        errors.push(`${relativePath}: not reachable from ${docsIndex} through Markdown links.`);
      }
      const count = indexLinkCounts.get(relativePath) ?? 0;
      if (count === 0) {
        errors.push(`${relativePath}: must be linked directly from ${docsIndex}.`);
      } else if (count > 1) {
        errors.push(`${relativePath}: appears more than once in ${docsIndex}.`);
      }
    }

    for (const [sourcePath, links] of linksByPath) {
      if (sourcePath === docsIndex || sourcePath.startsWith("docs/archive/")) {
        continue;
      }
      for (const link of links) {
        if (!link.invalid && !link.external && link.path?.startsWith("docs/archive/")) {
          errors.push(
            `${sourcePath}:${link.line}: archived documents must be linked through ${docsIndex}.`,
          );
        }
      }
    }

    const archiveDocs = markdownFiles.filter((relativePath) =>
      relativePath.startsWith("docs/archive/"),
    );
    for (const relativePath of archiveDocs) {
      if ((indexLinkCounts.get(relativePath) ?? 0) !== 1) {
        errors.push(`${relativePath}: must appear once in the archive index in ${docsIndex}.`);
      }
    }

    const adrIndex = "docs/adr/README.md";
    if (contentByPath.has(adrIndex)) {
      const adrIndexLinks = new Set(
        (linksByPath.get(adrIndex) ?? [])
          .filter((link) => !link.invalid && !link.external)
          .map((link) => link.path),
      );
      for (const relativePath of adrEntries) {
        if (!adrIndexLinks.has(relativePath)) {
          errors.push(`${relativePath}: must be listed in ${adrIndex}.`);
        }
      }
    }
  }

  return { errors, warnings, markdownFileCount: markdownFiles.length };
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const result = checkDocs();
  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Documentation check passed (${result.markdownFileCount} Markdown files).`);
  }
}

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { URL, fileURLToPath } from "node:url";
import process from "node:process";

const root = fileURLToPath(new URL("..", import.meta.url));
const tokensPath = join(root, "modules", "frontend", "packages", "shared", "src", "tokens.css");
const tokenCss = await readFile(tokensPath, "utf8");
const tokens = new Map(
  [...tokenCss.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
);
const textPairs = [
  ["color-text-primary", "color-surface-page"],
  ["color-text-primary", "color-surface-card"],
  ["color-text-primary", "color-surface-muted"],
  ["color-text-secondary", "color-surface-page"],
  ["color-text-secondary", "color-surface-card"],
  ["color-text-muted", "color-surface-page"],
  ["color-text-muted", "color-surface-card"],
  ["color-text-muted", "color-surface-muted"],
  ["color-text-on-brand", "color-brand"],
  ["color-text-on-brand", "color-brand-hover"],
  ["color-text-on-brand", "color-brand-active"],
  ["color-text-on-brand", "color-danger"],
  ["color-text-on-brand", "color-danger-hover"],
  ["color-brand-soft-text", "color-brand-soft"],
  ["color-success-text", "color-success-soft"],
  ["color-warning-text", "color-warning-soft"],
  ["color-danger-text", "color-danger-soft"],
  ["color-info-text", "color-info-soft"],
  ["color-neutral-text", "color-neutral-soft"],
  ["color-sidebar-text", "color-surface-sidebar"],
  ["color-sidebar-text", "color-sidebar-active-bg"],
  ["color-sidebar-text-muted", "color-surface-sidebar"],
  ["color-sidebar-text-muted", "color-sidebar-active-bg"],
];
const controlPairs = [
  ["color-control-border", "color-surface-page"],
  ["color-control-border", "color-surface-card"],
  ["color-control-border", "color-surface-muted"],
  ["color-focus-ring", "color-surface-page"],
  ["color-focus-ring", "color-surface-card"],
  ["color-focus-ring", "color-surface-muted"],
  ["color-brand", "color-surface-card"],
  ["color-danger", "color-surface-card"],
  ["color-success", "color-surface-card"],
];
let hasErrors = false;

function luminance(tokenName) {
  const value = tokens.get(tokenName);
  const match = value?.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    throw new Error(`Token --${tokenName} is missing or is not a six-digit hex color.`);
  }

  const channels = [0, 2, 4].map(
    (offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function checkPairs(pairs, minimum, kind) {
  for (const [foreground, background] of pairs) {
    const ratio = contrastRatio(foreground, background);
    const result = `${ratio.toFixed(2)}:1`;
    process.stdout.write(`${kind}: --${foreground} / --${background} = ${result}\n`);
    if (ratio < minimum) {
      process.stderr.write(`FAIL: ${kind} contrast is below ${minimum}:1.\n`);
      hasErrors = true;
    }
  }
}

async function cssModuleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      files.push(...(await cssModuleFiles(path)));
    } else if (entry.name.endsWith(".module.css")) {
      files.push(path);
    }
  }
  return files;
}

checkPairs(textPairs, 4.5, "Text/background");
checkPairs(controlPairs, 3, "Control/border");

const cssRoot = join(root, "modules", "frontend", "packages");
for (const file of await cssModuleFiles(cssRoot)) {
  const source = await readFile(file, "utf8");
  if (/#(?:[0-9a-f]{3,8})\b|rgba?\(/i.test(source)) {
    process.stderr.write(`FAIL: fixed color found in ${file}. Move it to shared tokens.\n`);
    hasErrors = true;
  }

  for (const [, value] of source.matchAll(/box-shadow\s*:\s*([^;]+);/gi)) {
    if (!value.trim().startsWith("var(") && value.trim() !== "none") {
      process.stderr.write(`FAIL: fixed box-shadow found in ${file}. Move it to shared tokens.\n`);
      hasErrors = true;
    }
  }

  for (const [, value] of source.matchAll(/border-radius\s*:\s*([^;]+);/gi)) {
    if (/\d(?:px|rem|em|%)/i.test(value)) {
      process.stderr.write(
        `FAIL: fixed border-radius found in ${file}. Move it to shared tokens.\n`,
      );
      hasErrors = true;
    }
  }

  const spacingProperties =
    /(?:margin(?:-[\w]+)?|padding(?:-[\w]+)?|gap|row-gap|column-gap)\s*:\s*([^;]+);/gi;
  for (const [, value] of source.matchAll(spacingProperties)) {
    if (/\d(?:\.\d+)?(?:px|rem|em|vw|vh|%)/i.test(value)) {
      process.stderr.write(`FAIL: fixed spacing found in ${file}. Move it to shared tokens.\n`);
      hasErrors = true;
    }
  }
}

if (hasErrors) process.exitCode = 1;

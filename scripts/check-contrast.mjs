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
  ["color-text-secondary", "color-surface-page"],
  ["color-text-muted", "color-surface-control"],
  ["color-text-on-dark", "color-surface-dark"],
  ["color-text-on-dark-muted", "color-surface-dark"],
  ["color-text-on-dark-subtle", "color-surface-dark"],
  ["color-accent", "color-surface-page"],
  ["color-danger", "color-danger-soft"],
  ["color-sidebar-text", "color-sidebar-active"],
  ["color-sidebar-text-muted", "color-sidebar-active"],
  ["color-sidebar-text-subtle", "color-sidebar-active"],
  ["color-avatar-text", "color-avatar-bg"],
  ["color-status-warning-text", "color-status-warning-soft"],
];
const controlPairs = [
  ["color-control-border", "color-surface-control"],
  ["color-control-border-focus", "color-surface-control"],
  ["color-status-warning-border", "color-status-warning-soft"],
  ["color-event-pin-border", "color-status-active"],
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

async function appCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await appCssFiles(path)));
    } else if (entry.name === "App.css") {
      files.push(path);
    }
  }
  return files;
}

checkPairs(textPairs, 4.5, "Text/background");
checkPairs(controlPairs, 3, "Control/border");

const cssRoot = join(root, "modules", "frontend", "packages");
for (const file of await appCssFiles(cssRoot)) {
  const source = await readFile(file, "utf8");
  if (/#(?:[0-9a-f]{3,8})\b/i.test(source)) {
    process.stderr.write(`FAIL: fixed hexadecimal color found in ${file}. Move it to shared tokens.\n`);
    hasErrors = true;
  }
}

if (hasErrors) process.exitCode = 1;

import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {
  ...process.env,
  VITE_API_URL: "http://127.0.0.1:3333",
  VITE_SUPABASE_URL: "https://e2e.supabase.co",
  VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
  VITE_MFE_STUDENT_URL: "http://127.0.0.1:4274",
  VITE_MFE_INSTITUTION_URL: "http://127.0.0.1:4275",
  VITE_MFE_ACTIVITY_URL: "http://127.0.0.1:4276",
  VITE_MFE_DASHBOARD_URL: "http://127.0.0.1:4278",
  VITE_MFE_ADMIN_URL: "http://127.0.0.1:4279",
};
const workspaces = [
  ["host", 4273],
  ["mfe-student", 4274],
  ["mfe-institution", 4275],
  ["mfe-activity", 4276],
  ["mfe-dashboard", 4278],
  ["mfe-admin", 4279],
];
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const children = [];
let stopping = false;

function stopServers() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  stopServers();
  process.exitCode = 130;
});
process.on("SIGTERM", () => {
  stopServers();
  process.exitCode = 143;
});

function runBuilds() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm_execpath is required; run through npm run e2e:serve.");

  const result = spawnSync(
    process.execPath,
    [npmCli, "run", "build", "--workspaces", "--if-present"],
    { cwd: root, env, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Workspace builds failed with exit code ${result.status}.`);
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Preview server exited before becoming ready: ${url}.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Preview server did not become ready: ${url}.`);
}

try {
  runBuilds();

  for (const [workspace, port] of workspaces) {
    const child = spawn(
      process.execPath,
      [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      {
        cwd: path.join(root, "modules", "frontend", "packages", workspace),
        env,
        stdio: "inherit",
      },
    );
    children.push(child);
    child.on("error", (error) => {
      console.error(`Failed to start ${workspace} preview:`, error);
      process.exitCode = 1;
      stopServers();
    });
    child.on("exit", (code) => {
      if (!stopping && code !== 0) {
        console.error(`${workspace} preview exited with code ${code}.`);
        process.exitCode = 1;
        stopServers();
      }
    });
    const entrypoint = workspace === "host" ? "/" : "/assets/remoteEntry.js";
    await waitForServer(`http://127.0.0.1:${port}${entrypoint}`, child);
  }

  console.log("All six federation preview servers are ready.");
  await new Promise((resolve) => {
    children[0].once("exit", resolve);
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopServers();
}

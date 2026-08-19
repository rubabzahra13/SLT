#!/usr/bin/env node
/**
 * Reliable Next.js dev startup:
 * - Kills stale dev servers on ports 3000–3002 (root cause of unstyled pages)
 * - Clears corrupted webpack cache before starting
 * - Always binds to port 3000
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = 3000;
const cleanAll = process.argv.includes("--clean");

const PORTS = [3000, 3001, 3002];

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (out += d));
    child.on("close", () => resolve(out.trim()));
  });
}

async function killPort(p) {
  const out = await run("lsof", ["-ti", `:${p}`]);
  if (!out) return;
  for (const pid of out.split("\n").filter(Boolean)) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // process already exited
    }
  }
}

async function main() {
  for (const p of PORTS) {
    await killPort(p);
  }

  const nextDir = join(root, ".next");
  if (cleanAll && existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("Removed .next (clean start)");
  } else {
    const cacheDir = join(nextDir, "cache");
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
      console.log("Cleared .next/cache");
    }
  }

  console.log(`Starting dev server at http://localhost:${port}`);

  const child = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

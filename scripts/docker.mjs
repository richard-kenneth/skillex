#!/usr/bin/env node
/**
 * Small Docker CLI wrapper for the workspace scripts.
 *
 * Docker Desktop on Windows is not always on PATH, so resolve its default
 * install location before delegating to the real CLI.
 */
import { spawnSync } from "node:child_process";
import { ensureDockerOnPath } from "./lib/docker-path.mjs";

ensureDockerOnPath();

const result = spawnSync("docker", process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`Could not run Docker: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

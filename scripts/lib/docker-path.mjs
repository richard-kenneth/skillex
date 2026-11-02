import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

function dockerIsAvailable() {
  const result = spawnSync("docker", ["--version"], {
    stdio: "ignore",
    env: process.env,
  });

  return result.status === 0;
}

/**
 * Docker Desktop on Windows does not always add its CLI directory to PATH.
 * Add the default install locations when `docker` is not already resolvable, so
 * `pnpm run setup` and the `db:*` scripts work after a normal installation.
 */
export function ensureDockerOnPath() {
  if (process.platform !== "win32") return;
  if (dockerIsAvailable()) return;

  const candidates = [
    process.env.ProgramFiles &&
      join(process.env.ProgramFiles, "Docker", "Docker", "resources", "bin"),
    process.env.LOCALAPPDATA &&
      join(
        process.env.LOCALAPPDATA,
        "Programs",
        "DockerDesktop",
        "resources",
        "bin",
      ),
    process.env.ProgramData &&
      join(process.env.ProgramData, "DockerDesktop", "version-bin"),
  ].filter(
    (directory) => directory && existsSync(join(directory, "docker.exe")),
  );

  if (candidates.length === 0) return;

  const current = process.env.PATH ?? "";
  const entries = current.split(delimiter);
  const missing = candidates.filter(
    (directory) => !entries.includes(directory),
  );

  if (missing.length > 0) {
    process.env.PATH = [...missing, current].join(delimiter);
  }
}

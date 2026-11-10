#!/usr/bin/env node
/**
 * One-command local setup for SkillEx.
 *
 *   pnpm run setup
 *
 * Copies the example environment files, generates development secrets, starts
 * the Docker services, applies migrations, and seeds the demo data.
 *
 * Flags:
 *   --skip-install   Do not run `pnpm install`.
 *   --skip-docker    Do not start docker compose (services are already running).
 *   --skip-seed      Do not seed demo data.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDockerOnPath } from "./lib/docker-path.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const skipInstall = args.has("--skip-install");
const skipDocker = args.has("--skip-docker");
const skipSeed = args.has("--skip-seed");

const isWindows = process.platform === "win32";

/**
 * Host ports published by docker-compose.yml. Keep these in sync with
 * docker-compose.yml and `.env.example`.
 */
const composePortEntries = [
  {
    env: "POSTGRES_PORT",
    fallback: 5432,
    service: "postgres",
    label: "PostgreSQL",
  },
  { env: "REDIS_PORT", fallback: 6379, service: "redis", label: "Redis" },
  {
    env: "MAILPIT_SMTP_PORT",
    fallback: 1025,
    service: "mailpit",
    label: "Mailpit SMTP",
  },
  {
    env: "MAILPIT_UI_PORT",
    fallback: 8025,
    service: "mailpit",
    label: "Mailpit UI",
  },
  {
    env: "SEAWEEDFS_S3_PORT",
    fallback: 9000,
    service: "seaweedfs",
    label: "SeaweedFS S3",
  },
  {
    env: "SEAWEEDFS_UI_PORT",
    fallback: 9001,
    service: "seaweedfs",
    label: "SeaweedFS UI",
  },
];

function log(message) {
  console.log(`\n\u001b[36m>\u001b[0m ${message}`);
}

function warn(message) {
  console.warn(`\n\u001b[33m!\u001b[0m ${message}`);
}

function fail(message) {
  console.error(`\n\u001b[31m✖\u001b[0m ${message}`);
  process.exit(1);
}

function quoteShellArg(value) {
  const text = String(value);
  return /[\s"&|<>^]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function run(command, commandArgs, options = {}) {
  const spawnOptions = {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...options,
  };

  // On Windows, pnpm is a .cmd shim that Node cannot execute directly. Pass a
  // single command line to the shell instead of args + shell, which avoids
  // Node's DEP0190 warning. All arguments are static values from this script.
  const result = isWindows
    ? spawnSync([command, ...commandArgs].map(quoteShellArg).join(" "), {
        ...spawnOptions,
        shell: true,
      })
    : spawnSync(command, commandArgs, spawnOptions);

  if (result.error) {
    fail(`Could not run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(
      `${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`,
    );
  }
}

function hasCommand(command, commandArgs = ["--version"]) {
  const spawnOptions = {
    cwd: root,
    stdio: "ignore",
    env: process.env,
  };

  const result = isWindows
    ? spawnSync([command, ...commandArgs].map(quoteShellArg).join(" "), {
        ...spawnOptions,
        shell: true,
      })
    : spawnSync(command, commandArgs, spawnOptions);

  return result.status === 0;
}

/** Run a command and return its stdout, or null when it fails. */
function capture(command, commandArgs) {
  const spawnOptions = {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  };

  const result = isWindows
    ? spawnSync([command, ...commandArgs].map(quoteShellArg).join(" "), {
        ...spawnOptions,
        shell: true,
      })
    : spawnSync(command, commandArgs, spawnOptions);

  if (result.error || result.status !== 0) return null;
  return result.stdout ?? "";
}

const placeholderPatterns = [
  /^$/,
  /^changeme$/i,
  /^change-me$/i,
  /^replace-me$/i,
  /^your-secret-here$/i,
  /^your[-_]/i,
  /^<.*>$/,
];

function isPlaceholder(value) {
  const trimmed = String(value ?? "").trim();
  return placeholderPatterns.some((pattern) => pattern.test(trimmed));
}

function quote(value) {
  return /[\s#"']/.test(value) ? JSON.stringify(value) : value;
}

/**
 * Set KEY=value in a dotenv file. Existing non-placeholder values are kept
 * unless `overwrite` is true, so re-running setup never rotates secrets.
 */
function setEnv(content, key, value, { overwrite = false } = {}) {
  const line = `${key}=${quote(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const match = content.match(pattern);

  if (!match) {
    return `${content.trimEnd()}\n${line}\n`;
  }

  if (!overwrite) {
    const current = match[0].slice(key.length + 1);
    if (!isPlaceholder(current)) return content;
  }

  return content.replace(pattern, line);
}

function readEnvFile(file) {
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8");
}

function writeEnvFile(file, content) {
  writeFileSync(file, `${content.trimEnd()}\n`, "utf8");
}

/** Minimal dotenv parser for the root Compose overrides file. */
function parseDotenv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Later lines win, matching dotenv and Docker Compose.
    values[key] = value;
  }

  return values;
}

/** Read the effective value of KEY from a dotenv file body. */
function envValue(content, key) {
  const pattern = new RegExp(`^${key}=(.*)$`, "gm");
  let value = "";

  for (const match of content.matchAll(pattern)) {
    value = match[1];
  }

  return value.trim().replace(/^["']|["']$/g, "");
}

function isLoopbackHost(host) {
  const normalized = String(host ?? "")
    .trim()
    .toLowerCase();
  return (
    normalized === "" ||
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(normalized)
  );
}

function isLoopbackUrl(value) {
  try {
    return isLoopbackHost(new URL(value).hostname);
  } catch {
    return false;
  }
}

/**
 * Update a value that `pnpm run setup` owns for the local stack. An intentional
 * non-local value (a remote database or SMTP server) is left alone. When the
 * file has duplicate keys, append a last-wins line instead of rewriting the
 * earlier value, so hand-maintained overrides survive.
 */
function setManagedValue(content, key, value, shouldManage) {
  const current = envValue(content, key);
  if (!shouldManage(current)) return content;
  if (current === value) return content;

  const occurrences = content.match(new RegExp(`^${key}=.*$`, "gm")) ?? [];
  if (occurrences.length > 1) {
    return `${content.trimEnd()}\n${key}=${quote(value)}\n`;
  }

  return setEnv(content, key, value, { overwrite: true });
}

function resolveComposePorts() {
  const fileEnv = parseDotenv(readEnvFile(join(root, ".env")));
  const ports = {};

  for (const entry of composePortEntries) {
    const raw = process.env[entry.env] ?? fileEnv[entry.env];

    if (raw === undefined || raw === "") {
      ports[entry.env] = entry.fallback;
      continue;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      fail(
        `${entry.env} must be an integer between 1 and 65535 (got "${raw}"). Fix .env and rerun.`,
      );
    }

    ports[entry.env] = value;
  }

  return ports;
}

function isPortFree(port) {
  return new Promise((resolveFree) => {
    const server = createServer();
    server.once("error", () => resolveFree(false));
    server.once("listening", () => server.close(() => resolveFree(true)));
    server.listen({ port, host: "127.0.0.1", exclusive: true });
  });
}

/**
 * Return the `${service}:${port}` pairs that this Compose project already
 * publishes on 127.0.0.1, so a re-run does not report its own containers.
 */
function loopbackPublishedPorts() {
  const raw = capture("docker", ["compose", "ps", "--format", "json"]);
  if (!raw) return new Set();

  const text = raw.trim();
  if (!text) return new Set();

  let entries;
  try {
    // Compose versions emit either a JSON array or one object per line.
    entries = text.startsWith("[")
      ? JSON.parse(text)
      : text.split(/\r?\n/).map((line) => JSON.parse(line));
  } catch {
    return new Set();
  }

  const published = new Set();
  for (const entry of entries) {
    const service = entry?.Service;
    if (!service) continue;

    for (const publisher of entry.Publishers ?? []) {
      if (publisher?.URL === "127.0.0.1" && publisher.PublishedPort) {
        published.add(`${service}:${publisher.PublishedPort}`);
      }
    }
  }

  return published;
}

/**
 * Fail early with an actionable message when a host port is taken. Core
 * services publish on 127.0.0.1, so a clash with a locally installed
 * PostgreSQL would otherwise shadow the Compose database and migrations could
 * run against the wrong one.
 */
async function checkPortConflicts(ports) {
  const ownPorts = loopbackPublishedPorts();
  const conflicts = [];

  for (const entry of composePortEntries) {
    const port = ports[entry.env];

    if (await isPortFree(port)) continue;
    if (ownPorts.has(`${entry.service}:${port}`)) continue;

    conflicts.push({ ...entry, port });
  }

  if (conflicts.length === 0) return;

  const details = conflicts
    .map(
      ({ label, env, port }) => `  ${label}: port ${port} is in use (${env})`,
    )
    .join("\n");

  fail(
    `These local ports are already used by another program:\n${details}\n\n` +
      "Set the listed variables in the repository `.env` file to free ports, then rerun\n" +
      "`pnpm run setup`. Setup rewrites the matching URLs in apps/api/.env.\n\n" +
      "Example: POSTGRES_PORT=55432\n\n" +
      "If an older copy of this stack is still running, stop it first with `pnpm db:down`.",
  );
}

function ensureEnvFile(exampleFile, targetFile) {
  if (existsSync(targetFile)) {
    log(`Keeping existing ${targetFile}`);
    return readEnvFile(targetFile);
  }

  if (!existsSync(exampleFile)) {
    warn(`${exampleFile} does not exist; creating ${targetFile} from scratch`);
    return "";
  }

  log(`Creating ${targetFile} from ${exampleFile}`);
  const content = readEnvFile(exampleFile);
  writeEnvFile(targetFile, content);
  return content;
}

function secret(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function configureApiEnv(ports) {
  const file = join(root, "apps", "api", ".env");
  let content = ensureEnvFile(join(root, "apps", "api", ".env.example"), file);

  const postgresPort = ports.POSTGRES_PORT;
  const redisPort = ports.REDIS_PORT;
  const smtpPort = ports.MAILPIT_SMTP_PORT;
  const storagePort = ports.SEAWEEDFS_S3_PORT;

  const values = {
    NODE_ENV: "development",
    PORT: "3001",
    API_BASE_URL: "http://localhost:3001",
    CLIENT_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_URL: "http://localhost:3001",
    DATABASE_URL: `postgresql://skillex:skillex@localhost:${postgresPort}/skillex?schema=public`,
    REDIS_URL: `redis://localhost:${redisPort}`,
    BETTER_AUTH_SECRET: secret(48),
    INTERNAL_SECRET: secret(48),
    JWT_SECRET: secret(48),
    ONBOARDING_EMAIL_FROM: "SkillEx <dev@skillex.local>",
    EMAIL_TRANSPORT: "auto",
    SMTP_HOST: "localhost",
    SMTP_PORT: String(smtpPort),
    SMTP_SECURE: "false",
    R2_ACCESS_KEY_ID: "skillex",
    R2_SECRET_ACCESS_KEY: "skillex-dev-secret",
    R2_BUCKET_NAME: "skillex-uploads",
    R2_ENDPOINT: `http://localhost:${storagePort}`,
    R2_PUBLIC_URL: `http://localhost:${storagePort}/skillex-uploads`,
    EXPO_SCHEME: "skil-ex",
  };

  // These point at Docker services. Keep an intentional remote value, but
  // rewrite a local one so a changed host port does not leave a stale URL.
  const managedLocalUrls = new Set([
    "DATABASE_URL",
    "REDIS_URL",
    "R2_ENDPOINT",
    "R2_PUBLIC_URL",
  ]);

  for (const [key, value] of Object.entries(values)) {
    if (managedLocalUrls.has(key)) {
      content = setManagedValue(
        content,
        key,
        value,
        (current) => isPlaceholder(current) || isLoopbackUrl(current),
      );
      continue;
    }

    if (key === "SMTP_PORT") {
      // Only follow Mailpit while SMTP_HOST points at the local instance.
      content = setManagedValue(content, key, value, () =>
        isLoopbackHost(envValue(content, "SMTP_HOST")),
      );
      continue;
    }

    content = setEnv(content, key, value);
  }

  // Keep explicitly-empty optional integrations empty. In particular, do not
  // invent Flutterwave or LiveKit credentials: half-configured groups fail the
  // API's startup validation, and a fake key would make the API call the real
  // provider.
  for (const key of [
    "RESEND_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "NEXT_PUBLIC_LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "FLUTTERWAVE_SECRET_KEY",
    "FLUTTERWAVE_WEBHOOK_SECRET_HASH",
    "OER_APP_ID",
    "POSTHOG_PROJECT_TOKEN",
    "POSTHOG_HOST",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_EMAIL",
  ]) {
    if (!new RegExp(`^${key}=`, "m").test(content)) {
      content = setEnv(content, key, "");
    }
  }

  writeEnvFile(file, content);
}

function configureWebEnv() {
  const file = join(root, "apps", "web", ".env.local");
  let content = ensureEnvFile(join(root, "apps", "web", ".env.example"), file);

  const values = {
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
    NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL: "http://localhost:3001",
    NEXT_PUBLIC_CLIENT_BASE_URL: "http://localhost:3000",
    NEXT_PUBLIC_PRELAUNCH_MODE: "false",
    NEXT_PUBLIC_POSTHOG_HOST: "/ph",
  };

  for (const [key, value] of Object.entries(values)) {
    content = setEnv(content, key, value);
  }

  writeEnvFile(file, content);
}

function configureMobileEnv() {
  const file = join(root, "apps", "mobile", ".env");
  let content = ensureEnvFile(
    join(root, "apps", "mobile", ".env.example"),
    file,
  );

  const values = {
    EXPO_PUBLIC_API_BASE_URL: "http://localhost:3001",
    EXPO_PUBLIC_BETTER_AUTH_URL: "http://localhost:3001",
    EXPO_PUBLIC_WEB_BASE_URL: "http://localhost:3000",
    EXPO_PUBLIC_SCHEME: "skil-ex",
  };

  for (const [key, value] of Object.entries(values)) {
    content = setEnv(content, key, value);
  }

  writeEnvFile(file, content);
}

async function startDocker(ports) {
  if (skipDocker) {
    warn("Skipping docker compose (--skip-docker)");
    return true;
  }

  if (!hasCommand("docker", ["compose", "version"])) {
    warn(
      "Docker Compose is not available. Install Docker Desktop, then run `pnpm run setup` again.",
    );
    return false;
  }

  await checkPortConflicts(ports);

  log("Starting postgres, redis, mailpit, and seaweedfs...");
  run("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
    "postgres",
    "redis",
    "mailpit",
    "seaweedfs",
  ]);

  log("Configuring the local upload bucket...");
  run("docker", ["compose", "run", "--rm", "storage-init"]);
  return true;
}

async function main() {
  console.log("\nSkillEx local setup");
  console.log("===================");

  ensureDockerOnPath();

  if (!hasCommand("pnpm")) {
    fail("pnpm is required. Install it from https://pnpm.io/installation");
  }

  // Docker Compose reads this file for the published host ports. Creating it
  // from the example keeps the port settings discoverable and editable.
  ensureEnvFile(join(root, ".env.example"), join(root, ".env"));
  const ports = resolveComposePorts();

  configureApiEnv(ports);
  configureWebEnv();
  configureMobileEnv();

  if (!skipInstall) {
    log("Installing workspace dependencies...");
    run("pnpm", ["install"]);
  }

  const dockerReady = await startDocker(ports);

  log("Building the shared package...");
  run("pnpm", ["--filter", "@skillex/shared", "build"]);

  log("Generating the Prisma client...");
  run("pnpm", ["--filter", "api", "exec", "prisma", "generate"]);

  if (!dockerReady && !skipDocker) {
    warn("Skipping migrations because Docker is not available.");
    console.log(`
Next steps:
  1. Install Docker Desktop and start it.
  2. Run: pnpm run setup

The environment files were created:
  - apps/api/.env
  - apps/web/.env.local
  - apps/mobile/.env
`);
    process.exit(1);
  }

  log("Applying database migrations...");
  run("pnpm", ["--filter", "api", "exec", "prisma", "migrate", "deploy"]);

  if (!skipSeed) {
    log("Seeding demo data...");
    run("pnpm", ["--filter", "api", "exec", "prisma", "db", "seed"]);
  }

  const customPorts = composePortEntries.filter(
    (entry) => ports[entry.env] !== entry.fallback,
  );
  const portNote =
    customPorts.length > 0
      ? `\nLocal ports from .env:\n${customPorts
          .map((entry) => `  ${entry.env}=${ports[entry.env]}`)
          .join("\n")}\n`
      : "";

  console.log(`
\u001b[32m✓ Setup complete\u001b[0m

Start the apps:
  pnpm dev

Local services:
  Web              http://localhost:3000
  API              http://localhost:3001/api
  API health       http://localhost:3001/health
  Mailpit (email)  http://localhost:${ports.MAILPIT_UI_PORT}
  SeaweedFS UI     http://localhost:${ports.SEAWEEDFS_UI_PORT}
  SeaweedFS S3     http://localhost:${ports.SEAWEEDFS_S3_PORT}  (skillex / skillex-dev-secret)
  LiveKit          optional: docker compose --profile video up -d
  Payments         local mock by default (no Flutterwave account required)
${portNote}
Demo login:
  Email            demo@skillex.dev
  Password         Password123!
`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

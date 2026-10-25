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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const skipInstall = args.has("--skip-install");
const skipDocker = args.has("--skip-docker");
const skipSeed = args.has("--skip-seed");

const isWindows = process.platform === "win32";

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

function configureApiEnv() {
  const file = join(root, "apps", "api", ".env");
  let content = ensureEnvFile(join(root, "apps", "api", ".env.example"), file);

  const values = {
    NODE_ENV: "development",
    PORT: "3001",
    API_BASE_URL: "http://localhost:3001",
    CLIENT_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_URL: "http://localhost:3001",
    DATABASE_URL:
      "postgresql://skillex:skillex@localhost:5432/skillex?schema=public",
    REDIS_URL: "redis://localhost:6379",
    BETTER_AUTH_SECRET: secret(48),
    INTERNAL_SECRET: secret(48),
    JWT_SECRET: secret(48),
    ONBOARDING_EMAIL_FROM: "SkillEx <dev@skillex.local>",
    EMAIL_TRANSPORT: "auto",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    R2_ACCESS_KEY_ID: "skillex",
    R2_SECRET_ACCESS_KEY: "skillex-dev-secret",
    R2_BUCKET_NAME: "skillex-uploads",
    R2_ENDPOINT: "http://localhost:9000",
    R2_PUBLIC_URL: "http://localhost:9000/skillex-uploads",
    EXPO_SCHEME: "skillex",
  };

  for (const [key, value] of Object.entries(values)) {
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
    EXPO_PUBLIC_SCHEME: "skillex",
  };

  for (const [key, value] of Object.entries(values)) {
    content = setEnv(content, key, value);
  }

  writeEnvFile(file, content);
}

function startDocker() {
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

  log("Starting postgres, redis, mailpit, and minio...");
  run("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
    "postgres",
    "redis",
    "mailpit",
    "minio",
  ]);

  log("Creating the local upload bucket...");
  run("docker", ["compose", "run", "--rm", "minio-init"]);
  return true;
}

function main() {
  console.log("\nSkillEx local setup");
  console.log("===================");

  if (!hasCommand("pnpm")) {
    fail("pnpm is required. Install it from https://pnpm.io/installation");
  }

  configureApiEnv();
  configureWebEnv();
  configureMobileEnv();

  if (!skipInstall) {
    log("Installing workspace dependencies...");
    run("pnpm", ["install"]);
  }

  const dockerReady = startDocker();

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

  console.log(`
\u001b[32m✓ Setup complete\u001b[0m

Start the apps:
  pnpm dev

Local services:
  Web              http://localhost:3000
  API              http://localhost:3001/api
  API health       http://localhost:3001/health
  Mailpit (email)  http://localhost:8025
  MinIO console    http://localhost:9001  (skillex / skillex-dev-secret)
  LiveKit          optional: docker compose --profile video up -d
  Payments         local mock by default (no Flutterwave account required)

Demo login:
  Email            demo@skillex.dev
  Password         Password123!
`);
}

main();

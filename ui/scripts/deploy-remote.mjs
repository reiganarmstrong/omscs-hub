import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const buildOnly = args.includes("--build-only");
const envFileIndex = args.indexOf("--env-file");
const envFile =
  envFileIndex === -1 ? ".env.remote.local" : args[envFileIndex + 1];

if (envFileIndex !== -1 && !envFile) {
  fail("Missing value after --env-file.");
}

const envPath = resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  fail(`Missing ${envFile}. Copy .env.remote.example to ${envFile} and fill it in.`);
}

const remoteEnv = parseEnvFile(envPath);
const required = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_API_BASE_URL"];
const missing = required.filter((key) => !remoteEnv[key]);

if (missing.length) {
  fail(`${envFile} missing required values: ${missing.join(", ")}`);
}

const env = { ...process.env, ...remoteEnv };

run("pnpm", ["build"], env);
if (!buildOnly) run("pnpm", ["wrangler", "deploy"], env);

function parseEnvFile(path) {
  const env = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env[key] = stripQuotes(rawValue.trim());
  }

  return env;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function run(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

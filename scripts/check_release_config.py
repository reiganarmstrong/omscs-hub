"""Check public beta release configuration before anything is deployed.

Reads environment values and repository files only. It never prints secret
values and never contacts Cloudflare, Clerk, or GitHub.
"""

import os
import re
import sys
import tomllib
from pathlib import Path
from urllib.parse import urlparse

REQUIRED = (
    "PUBLIC_UI_URL",
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "D1_DATABASE_NAME",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN_API",
    "CLOUDFLARE_API_TOKEN_UI",
    "SMOKE_EMAIL",
    "SMOKE_EMAIL_CODE",
)
SOURCE_CHECKS = ("check-current-courses.yml", "check-academic-sources.yml")


def is_https_origin(value):
    url = urlparse(value)
    return url.scheme == "https" and bool(url.netloc) and url.path in ("", "/") and not url.query


def clerk_key_mode(key, prefix):
    """Return "test" or "live" for a Clerk key with the given prefix."""
    match = re.match(rf"^{prefix}_(test|live)_", key)
    return match.group(1) if match else None


def check(env, root):
    errors = [f"{name} is required." for name in REQUIRED if not env.get(name)]
    ui = env.get("PUBLIC_UI_URL", "")
    api = env.get("NEXT_PUBLIC_API_BASE_URL", "")
    for name, value in (("PUBLIC_UI_URL", ui), ("NEXT_PUBLIC_API_BASE_URL", api)):
        if value and not is_https_origin(value):
            errors.append(f"{name} must be an https origin without a path.")

    wrangler = tomllib.loads((root / "api/wrangler.toml").read_text(encoding="utf-8"))
    origins = [origin.strip() for origin in wrangler.get("vars", {}).get("CORS_ORIGIN", "").split(",")]
    ui_origin = ui.rstrip("/")
    if ui and ui_origin not in origins:
        errors.append(f"api/wrangler.toml CORS_ORIGIN must include {ui_origin}.")
    databases = [db.get("database_name") for db in wrangler.get("d1_databases", [])]
    if env.get("D1_DATABASE_NAME") and env["D1_DATABASE_NAME"] not in databases:
        errors.append("D1_DATABASE_NAME must match api/wrangler.toml database_name.")

    publishable = env.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
    secret = env.get("CLERK_SECRET_KEY", "")
    publishable_mode = clerk_key_mode(publishable, "pk")
    secret_mode = clerk_key_mode(secret, "sk")
    if publishable and not publishable_mode:
        errors.append("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.")
    if secret and not secret_mode:
        errors.append("CLERK_SECRET_KEY must be a Clerk secret key.")
    if publishable_mode and secret_mode and publishable_mode != secret_mode:
        errors.append("Clerk publishable and secret keys must both be test or both be live keys.")

    email = env.get("SMOKE_EMAIL", "")
    if email and not email.lower().endswith("@gatech.edu"):
        errors.append("SMOKE_EMAIL must be an @gatech.edu address.")

    for name in SOURCE_CHECKS:
        path = root / ".github/workflows" / name
        if not path.exists():
            errors.append(f".github/workflows/{name} is missing.")
        elif not re.search(r"^\s+schedule:\s*\n\s+- cron:", path.read_text(encoding="utf-8"), re.M):
            errors.append(f".github/workflows/{name} must run on a schedule.")
    return errors


def main():
    errors = check(os.environ, Path(__file__).resolve().parents[1])
    for error in errors:
        print(f"::error::{error}", file=sys.stderr)
    if errors:
        return 1
    print("Release configuration is complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

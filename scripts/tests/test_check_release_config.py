import tempfile
import unittest
from pathlib import Path

from scripts.check_release_config import check

WRANGLER = """name = "omscs-hub-review-api-dev"

[vars]
CORS_ORIGIN = "https://beta.example.edu,http://localhost:3001"

[[d1_databases]]
binding = "DB"
database_name = "omscs-hub-reviews-dev"
"""

SCHEDULED = """on:
  schedule:
    - cron: "17 9 * * *"
"""

ENV = {
    "PUBLIC_UI_URL": "https://beta.example.edu",
    "NEXT_PUBLIC_API_BASE_URL": "https://api.example.edu",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_abc",
    "CLERK_SECRET_KEY": "sk_test_secret-value",
    "D1_DATABASE_NAME": "omscs-hub-reviews-dev",
    "CLOUDFLARE_ACCOUNT_ID": "account",
    "CLOUDFLARE_API_TOKEN_API": "api-token",
    "CLOUDFLARE_API_TOKEN_UI": "ui-token",
    "SMOKE_EMAIL": "smoke+clerk_test@gatech.edu",
    "SMOKE_EMAIL_CODE": "424242",
}


class ReleaseConfigTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "api").mkdir()
        (self.root / "api/wrangler.toml").write_text(WRANGLER, encoding="utf-8")
        workflows = self.root / ".github/workflows"
        workflows.mkdir(parents=True)
        for name in ("check-current-courses.yml", "check-academic-sources.yml"):
            (workflows / name).write_text(SCHEDULED, encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_configuration_passes(self):
        self.assertEqual(check(ENV, self.root), [])

    def test_missing_values_are_named_without_revealing_secrets(self):
        errors = check({**ENV, "CLERK_SECRET_KEY": "", "SMOKE_EMAIL_CODE": ""}, self.root)
        self.assertIn("CLERK_SECRET_KEY is required.", errors)
        self.assertIn("SMOKE_EMAIL_CODE is required.", errors)
        rejected = check({**ENV, "CLERK_SECRET_KEY": "bad-secret-value"}, self.root)
        self.assertIn("CLERK_SECRET_KEY must be a Clerk secret key.", rejected)
        self.assertNotIn("secret-value", "\n".join(rejected))

    def test_api_must_allow_deployed_ui_origin(self):
        errors = check({**ENV, "PUBLIC_UI_URL": "https://other.example.edu"}, self.root)
        self.assertIn("api/wrangler.toml CORS_ORIGIN must include https://other.example.edu.", errors)

    def test_urls_must_be_https_origins(self):
        errors = check({**ENV, "NEXT_PUBLIC_API_BASE_URL": "http://api.example.edu/v1"}, self.root)
        self.assertIn("NEXT_PUBLIC_API_BASE_URL must be an https origin without a path.", errors)

    def test_migrations_and_imports_target_configured_database(self):
        errors = check({**ENV, "D1_DATABASE_NAME": "other-db"}, self.root)
        self.assertIn("D1_DATABASE_NAME must match api/wrangler.toml database_name.", errors)

    def test_clerk_keys_must_belong_to_one_instance_type(self):
        errors = check({**ENV, "CLERK_SECRET_KEY": "sk_live_x"}, self.root)
        self.assertIn("Clerk publishable and secret keys must both be test or both be live keys.", errors)
        errors = check({**ENV, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "abc", "CLERK_SECRET_KEY": "xyz"}, self.root)
        self.assertIn("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.", errors)
        self.assertIn("CLERK_SECRET_KEY must be a Clerk secret key.", errors)

    def test_smoke_account_must_be_georgia_tech(self):
        errors = check({**ENV, "SMOKE_EMAIL": "smoke@example.com"}, self.root)
        self.assertIn("SMOKE_EMAIL must be an @gatech.edu address.", errors)

    def test_source_check_workflows_must_be_scheduled(self):
        (self.root / ".github/workflows/check-academic-sources.yml").write_text("on:\n  workflow_dispatch:\n", encoding="utf-8")
        (self.root / ".github/workflows/check-current-courses.yml").unlink()
        errors = check(ENV, self.root)
        self.assertIn(".github/workflows/check-academic-sources.yml must run on a schedule.", errors)
        self.assertIn(".github/workflows/check-current-courses.yml is missing.", errors)


if __name__ == "__main__":
    unittest.main()

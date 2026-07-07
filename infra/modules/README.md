# Terraform Modules

Reusable Terraform modules for Cloudflare infrastructure.

## Modules

- `d1_database`: Creates a Cloudflare D1 database and exposes its ID and name.
- `worker_routing`: Connects an existing Worker service to a custom domain or
  route.

Current dev wiring uses these modules from `../environments/dev` to create the
OMSCS Hub review database and route the API/UI Worker services. Worker code and
static assets are still deployed by Wrangler outside Terraform.

## Conventions

- Modules should not configure providers. Root environments own provider setup.
- Inputs must have descriptions and explicit types.
- Outputs must have descriptions.
- Singleton resources use the `this` resource name.
- Keep modules narrow. Environment-specific wiring belongs in
  `../environments`.

## Validation

From any environment using these modules:

```bash
terraform fmt -check -recursive ../../modules
terraform validate
```

# Terraform Guidelines

## Skill Usage

- Use `terraform-style-guide` for Terraform modifications.

## General

- Do not use hardcoded strings for arns. Always use a HCL resource arn attribute or get the arn using a datasource.

## Formatting

- When making singleton resources in terraform modules, use the "this" naming convention instead of "main."

## Diagrams

- Utilize color to distinguish between elements.

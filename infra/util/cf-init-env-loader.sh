#!/usr/bin/env bash

# Load Cloudflare R2 S3 credentials from Bitwarden for Terraform init commands.

set -euo pipefail

STATE_FOLDER="${STATE_FOLDER:-OMSCS-Hub}"
STATE_ACCESS_KEY_ITEM="${STATE_ACCESS_KEY_ITEM:-OMSCS-Hub-State-ID}"
STATE_SECRET_KEY_ITEM="${STATE_SECRET_KEY_ITEM:-OMSCS-Hub-State-Secret}"

fail() {
  echo "Error: $*" >&2
  exit 1
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: $0 [terraform init flags]"
  echo
  echo "Examples:"
  echo "  $0 -backend-config=backend.hcl"
  echo "  $0 -backend-config=backend.hcl -migrate-state"
  echo "  $0 -backend-config=backend.hcl -reconfigure"
  exit 0
fi

if [ -z "${BW_SESSION:-}" ]; then
  fail "Bitwarden vault is locked. Run 'export BW_SESSION=\$(bw unlock --raw)' first."
fi

for command in bw jq terraform; do
  if ! command -v "$command" >/dev/null 2>&1; then
    fail "'$command' is required but was not found in PATH."
  fi
done

if [ "$(bw status --session "$BW_SESSION" | jq -r '.status')" != "unlocked" ]; then
  fail "Bitwarden vault is not unlocked for this BW_SESSION. Run 'export BW_SESSION=\$(bw unlock --raw)' again."
fi

get_notes_from_folder_item() {
  local item_name="$1"
  local folder_id
  local notes

  if ! folder_id=$(bw list folders --search "$STATE_FOLDER" --session "$BW_SESSION" | jq -er --arg folder_name "$STATE_FOLDER" '.[] | select(.name == $folder_name) | .id'); then
    fail "Bitwarden folder '$STATE_FOLDER' was not found."
  fi

  if ! notes=$(bw list items --folderid "$folder_id" --search "$item_name" --session "$BW_SESSION" \
    | jq -er --arg item_name "$item_name" '.[] | select(.name == $item_name) | .notes | gsub("^[[:space:]]+|[[:space:]]+$"; "") | select(length > 0)'); then
    fail "Bitwarden item '$item_name' was not found in folder '$STATE_FOLDER' or its notes were empty."
  fi

  printf '%s\n' "$notes"
}

echo "Fetching Cloudflare R2 state credentials from Bitwarden..."
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
AWS_ACCESS_KEY_ID=$(get_notes_from_folder_item "$STATE_ACCESS_KEY_ITEM")
AWS_SECRET_ACCESS_KEY=$(get_notes_from_folder_item "$STATE_SECRET_KEY_ITEM")

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  fail "R2 state credentials were empty."
fi

if [ "${CF_INIT_ENV_LOADER_DEBUG:-}" = "1" ]; then
  echo "AWS_ACCESS_KEY_ID length: ${#AWS_ACCESS_KEY_ID}"
  echo "AWS_SECRET_ACCESS_KEY length: ${#AWS_SECRET_ACCESS_KEY}"
fi

terraform init "$@"

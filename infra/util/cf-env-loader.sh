#!/usr/bin/env bash

# Load Cloudflare API token and R2 S3 state credentials from Bitwarden for Terraform commands.

set -euo pipefail

CLOUDFLARE_TOKEN_ITEM="${CLOUDFLARE_TOKEN_ITEM:-Local Cloudflare Token}"
CLOUDFLARE_TOKEN_FIELD="${CLOUDFLARE_TOKEN_FIELD:-API_KEY}"
STATE_FOLDER="${STATE_FOLDER:-OMSCS-Hub}"
STATE_ACCESS_KEY_ITEM="${STATE_ACCESS_KEY_ITEM:-OMSCS-Hub-State-ID}"
STATE_SECRET_KEY_ITEM="${STATE_SECRET_KEY_ITEM:-OMSCS-Hub-State-Secret}"

fail() {
  echo "Error: $*" >&2
  exit 1
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: $0 [terraform command and flags]"
  echo
  echo "Examples:"
  echo "  $0 plan -var-file=terraform.tfvars"
  echo "  $0 apply -var-file=terraform.tfvars"
  echo "  $0 apply -auto-approve"
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

get_cloudflare_api_token() {
  local items_json
  local matching_names
  local token

  if ! items_json=$(bw list items --search "$CLOUDFLARE_TOKEN_ITEM" --session "$BW_SESSION"); then
    fail "Bitwarden item search failed for '$CLOUDFLARE_TOKEN_ITEM'."
  fi

  if ! token=$(jq -er --arg item_name "$CLOUDFLARE_TOKEN_ITEM" --arg field_name "$CLOUDFLARE_TOKEN_FIELD" \
    '.[] | select(.name == $item_name) | .fields[]? | select(.name == $field_name) | .value | select(length > 0)' \
    <<<"$items_json"); then
    matching_names=$(jq -r '.[].name' <<<"$items_json")
    if [ -n "$matching_names" ]; then
      echo "Bitwarden search matches:" >&2
      echo "$matching_names" >&2
    fi
    fail "Bitwarden item '$CLOUDFLARE_TOKEN_ITEM' with field '$CLOUDFLARE_TOKEN_FIELD' was not found or the field was empty. Override with CLOUDFLARE_TOKEN_ITEM or CLOUDFLARE_TOKEN_FIELD if your vault uses different names."
  fi

  printf '%s\n' "$token"
}

get_notes_from_folder_item() {
  local item_name="$1"
  local folder_id
  local notes

  if ! folder_id=$(bw list folders --search "$STATE_FOLDER" --session "$BW_SESSION" \
    | jq -er --arg folder_name "$STATE_FOLDER" '.[] | select(.name == $folder_name) | .id'); then
    fail "Bitwarden folder '$STATE_FOLDER' was not found."
  fi

  if ! notes=$(bw list items --folderid "$folder_id" --search "$item_name" --session "$BW_SESSION" \
    | jq -er --arg item_name "$item_name" '.[] | select(.name == $item_name) | .notes | gsub("^[[:space:]]+|[[:space:]]+$"; "") | select(length > 0)'); then
    fail "Bitwarden item '$item_name' was not found in folder '$STATE_FOLDER' or its notes were empty."
  fi

  printf '%s\n' "$notes"
}

echo "Fetching Cloudflare token from Bitwarden..."
export CLOUDFLARE_API_TOKEN
CLOUDFLARE_API_TOKEN=$(get_cloudflare_api_token)

echo "Fetching Cloudflare R2 state credentials from Bitwarden..."
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
AWS_ACCESS_KEY_ID=$(get_notes_from_folder_item "$STATE_ACCESS_KEY_ITEM")
AWS_SECRET_ACCESS_KEY=$(get_notes_from_folder_item "$STATE_SECRET_KEY_ITEM")

if [ "${CF_ENV_LOADER_DEBUG:-}" = "1" ]; then
  echo "AWS_ACCESS_KEY_ID length: ${#AWS_ACCESS_KEY_ID}"
  echo "AWS_SECRET_ACCESS_KEY length: ${#AWS_SECRET_ACCESS_KEY}"
fi

terraform "$@"

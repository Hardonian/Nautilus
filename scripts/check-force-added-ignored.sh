#!/usr/bin/env bash
set -Eeuo pipefail

bad=()
while IFS= read -r -d '' path; do
  if git check-ignore --quiet --no-index -- "$path"; then
    bad+=("$path")
  fi
done < <(git diff --cached --name-only --diff-filter=A -z)

if ((${#bad[@]} > 0)); then
  printf 'Force-added files that .gitignore would block:\n' >&2
  printf '  %s\n' "${bad[@]}" >&2
  exit 1
fi

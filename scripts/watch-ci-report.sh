#!/usr/bin/env bash

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

SHA="${1:-$(git rev-parse HEAD)}"
DOWNLOADS="$HOME/storage/downloads"

if [[ ! -d "$DOWNLOADS" ]]; then
  DOWNLOADS="$HOME/Downloads"
fi

mkdir -p "$DOWNLOADS"

TS="$(date +%Y%m%d-%H%M%S)"
REPORT="$DOWNLOADS/ORBIS-ADMIN-CI-SONAR-$TS.txt"

exec > >(tee -a "$REPORT") 2>&1

echo "=== ORBIS ADMIN — AUTOMATIC CI / SONAR REPORT ==="
echo "Started: $(date)"
echo "Commit: $SHA"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is unavailable." >&2
  exit 1
fi

RUN_ID=""

for _ in $(seq 1 120); do
  RUN_ID="$(
    gh run list \
      --commit "$SHA" \
      --event pull_request \
      --limit 20 \
      --json databaseId,name \
      --jq '
        map(
          select(.name == "ORBIS Admin PR Quality Gate")
        )[0].databaseId // empty
      ' 2>/dev/null
  )"

  [[ -n "$RUN_ID" ]] && break
  sleep 5
done

if [[ -z "$RUN_ID" ]]; then
  echo "ERROR: PR Quality Gate was not found within 10 minutes." >&2
  exit 2
fi

echo "Run ID: $RUN_ID"

set +e
gh run watch "$RUN_ID" --exit-status
RUN_RC=$?
set -e

echo
echo "=== JOB RESULT ==="

gh run view "$RUN_ID" \
  --json status,conclusion,url,jobs \
  --jq '{
    status,
    conclusion,
    url,
    jobs: [.jobs[] | {
      name,
      conclusion,
      failedSteps: [
        .steps[] |
        select(.conclusion == "failure") |
        .name
      ]
    }]
  }' || true

echo
echo "=== SONAR / STRICT POLICY ==="

gh run view "$RUN_ID" --log 2>/dev/null \
  | grep -E \
    -A120 \
    -B5 \
    'SonarQube Cloud diagnostic|Quality Gate conditions|Unresolved issues|Security hotspots|ORBIS STRICT SONAR POLICY|STRICT SONAR POLICY' \
  || true

echo
echo "=== FINAL ==="
echo "GitHub workflow exit code: $RUN_RC"
echo "Report: $REPORT"
echo "Finished: $(date)"

exit 0

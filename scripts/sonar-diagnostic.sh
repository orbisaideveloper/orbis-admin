#!/usr/bin/env bash

set -uo pipefail

MODE="${1:-}"
VALUE="${2:-}"
PROJECT_KEY="${SONAR_PROJECT_KEY:-orbisaideveloper_orbis-admin}"
OUT_DIR="${SONAR_DIAG_DIR:-.sonar-diagnostics}"
PAGE_SIZE="100"

mkdir -p "$OUT_DIR"

if [[ "$MODE" != "pr" && "$MODE" != "branch" ]]; then
  echo "SONAR DIAGNOSTIC: expected mode 'pr' or 'branch'."
  exit 0
fi

if [[ -z "$VALUE" ]]; then
  echo "SONAR DIAGNOSTIC: target value is missing."
  exit 0
fi

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "SONAR DIAGNOSTIC: SONAR_TOKEN is unavailable in this environment."
  echo "GitHub Actions is the canonical owner of this secret."
  exit 0
fi

api_get() {
  local endpoint="$1"
  local outfile="$2"
  shift 2

  if ! curl \
    -fsS \
    --retry 3 \
    --retry-delay 2 \
    -u "${SONAR_TOKEN}:" \
    -G "https://sonarcloud.io/api/${endpoint}" \
    "$@" \
    -o "$outfile"
  then
    printf '{"diagnosticError":"API request failed: %s"}\n' \
      "$endpoint" > "$outfile"
  fi

  return 0
}

if [[ "$MODE" == "pr" ]]; then
  SCOPE_LABEL="pull request ${VALUE}"

  api_get \
    "qualitygates/project_status" \
    "$OUT_DIR/quality-gate.json" \
    --data-urlencode "projectKey=$PROJECT_KEY" \
    --data-urlencode "pullRequest=$VALUE"

  api_get \
    "issues/search" \
    "$OUT_DIR/issues.json" \
    --data-urlencode "componentKeys=$PROJECT_KEY" \
    --data-urlencode "pullRequest=$VALUE" \
    --data-urlencode "resolved=false" \
    --data-urlencode "ps=$PAGE_SIZE"

  api_get \
    "hotspots/search" \
    "$OUT_DIR/hotspots.json" \
    --data-urlencode "projectKey=$PROJECT_KEY" \
    --data-urlencode "pullRequest=$VALUE" \
    --data-urlencode "ps=$PAGE_SIZE"
else
  SCOPE_LABEL="branch ${VALUE}"

  api_get \
    "qualitygates/project_status" \
    "$OUT_DIR/quality-gate.json" \
    --data-urlencode "projectKey=$PROJECT_KEY" \
    --data-urlencode "branch=$VALUE"

  api_get \
    "issues/search" \
    "$OUT_DIR/issues.json" \
    --data-urlencode "componentKeys=$PROJECT_KEY" \
    --data-urlencode "branch=$VALUE" \
    --data-urlencode "resolved=false" \
    --data-urlencode "ps=$PAGE_SIZE"

  api_get \
    "hotspots/search" \
    "$OUT_DIR/hotspots.json" \
    --data-urlencode "projectKey=$PROJECT_KEY" \
    --data-urlencode "branch=$VALUE" \
    --data-urlencode "ps=$PAGE_SIZE"
fi

export SONAR_DIAG_SCOPE="$SCOPE_LABEL"
export SONAR_DIAG_DIR="$OUT_DIR"

python3 <<'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["SONAR_DIAG_DIR"])
scope = os.environ.get("SONAR_DIAG_SCOPE", "unknown target")

def load(name):
    path = root / name
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        return {"diagnosticError": f"{name}: {exc}"}

gate = load("quality-gate.json")
issues_data = load("issues.json")
hotspots_data = load("hotspots.json")

lines = [
    "# SonarQube Cloud diagnostic",
    "",
    f"- Scope: {scope}",
]

project_status = gate.get("projectStatus", {})
gate_status = project_status.get("status", "UNKNOWN")
lines.append(f"- Quality Gate: {gate_status}")

conditions = project_status.get("conditions", [])
if conditions:
    lines += ["", "## Quality Gate conditions"]
    for item in conditions:
        metric = item.get("metricKey", "unknown")
        status = item.get("status", "UNKNOWN")
        actual = item.get("actualValue", "n/a")
        threshold = item.get("errorThreshold", "n/a")
        comparator = item.get("comparator", "")
        lines.append(
            f"- {status}: {metric} actual={actual} "
            f"{comparator} threshold={threshold}"
        )

if gate.get("diagnosticError"):
    lines.append(f"- Gate API: {gate['diagnosticError']}")

issues = issues_data.get("issues", [])
issue_total = (
    issues_data.get("total")
    or issues_data.get("paging", {}).get("total")
    or len(issues)
)

lines += ["", f"## Unresolved issues: {issue_total}"]

for item in issues[:25]:
    impacts = item.get("impacts") or []
    impact_text = ",".join(
        f"{impact.get('softwareQuality','')}:{impact.get('severity','')}"
        for impact in impacts
    )
    severity = item.get("severity") or impact_text or "n/a"
    component = item.get("component", "n/a")
    line = item.get("line", "n/a")
    rule = item.get("rule", "n/a")
    message = item.get("message", "")
    lines.append(
        f"- [{severity}] {rule} — {component}:{line} — {message}"
    )

if issues_data.get("diagnosticError"):
    lines.append(f"- Issues API: {issues_data['diagnosticError']}")

hotspots = hotspots_data.get("hotspots", [])
hotspot_total = (
    hotspots_data.get("paging", {}).get("total")
    or len(hotspots)
)

lines += ["", f"## Security hotspots: {hotspot_total}"]

for item in hotspots[:25]:
    probability = item.get("vulnerabilityProbability", "n/a")
    category = item.get("securityCategory", "n/a")
    component = item.get("component", "n/a")
    line = item.get("line", "n/a")
    status = item.get("status", "n/a")
    message = item.get("message", "")
    lines.append(
        f"- [{status}/{probability}/{category}] "
        f"{component}:{line} — {message}"
    )

if hotspots_data.get("diagnosticError"):
    lines.append(f"- Hotspots API: {hotspots_data['diagnosticError']}")

summary = "\n".join(lines) + "\n"

(root / "summary.md").write_text(summary)
print(summary)

github_summary = os.environ.get("GITHUB_STEP_SUMMARY")
if github_summary:
    with open(github_summary, "a", encoding="utf-8") as fh:
        fh.write(summary)
PY

exit 0

#!/usr/bin/env python3

import json
import sys
from pathlib import Path

root = Path(".sonar-diagnostics")

def load(name):
    path = root / name
    if not path.is_file():
        raise SystemExit(f"STRICT SONAR: missing {path}")
    return json.loads(path.read_text())

gate = load("quality-gate.json")
issues_data = load("issues.json")

status = gate.get("projectStatus", {})
conditions = {
    item.get("metricKey"): item
    for item in status.get("conditions", [])
}

failures = []

def numeric(metric):
    item = conditions.get(metric)
    if not item:
        return None
    try:
        return float(item.get("actualValue"))
    except (TypeError, ValueError):
        return None

coverage = numeric("new_coverage")
duplication = numeric("new_duplicated_lines_density")
security = numeric("new_security_rating")
reliability = numeric("new_reliability_rating")
maintainability = numeric("new_maintainability_rating")
hotspots_reviewed = numeric("new_security_hotspots_reviewed")

if coverage is not None and coverage != 100.0:
    failures.append(f"new coverage must be 100.0%, actual={coverage}%")

if duplication is not None and duplication != 0.0:
    failures.append(
        f"new duplicated lines density must be 0.0%, actual={duplication}%"
    )

for name, value in (
    ("security rating", security),
    ("reliability rating", reliability),
    ("maintainability rating", maintainability),
):
    if value is not None and value != 1.0:
        failures.append(f"{name} must be A/1, actual={value}")

if hotspots_reviewed is not None and hotspots_reviewed != 100.0:
    failures.append(
        "security hotspots reviewed must be 100%, "
        f"actual={hotspots_reviewed}%"
    )

issue_total = (
    issues_data.get("total")
    or issues_data.get("paging", {}).get("total")
    or len(issues_data.get("issues", []))
)

if int(issue_total) != 0:
    failures.append(f"unresolved Sonar issues must be 0, actual={issue_total}")

print("=== ORBIS STRICT SONAR POLICY ===")
print(f"new coverage: {coverage if coverage is not None else 'N/A'}")
print(
    "new duplicated lines density: "
    f"{duplication if duplication is not None else 'N/A'}"
)
print(f"unresolved issues: {issue_total}")

if failures:
    print("STRICT SONAR POLICY: FAILED")
    for failure in failures:
        print(f"- {failure}")
    sys.exit(1)

print("STRICT SONAR POLICY: PASS")

# Sonar corrective candidate — 2026-10-17

Evidence: ORBIS-SONAR-HISTORY-READ-20261017-080342.txt. These are the original reported line numbers, before this patch.

Source fixes are prepared. Termux targeted/full certification and a new remote Sonar scan remain required; zero current issues is not claimed. No merge, deploy or live database changes are performed.

| File and original line | Rule | Finding |
| --- | --- | --- |
| `apps/api/src/customer/maya-profiles.ts:14` | `typescript:S7758` | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `apps/api/src/customer/maya-profiles.ts:14` | `typescript:S7758` | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `apps/api/src/customer/maya-profiles.ts:19` | `typescript:S2871` | Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically. |
| `apps/api/src/customer/maya-profiles.ts:49` | `typescript:S2871` | Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically. |
| `database/control/maya-birth-profiles.review.sql:18` | `plsql:S1192` | Define a constant instead of duplicating this literal 4 times. |
| `database/control/maya-birth-profiles.review.sql:20` | `plsql:S1192` | Define a constant instead of duplicating this literal 5 times. |
| `database/control/maya-birth-profiles.review.sql:20` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:21` | `plsql:S1192` | Define a constant instead of duplicating this literal 13 times. |
| `database/control/maya-birth-profiles.review.sql:22` | `plsql:S1192` | Define a constant instead of duplicating this literal 4 times. |
| `database/control/maya-birth-profiles.review.sql:25` | `plsql:S1192` | Define a constant instead of duplicating this literal 8 times. |
| `database/control/maya-birth-profiles.review.sql:25` | `plsql:S1192` | Define a constant instead of duplicating this literal 6 times. |
| `database/control/maya-birth-profiles.review.sql:25` | `plsql:S1192` | Define a constant instead of duplicating this literal 5 times. |
| `database/control/maya-birth-profiles.review.sql:26` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:39` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:39` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:39` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:39` | `plsql:S1192` | Define a constant instead of duplicating this literal 4 times. |
| `database/control/maya-birth-profiles.review.sql:41` | `plsql:S1192` | Define a constant instead of duplicating this literal 3 times. |
| `database/control/maya-birth-profiles.review.sql:66` | `plsql:S1192` | Define a constant instead of duplicating this literal 6 times. |

Fixes: Unicode code-point inspection and explicit key sorting. Remove the redundant review-only SQL copy and link documentation to the existing versioned migration. The two SQL files differed only in their first comment; executable SQL is identical. The applied migration stays byte-identical. No Sonar exclusions, thresholds or rule suppressions are changed.

Checkpoint: PR #20 parent head 8b6b9472de7aa87dbd3dfc1327b5500abfdc7866. Admin main is not changed.

Next: owner runs guarded patch and exact-source certification, shares its single Downloads report, then approves the reviewed commit/push. A new remote Sonar result is needed before release.

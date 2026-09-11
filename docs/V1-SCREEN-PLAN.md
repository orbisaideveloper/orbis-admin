# ORBIS Admin — Version 1 Screen Plan

**Status:** Approved for Step 4 implementation

Version 1 is the first visual/admin-shell milestone for the future ORBIS Control Center. It proves navigation, information architecture, project-registry behavior, responsive layout, visual system, and health/status patterns before real authentication, databases, customer records, or production-control actions are connected.

## V1 user

V1 is designed for the ORBIS owner/admin only. It is **not** a customer-facing dashboard.

Customers will later sign in through the ORBIS product they use. Their permanent ORBIS identity will be resolved through the central identity architecture, but they will not use the owner Admin dashboard.

## Core V1 design rule — compact command board

The home screen must avoid becoming a long scrolling dashboard.

The first mobile viewport should show the important command cards as compactly as practical, without unnecessary repeated headings or decorative blocks consuming vertical space.

The **Projects** card is the primary entry point, but it should be flatter/shorter than the earlier preview so the rest of the command board remains visible.

The approved home areas are:

1. **Projects** — all registered ORBIS products/projects.
2. **Modules / Models** — cross-project module inventory and current/published state.
3. **Central Users** — permanent ORBIS identity/customer registry summary.
4. **GitHub Actions** — cross-project required-check and workflow summary.
5. **Sonar Quality** — cross-project Sonar project and Quality Gate summary.
6. **Render / Deployments** — cross-project service/deployment summary.
7. **Environments** — preview/staging/production overview.
8. **Review / Publish Queue** — items waiting for review or future publish/release action.
9. **Alerts / Incidents** — failed, degraded, blocked, or attention-needed items.
10. **API / Service Health** — registered health endpoint summary.
11. **Activity / Audit** — recent administrative activity.
12. **Settings / Integrations** — registry and integration configuration entry point.

The main page heading appears once. Do not show a redundant small `Command Center` breadcrumb/title immediately above the real `Command Center` heading on Home.

## Responsive layout — one application, two deliberate layout modes

Mobile and desktop should feel intentionally designed for their screen size.

### Mobile

- portrait-first,
- compact cards,
- first viewport prioritized for glanceability,
- Projects card flatter/shorter than the earlier preview,
- no unnecessary duplicated heading strip,
- three-dot menu available at the top,
- date/time visible in the Admin header,
- drill-down information behind taps rather than extending Home into a long report.

### Desktop / large screen

- make deliberate use of the larger canvas,
- allow wider multi-column grids and richer summaries,
- keep the same routes/data/permissions/behavior as mobile,
- do not create a second independent application or duplicate business logic merely to achieve a different layout.

Responsive CSS/components may render substantially different compositions for mobile vs desktop, but they must remain one maintainable product.

## Drill-down navigation

The navigation hierarchy is:

```text
Home Command Center
  -> category card
     -> project/item card
        -> exact detail view
```

Every secondary screen must show:

- **Back** — one level up,
- **Home** — direct return to the Command Center,
- title/breadcrumb — clear current location.

Browser/device Back must follow the same internal route history. It must not unexpectedly jump straight Home or exit the app while an internal previous screen exists.

## Projects flow

Tapping **Projects** opens the registry-driven project grid/list.

Each project card should show a compact summary such as:

- product/project name,
- type/category,
- health state,
- repository,
- current commit/version,
- published/live version,
- environment state,
- quality state,
- module/model count,
- user/member count when available,
- integration state.

Tapping a project opens that project's unified Admin detail page **inside ORBIS Admin**.

The project detail is not a blind copy of an old project admin page. It is a standard ORBIS Admin view that brings together the project's approved Admin-facing data.

Project-detail sections/cards include:

- Overview,
- Modules / Models,
- Versions / Releases,
- GitHub Actions,
- Sonar Quality,
- Render / Deployments,
- Environments,
- Users / Memberships,
- Health,
- Activity / Audit.

The project-detail screen itself follows the same compact-card principle: important categories first, exact diagnostics one tap deeper.

Where appropriate, the detail page also provides explicit provider deep-links such as **Open in GitHub**, **Open in SonarQube Cloud**, and **Open in Render**.

## GitHub Actions flow

The top-level GitHub Actions card is an aggregate cross-project signal.

- If all connected project checks are healthy, the aggregate card shows healthy/green.
- If any connected project has a failed/blocking state, the aggregate card becomes an attention/failure state.
- Opening the card lists registered projects and makes the affected project obvious.
- Opening that project shows exact workflow/check details.

Where safe, the detailed view may provide Copy actions for repository, branch, commit SHA, check name, error/reference IDs, and a concise non-secret **AI-ready diagnostic brief** that can be pasted into an AI assistant for investigation.

The detailed page also provides **Open in GitHub** when provider-native logs are needed.

## Sonar Quality flow

The top-level Sonar Quality card follows the same aggregate pattern.

It should eventually show every registered ORBIS project with a configured Sonar project identity. It must not assume that every repository is automatically connected.

Per connected project, the Admin should show useful summary information such as:

- project name,
- Sonar project key,
- Quality Gate state,
- issue/quality warning summary,
- coverage/duplication summary where available,
- last analysis status/time where available.

Tapping a project opens deeper Sonar detail inside ORBIS Admin. A separate **Open in SonarQube Cloud** action opens the original Sonar project page.

## Render / Deployments flow

Tapping **Render / Deployments** opens a cross-project deployment view for registered Render services.

Per project it may show:

- service/environment,
- current deployed commit/version,
- deployment/health state,
- preview/staging/production state.

Tapping a project opens its deployment detail inside Admin, with **Open in Render** available for the original provider page.

## Modules / Models flow

The cross-project module/model view should show compact cards with:

- module/model name,
- owning project,
- current working version,
- published version,
- status,
- review state,
- quality/health state,
- last change.

Future high-risk actions such as Publish, Promote, Rollback, or Disable must be permissioned and audited. In V1 they remain absent or visibly disabled/demo-only.

## Central Users flow

This page represents the future central ORBIS user/customer registry.

V1 shows only safe demo structure. The later data model must use an immutable internal `orbis_user_id` even if the normal UI presents a safer human-friendly display ID.

V1 must not implement real customer storage or authentication.

## Copy controls

Admin work often needs safe operational data copied into Termux, GitHub, diagnostics, or support notes.

V1 establishes a consistent Copy pattern for non-secret values such as:

- repository name,
- branch,
- commit SHA,
- project/module ID,
- ORBIS display/user ID where authorized,
- service/deployment ID,
- Sonar project key,
- URLs,
- error/reference IDs,
- non-secret diagnostic text.

Secret values, passwords, access tokens, service-role keys, and credentials must never be rendered as copyable browser values.

## Independent ORBIS Admin infrastructure

ORBIS Admin remains fully independent from every other ORBIS product.

Its future database must be its own database. If Supabase is chosen, it must be a dedicated ORBIS Admin Supabase project/database. Existing product databases must not be reused as the Admin database.

ORBIS Admin must also have its own Render service/deployment and project-specific secrets/configuration. It may observe/control other projects through explicit integrations, but does not share their runtime/database simply to make integration easier.

## Activity / Audit

V1 establishes the visual pattern for a future audit trail. Real audit persistence comes later with the dedicated Admin database and authorization architecture.

## Settings / Integrations

V1 contains a settings/integrations shell for future project-registry, GitHub, Sonar, Render, environment, notification, audit, and security configuration.

No privileged secret values are exposed in browser UI.

## V1 visual direction

Approved visual direction:

- premium high-tech ORBIS command-center appearance,
- deep dark background with crystal-bright surfaces,
- compact glass-like cards with strong separation,
- cyan/blue/violet highlights,
- restrained status glow,
- amber/red emphasis for attention/failure states,
- readable high-resolution typography and status numbers,
- clear Admin character rather than a generic consumer dashboard,
- strong mobile and desktop composition,
- no visual decoration may reduce readability or make dangerous actions ambiguous.

## V1 safe-action rule

Allowed in the first implementation milestone:

- navigation,
- Home/Back/breadcrumb behavior,
- browser/device Back integration,
- compact demo/read-only cards,
- project/category drill-down,
- safe demo Copy controls,
- provider deep-link buttons using safe placeholders/config,
- date/time header,
- three-dot menu,
- health endpoint demonstration,
- responsive mobile/desktop layouts,
- testable components,
- empty/loading/error states.

Not allowed in the first implementation milestone:

- real customer login,
- real customer record storage,
- database writes,
- publish/deploy/rollback actions,
- production secrets,
- product write integrations,
- destructive controls.

## V1 completion signal

V1 is successful if the owner can open it on mobile and understand the important ORBIS control areas at a glance, use an intentionally richer desktop layout on a larger screen, drill through projects/categories step-by-step, return reliably with Back/Home, reach project-specific summaries, and copy safe operational identifiers easily.

The visual direction is approved; later small visual adjustments are normal and do not reopen the underlying architecture decision.

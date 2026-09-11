# ORBIS Admin — Version 1 Screen Plan

**Status:** Proposed for Step 3 review

Version 1 is the first visual/admin-shell milestone for the future ORBIS Control Center. It proves the navigation, information architecture, project-registry model, visual system, responsive behavior, and health/status patterns before real authentication, databases, customer records, or production-control actions are connected.

## V1 user

V1 is designed for the ORBIS owner/admin only. It is **not** a customer-facing dashboard.

Customers will later sign in through the ORBIS product they use. Their permanent ORBIS identity will be resolved through the central identity architecture, but they will not use the owner Admin dashboard.

## Core V1 design rule — compact command board

The home screen must avoid becoming a long scrolling dashboard.

The first viewport should show roughly 10–12 compact, high-value cards so the owner can understand all important areas at a glance. On mobile, cards should remain compact and responsive; secondary information belongs behind a tap rather than below the home screen.

The exact card count may change during visual review, but the command-board principle is fixed.

## Proposed home cards

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

A small top strip may show only the most important whole-system numbers such as total projects, healthy projects, attention required, and central users.

## Drill-down navigation

The navigation hierarchy is:

```text
Home Command Center
  -> category card
     -> project/item card
        -> detail view
```

Every secondary screen must show:

- **Back** — one level up,
- **Home** — direct return to the Command Center,
- title/breadcrumb — clear current location.

This lets the owner move step-by-step or jump straight home.

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

Proposed project-detail sections/cards:

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

Where appropriate, the detail page also provides explicit provider deep-links such as **Open in GitHub**, **Open in SonarQube Cloud**, and **Open in Render**.

## Sonar Quality flow

Tapping the top-level **Sonar Quality** card opens the ORBIS Sonar overview.

It should eventually show every registered ORBIS project that has a configured Sonar project identity. It does not automatically assume every GitHub repository already has Sonar configured.

For each connected project, the Admin should show useful summary information such as:

- project name,
- Sonar project key,
- Quality Gate state,
- issue/quality warning summary,
- coverage/duplication summary where available,
- last analysis status/time where available.

Tapping a project opens deeper Sonar detail inside ORBIS Admin. A separate **Open in SonarQube Cloud** action opens the original Sonar Cloud project page for full provider-native details.

## GitHub Actions flow

Tapping **GitHub Actions** opens a cross-project CI view for registered repositories.

Per project it may show:

- repository,
- branch/current commit,
- required-check state,
- latest workflow result,
- blocked/failed/pending status.

Tapping a project opens deeper workflow/check detail inside Admin, with **Open in GitHub** available when full provider details are needed.

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

V1 shows only safe demo structure:

- ORBIS display ID,
- customer name,
- email,
- phone,
- account status,
- product memberships/access,
- created date,
- last activity summary when available.

The later data model must use an immutable internal `orbis_user_id` even if the normal UI shows a safer human-friendly display ID.

V1 must not implement real customer storage or authentication.

## Copy controls

Admin work often needs safe operational data copied into Termux, GitHub, diagnostics, or support notes.

V1 should establish a consistent copy-button pattern for non-secret values such as:

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

V1 should establish the visual pattern for a future audit trail.

Each activity item should be able to represent:

- actor,
- action,
- target,
- timestamp,
- outcome,
- environment,
- non-secret context.

V1 uses sample/demo activity only.

## Settings / Integrations

V1 contains a settings/integrations shell for future configuration categories such as:

- Admin profile/security,
- project registry,
- GitHub integration,
- Sonar integration/project mapping,
- Render integration/service mapping,
- environments,
- notification preferences,
- audit/security policy.

No privileged secret values should be exposed in the browser UI.

## V1 visual direction

The intended design is a premium high-tech command center:

- deep dark background with bright crystalline surfaces,
- compact glass-like micro-cards with strong separation,
- vivid cyan/blue/violet highlights,
- restrained glow around live/healthy states,
- amber/red emphasis for attention/failure states,
- readable status numbers,
- smooth rounded geometry,
- glanceable first viewport,
- responsive mobile-first layout,
- secondary details behind taps rather than long home-page scrolling,
- no visual decoration should reduce readability or make dangerous actions ambiguous.

## V1 safe-action rule

Allowed in the first implementation milestone:

- navigation,
- Home/Back/breadcrumb behavior,
- demo/search/filter UI,
- compact read-only/demo cards,
- project/category drill-down,
- safe demo Copy controls,
- provider deep-link buttons using demo/config placeholders,
- health endpoint demonstration,
- responsive layout,
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

V1 is successful if the owner can see the important ORBIS control areas at a glance, tap through projects/categories step-by-step, reach project-specific admin summaries, copy safe operational identifiers easily, and say: "Yes, this is the visual and structural direction for the ORBIS control center."

This visual approval does not itself authorize later identity/database/production-control implementation; those remain separate architecture and implementation steps.

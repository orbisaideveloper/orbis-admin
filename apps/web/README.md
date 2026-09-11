# ORBIS Admin Web

The web application for the ORBIS Admin owner control center.

ORBIS Admin is the central administrative command surface for the ORBIS
ecosystem. This package contains the browser UI only. Backend services,
shared contracts, identity persistence, and provider integrations belong
to their respective packages or services.

## Technology

- React
- Vite
- TypeScript
- Vitest
- Testing Library

## Responsibilities

The web application is responsible for:

- the ORBIS Admin command-center interface
- project and provider navigation
- project drill-down views
- health and quality status views
- safe read-only diagnostic information
- Back, Home, and browser-history navigation
- safe copy controls for non-secret values
- responsive mobile and desktop presentation

Mobile and desktop are different layout modes of the same shared app and
codebase.

## Current Scaffold Scope

The first scaffold provides:

- owner/admin dashboard shell
- ORBIS project navigation
- GitHub Actions status views
- Sonar quality views
- Render and environment views
- service-health and activity views
- ORBIS Foundation demo/read-only drill-downs
- responsive UI behavior

Provider information in this phase is demo/read-only unless explicitly
connected later.

## Deliberately Out of Scope

The first scaffold does not introduce:

- authentication or login
- central ORBIS identity persistence
- Admin database writes
- customer-facing workflows
- production publish, deploy, or rollback controls
- destructive provider actions
- production secrets in the browser
- live product-data mutation

These capabilities must be introduced in later reviewed phases with
appropriate authorization, security controls, and auditability.

## Local Development

Run web checks from the repository root:

    npm run lint --workspace @orbis-admin/web
    npm run build --workspace @orbis-admin/web

Repository-level quality commands are also run from the repository root:

    npm run lint
    npm run type-check
    npm run test:coverage
    npm run check:deadcode:ci
    npm run check:duplicates:ci
    npm run build

Knip and JSCPD may require the supported Ubuntu environment when native
Termux Android bindings are incompatible.

## Testing and Quality

New and materially changed production code must preserve the ORBIS Admin
quality contract:

- zero lint warnings
- zero TypeScript errors
- 100% lines, statements, functions, and branches coverage
- no actionable Knip dead code
- zero accepted JSCPD duplication
- no high or critical dependency vulnerabilities
- successful production builds
- successful SonarQube Cloud quality-gate analysis in CI

Repository-wide governance remains defined by the root README, AGENTS,
CONTRIBUTING, and docs documentation.

## Architecture Boundary

This package must never store secrets, backend credentials, database
service-role keys, or privileged provider tokens.

Browser-visible controls remain safe by default. Privileged actions added
later must use server-side authorization, explicit confirmation, capability
checks, and audit logging.

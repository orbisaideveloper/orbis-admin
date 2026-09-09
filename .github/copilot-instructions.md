# ORBIS Admin — GitHub Copilot Instructions

Use `AGENTS.md` as the master repository instruction and do not introduce guidance that conflicts with it.

Key rules:

- ORBIS Admin is the central ORBIS identity and administrative control plane.
- Keep product-specific business data in each product's own database.
- Use one immutable central ORBIS user identifier across products.
- Do not derive permanent identity from mutable email or phone values.
- Keep GitHub, Render, database-provider, and other privileged credentials server-side.
- Apply least privilege to all integration and administrative actions.
- Treat read-only observability and write/control capabilities separately.
- Make sensitive administrative actions auditable.
- Inspect current source and directly connected contracts before changing behavior.
- Avoid unrelated refactors.
- Work on a purpose-specific branch and deliver changes through a pull request.
- Use targeted verification for normal development; do not run unrelated expensive checks for small changes.
- Update architecture/decision documentation when durable system rules change.

When uncertain about system boundaries, consult `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` before proposing implementation.

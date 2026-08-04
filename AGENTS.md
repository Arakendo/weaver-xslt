# Weaver Contributor Instructions

## Source Of Truth

- Read `docs/Specifications/Weaver Software Design Document.md` before changing
  engine ownership, execution boundaries, IR contracts, or public APIs.
- Read relevant records in `docs/ADR/` before changing an accepted decision.
- Read relevant records in `docs/Architectural Reviews/` when a question is
  still under study or has deferred findings.
- Plans describe intended work. They do not override specifications or ADRs.
- Evidence records observations. It does not silently create a guarantee.

## Design Boundaries

- Keep XML/XPath/XSLT semantics owned in Weaver rather than host adapters.
- Preserve interpreter and native-backend semantic parity.
- Keep generated TypeScript readable and inspectable.
- Keep host resource, security, and execution policy explicit.
- Prefer structured diagnostics over text-only failure channels.

## Validation

- Run `npm run typecheck` after TypeScript changes.
- Run the narrowest relevant tests while iterating and `npm test` for shared
  compiler, runtime, packaging, workflow, or harness changes.
- Run `mkdocs build --strict` after documentation navigation or link changes.


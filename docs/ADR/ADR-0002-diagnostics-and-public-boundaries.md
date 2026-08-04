# ADR-0002: Diagnostics And Public Boundaries

- Status: Accepted
- Date: 2026-08-03
- Source decisions: DEC-007, DEC-012, DEC-013, and DEC-015

## Context

Weaver must expose failures, host integration, and extension behavior without
leaking internal implementation structures or reducing diagnostics to strings.

## Decision

- Use `XdmError` and structured diagnostic reports with stable identities,
  source context, and related locations.
- Keep the stable public API deliberately small.
- Treat diagnostics as a first-class product contract from parsing through
  execution and generated artifacts.
- Expose extension functions through typed bindings.

## Consequences

Presentation may format diagnostics, but must preserve their structured
meaning. Host adapters integrate through bounded APIs. New extension points
must declare types and ownership instead of creating untracked side channels.

## Detailed Specification

See the [Weaver Error Design Document](../Specifications/Weaver%20Error%20Design%20Document.md),
the [Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md),
and the corresponding DEC sections in the
[Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md).


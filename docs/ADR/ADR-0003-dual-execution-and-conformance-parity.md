# ADR-0003: Dual Execution And Conformance Parity

- Status: Accepted
- Date: 2026-08-03
- Source decisions: DEC-010, DEC-011, and DEC-014

## Context

Weaver has an interpreter reference backend and a native backend that can run
in process or emit inspectable TS/JS. Multiple execution paths create value
only if they preserve the same semantics and remain testable.

## Decision

- Test through unit, golden, corpus/conformance, and cross-backend parity tiers.
- Treat the interpreter as the semantic reference while requiring native
  execution and emitted artifacts to consume the same semantic plan.
- Emit readable TypeScript/JavaScript modules rather than opaque bytecode.
- Use a deliberate ESM module layout.

## Consequences

Native support must be explicit; unsupported behavior may diagnose or follow a
documented fallback policy but may not silently diverge. Generated artifacts
remain inspectable and source-map-friendly. Backend pressure should improve the
shared plan rather than fork semantics.

## Detailed Specification

See the [Native Execution Boundary Specification](../Specifications/Weaver%20Native%20Execution%20Boundary%20Specification.md),
the [Native Plan Boundary Specification](../Specifications/Weaver%20Native%20Plan%20Boundary%20Specification.md),
and the corresponding DEC sections in the
[Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md).


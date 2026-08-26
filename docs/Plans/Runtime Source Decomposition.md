# Runtime Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `92d2f7f`

## Purpose

This record applies ADR-0004 to `src/runtime/index.ts`, the generated-module
runtime facade. It extracts the positional simple-path execution subsystem
without changing runtime imports emitted by Weaver, package exports, or the
native plan contract.

## Review and disposition

At checkpoint `92d2f7f`, `runtime/index.ts` contained 1,312 physical lines and
was in ADR-0004's inspect-on-substantive-change band. The facade combines
public runtime exports with implementations for compiled documents, trace
projection, simple path traversal, explicit document access, built-in
templates, string serialization, transform fallback, and structured native
errors.

Most of those responsibilities cooperate at the generated-module facade and
remain bounded at their current size. Positional simple-path execution is
different: it consumes only a DOM start node and a serializable step plan, owns
its own result cache and integer constraint evaluation, and has no dependency
on document loading, tracing, diagnostics, or transform fallback. The
disposition is **decompose the positional executor and retain the remaining
runtime facade**.

## Extracted responsibility

### `simplePathPositionRuntime.ts`

- Subject: generated-module runtime path execution.
- Responsibility: traverse unqualified element steps and filter each step by
  the positional constraint plan produced by native codegen.
- Authority: execution of the existing serializable positional plan; XPath
  recognition and normalization remain in `xslt/codegen`.
- Inputs: a DOM start node and structural step-plan values.
- Output: a cached immutable node sequence.
- Dependencies: DOM node contracts only.
- Exclusions: XPath parsing/evaluation, template selection, filesystem access,
  tracing, diagnostics, and public package composition.

## Dependency and coupling review

```text
generated module
    -> runtime/index
        -> simplePathPositionRuntime

nativePositionPredicate
    -> nativePositionPlan
    -> emitted structural plan value
        -> simplePathPositionRuntime
```

The runtime executor does not import compiler/codegen modules, so the runtime
remains usable without the compiler. `runtime/index.ts` re-exports the existing
`selectSimplePathNodesByStepPlan` symbol and therefore preserves generated
module imports and public behavior.

Post-extraction, `runtime/index.ts` contains 900 physical lines and
`simplePathPositionRuntime.ts` contains 415. Both are below ADR-0004's size
review threshold.

## Conservation evidence

The baseline is commit `92d2f7f`, where the complete suite passed 1,019 tests
across 86 files. After extraction:

- `npm run typecheck` passes; and
- 138 focused positional-planning, native-runtime, relative and absolute path,
  and runtime tests pass across five files.

Additional conservation evidence is green:

- `npm run build` and focused ESLint validation pass; and
- the complete suite passes all 86 test files with 1,019 tests passing, one
  skipped, and two todo. The run retains the XSLT 3.0 MVP+3 result at 73/73 and
  the QT3 MVP+2 supported slice at 2,487/2,487.

A normal MkDocs build completes. Strict mode reaches the same 56 pre-existing
broken-link warnings recorded by the preceding campaigns; this record and its
navigation entries add no new documentation warning.

## Reopening triggers

Revisit this boundary if:

- the executor needs compiler ASTs or imports from `xslt/codegen`;
- emitted and runtime plan shapes drift without a shared versioned contract;
- positional filtering starts owning template selection or XPath parsing;
- cache identity or node ordering changes; or
- the retained runtime facade again crosses a review threshold or reveals
  another state-independent implementation owner.

# Interpreter Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `8518224`

## Purpose

This record applies ADR-0004 to `src/xslt/eval/transform.ts`. It separates two
demonstrated interpreter responsibilities without changing XSLT semantics,
the stylesheet IR, public APIs, or the native backend.

## Review and disposition

At checkpoint `8518224`, `transform.ts` contained 1,573 physical lines. The
unit is in ADR-0004's inspect-on-substantive-change band. Its central template
application, instruction rendering, parameter binding, global binding, and
error framing cooperate through interpreter execution state and remain one
coherent transform evaluator.

Two regions do not consume that renderer state:

- XSLT numbering selects count-pattern matches and formats count sequences;
  and
- interpreter trace projection converts selected XDM nodes into public trace
  events and stable XML node handles.

Both are independently testable and already communicate through bounded
inputs. The disposition is **decompose those seams and retain the remaining
transform evaluator with inspection on substantive change**.

## Extracted responsibilities

### `numbering.ts`

- Subject: interpreter execution of `xsl:number`.
- Responsibility: calculate `single`, `multiple`, and `any` count sequences
  and format decimal or Roman numeral output.
- Authority: interpreter implementation of the compiled numbering
  instruction.
- Inputs: the compiled number instruction and immutable XPath dynamic context.
- Output: serialized number text.
- Dependencies: XDM node wrappers and the shared XPath evaluator.
- Exclusions: template dispatch, instruction sequencing, tracing, host policy,
  and native lowering.

### `transformTrace.ts`

- Subject: interpreter trace observation.
- Responsibility: publish focus, instruction-selection, and value-read events
  using stable XML node handles.
- Authority: projection of interpreter observations into the existing trace
  contract; it does not choose transform behavior.
- Inputs: selected XDM items or DOM nodes, trace options, instruction
  provenance, and the source document URI.
- Effects: trace events and trace-summary recording through the shared runtime
  trace channel.
- Exclusions: XPath evaluation, template selection, output generation, and
  breakpoint policy.

## Dependency and coupling review

```text
transform
    -> numbering
        -> XPath evaluator + XDM contracts
    -> transformTrace
        -> trace contract + XML node handles
```

Neither extracted module imports `transform.ts`, receives renderer callbacks,
or mutates interpreter execution state. `transform.ts` now contains 1,279
physical lines; `numbering.ts` contains 215 and `transformTrace.ts` contains
107. All remain below the explicit-review threshold.

## Conservation evidence

The baseline is commit `8518224`, where the complete suite passed 1,016 tests
across 85 files. After extraction:

- `npm run typecheck` passes;
- 199 focused runtime, trace, smoke, golden, and native-parity tests pass; and
- three direct interpreter numbering tests retain sibling counting, Roman
  formatting, and document-order `level="any"` behavior.

Additional conservation evidence is green:

- `npm run build` and focused ESLint validation pass; and
- the complete suite passes all 86 test files with 1,019 tests passing, one
  skipped, and two todo. The run retains the XSLT 3.0 MVP+3 result at 73/73 and
  the QT3 MVP+2 supported slice at 2,487/2,487.

A normal MkDocs build completes. Strict mode reaches the same 56 pre-existing
broken-link warnings recorded by the preceding campaigns; this record and its
navigation entries add no new documentation warning.

## Reopening triggers

Revisit these boundaries if:

- numbering requires template dispatch or general renderer state;
- trace projection begins changing evaluation or output behavior;
- interpreter and native numbering disagree on a newly supported form;
- trace event order or structured provenance changes; or
- the retained transform evaluator crosses the explicit-review threshold or
  demonstrates another state-independent execution responsibility.

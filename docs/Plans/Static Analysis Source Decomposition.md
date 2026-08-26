# Static Analysis Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `23fc0de`

## Purpose

This record applies ADR-0004 to `src/xslt/compile/analyze.ts`. The work is a
behavior-preserving decomposition of static-analysis passes. It does not add,
remove, or reinterpret diagnostics and does not change the stylesheet IR or a
public package boundary.

## Review

At checkpoint `23fc0de`, `analyze.ts` contained 1,644 physical lines. That is
in ADR-0004's inspect-on-substantive-change band. The requested continuation
of the decomposition campaign triggered the cohesion inspection, and the unit
also contained multiple independently testable invariants:

- named-template and global-binding reachability;
- unused template parameter and local-variable analysis;
- template-match overlap, priority conflict, and shadowing analysis;
- sample-document element and attribute typo analysis; and
- diagnostic normalization, source spans, frames, related locations, and
  suggestions shared by those passes.

These passes share the stylesheet IR and structured diagnostic contract, but
they do not share traversal state or analysis results. The disposition is
**decompose**.

## Extracted responsibilities

### `templateReachabilityAnalysis.ts`

- Subject: XSLT static analysis.
- Responsibility: determine reachable named templates and global bindings,
  track lexical binding usage, and report unused bindings.
- Authority: compile-time reachability and binding-use observations.
- Inputs: immutable `StylesheetIR` instructions, bindings, templates, and
  XPath ASTs.
- Outputs: separately ordered global-binding and template diagnostic lists.
- Exclusions: match priority, sample-document inspection, IR mutation, and
  runtime behavior.

The result keeps global and template reports separate so `analyze.ts` can
preserve the established cross-pass diagnostic order.

### `templateMatchAnalysis.ts`

- Subject: XSLT template-match static analysis.
- Responsibility: normalize the comparable match subset, determine overlap
  and subsumption, calculate effective priority, and report conflicts or
  unreachable match rules.
- Authority: conservative compile-time diagnostics for the supported
  comparable-pattern subset.
- Inputs: template rules, namespaces, and default element namespace from the
  immutable IR.
- Outputs: priority/shadowing diagnostics and comparable match descriptions.
- Exclusions: runtime template dispatch and general XPath evaluation.

The existing `getComparableTemplateMatchPattern` export remains re-exported
from `analyze.ts`, preserving its current consumer in processor coverage.

### `sampleDocumentAnalysis.ts`

- Subject: optional sample-informed static analysis.
- Responsibility: inventory source names, visit stylesheet XPath contexts,
  and report close element or attribute name candidates.
- Authority: advisory diagnostics derived from an explicitly supplied sample;
  it does not define XML or XPath semantics.
- Inputs: immutable stylesheet IR and sample XML text.
- Outputs: ordered structured typo diagnostics.
- Exclusions: coverage policy, runtime source loading, and stylesheet
  compilation.

### `analysisDiagnostics.ts`

- Subject: private static-analysis diagnostic construction.
- Responsibility: normalize analysis warnings and construct shared template,
  global-binding, source-span, and related-location structures.
- Authority: the common structured shape of diagnostics emitted by these
  passes.
- Inputs: diagnostic fields and source-located IR owners.
- Outputs: validated `DiagnosticReport` values.
- Exclusions: deciding whether a diagnostic exists or selecting its code and
  message.

## Dependency and coupling review

```text
analyze
    -> templateReachabilityAnalysis
        -> analysisDiagnostics
    -> templateMatchAnalysis
        -> analysisDiagnostics
    -> sampleDocumentAnalysis
        -> analysisDiagnostics

all analysis passes
    -> immutable IR / XPath AST / structured diagnostic contracts
```

The pass modules do not import one another, mutate shared state, or receive a
broad analysis context. `analyze.ts` is a 26-line composition root and retains
the prior report sequence: global binding, template priority, sample document,
then per-template binding diagnostics.

Post-extraction physical sizes are:

| Unit | Lines |
| --- | ---: |
| `analyze.ts` | 26 |
| `analysisDiagnostics.ts` | 91 |
| `templateReachabilityAnalysis.ts` | 602 |
| `templateMatchAnalysis.ts` | 472 |
| `sampleDocumentAnalysis.ts` | 498 |

No extracted unit crosses ADR-0004's size-review threshold.

## Conservation evidence

The baseline is commit `23fc0de`, where the complete suite passed 1,016 tests
across 85 files. After extraction:

- `npm run typecheck` passes; and
- 134 focused reachability, binding, priority, sample-document,
  diagnostic-order, codegen-diagnostic, coverage/smoke tests pass across ten
  files.

Additional conservation evidence is green:

- `npm run build` and focused ESLint validation pass;
- native-runtime and smoke coverage pass 171/171 tests; and
- the complete suite passes all 85 test files with 1,016 tests passing, one
  skipped, and two todo. The run retains the XSLT 3.0 MVP+3 result at 73/73 and
  the QT3 MVP+2 supported slice at 2,487/2,487.

A normal MkDocs build completes. Strict mode reaches the same 56 pre-existing
broken-link warnings recorded by the preceding codegen campaign; this record
and its navigation entries add no new documentation warning.

## Reopening triggers

Revisit these boundaries if:

- a pass needs mutable results or traversal state owned by another pass;
- diagnostic ordering moves out of the composition root;
- comparable match analysis starts defining runtime dispatch behavior;
- sample analysis starts loading host resources implicitly;
- common diagnostic construction begins choosing pass-specific policy; or
- a new analysis requires most of two existing pass implementations.

# Stylesheet Compiler Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `2fb7184`

## Purpose

This record applies ADR-0004 to
`src/xslt/compile/stylesheetCompilers.ts`, the stylesheet-level compiler
validation and declaration dispatch facade. It extracts stylesheet declaration
attribute policy without changing compiler orchestration, IR contracts, error
codes, or the module imports used by `compiler.ts`.

## Review and disposition

At checkpoint `2fb7184`, `stylesheetCompilers.ts` contained 1,151 physical
lines and was in ADR-0004's inspect-on-substantive-change band. The unit
combined stylesheet symbol validation, static-context collection, top-level
declaration dispatch, and the supported-attribute policies for the stylesheet
root, `xsl:strip-space`, and `xsl:output`.

The declaration attribute validators share a closed supported/later vocabulary,
namespace handling, source-located `XTSE0090` diagnostics, and spelling
suggestions. They do not own symbol tables, named-template signatures, IR
lowering, or compiler traversal. The disposition is **extract declaration
attribute policy and retain stylesheet orchestration and symbol validation in
the facade**.

## Extracted responsibility

### `stylesheetAttributeValidation.ts`

- Subject: supported stylesheet declaration attributes and output methods.
- Responsibility: validate root, `xsl:strip-space`, and `xsl:output`
  attributes and produce structured, source-aware diagnostics and suggestions.
- Authority: the current MVP+3 supported and known-later attribute/method
  vocabularies for those declarations.
- Inputs: a stylesheet DOM element, source text, and compiler helper contract.
- Output: successful validation or the same structured static error.
- Dependencies: DOM types, source-location helpers, error codes, spelling
  distance, and the type-only stylesheet helper contract.
- Exclusions: stylesheet traversal, template/global symbol validation, QName
  ownership, instruction compilation, and IR construction.

## Dependency and coupling review

```text
compiler.ts
    -> stylesheetCompilers.ts
        -> stylesheetAttributeValidation.ts

stylesheetAttributeValidation.ts
    -- type-only -> StylesheetCompilerHelpers
```

`stylesheetCompilers.ts` continues to export
`validateStylesheetRootAttributes`, so compiler imports remain stable. The
facade calls the extracted strip-space and output validators during top-level
declaration dispatch. The extracted module has no runtime dependency back on
the facade.

Post-extraction, `stylesheetCompilers.ts` contains 707 physical lines and
`stylesheetAttributeValidation.ts` contains 449. Both are below ADR-0004's
size review threshold.

## Conservation evidence

The baseline is commit `2fb7184`, where the complete suite passed 1,019 tests
across 86 files. After extraction:

- `npm run typecheck` and focused ESLint validation pass; and
- all 169 focused stylesheet diagnostics, instruction diagnostics, compiler,
  and smoke tests pass across four files.

Additional conservation evidence is green:

- `npm run build` passes; and
- the complete suite passes all 86 test files with 1,019 tests passing, one
  skipped, and two todo. The run retains the XSLT 3.0 MVP+3 result at 73/73 and
  the QT3 MVP+2 supported slice at 2,487/2,487.

A normal MkDocs build completes. Strict mode reaches the same 56 pre-existing
broken-link warnings recorded by the preceding campaigns; this record and its
navigation entries add no new documentation warning.

## Reopening triggers

Revisit this boundary if:

- declaration attribute policy begins requiring symbol tables or compiled IR;
- supported declaration vocabularies become generated or version-dependent;
- attribute diagnostics diverge enough to warrant declaration-specific owners;
- the helper contract creates a runtime dependency cycle; or
- either retained unit again crosses a review threshold or reveals another
  independently testable owner.

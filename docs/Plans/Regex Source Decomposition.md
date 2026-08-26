# Regex Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `f91cfad`

## Purpose

This record applies ADR-0004 to `src/xpath/eval/regex.ts`, Weaver's XML Schema
regular-expression translator. It separates character-class algebra and
diagnostic construction from whole-pattern translation without changing the
module's public exports or XPath error behavior.

## Review and disposition

At checkpoint `f91cfad`, `regex.ts` contained 1,159 physical lines and was in
ADR-0004's inspect-on-substantive-change band. The unit combined three related
but independently testable responsibilities: whole-pattern validation and
flag/replacement handling, XML Schema character-class translation, and
construction of source-aware XPath errors.

Character-class translation has its own grammar, Unicode block aliases, XML
name escape expansions, subtraction algebra, and validation rules. It does not
need replacement-string handling or public regex function orchestration. Error
construction is a small shared contract used by both translation layers. The
disposition is **extract character-class translation and diagnostic
construction, while retaining whole-pattern orchestration in `regex.ts`**.

## Extracted responsibilities

### `regexCharacterClasses.ts`

- Subject: XML Schema regular-expression character classes.
- Responsibility: parse and translate class expressions, subtraction,
  property escapes, and XML name-character escapes to JavaScript-compatible
  forms.
- Authority: character-class syntax and the Schema Unicode-block alias table.
- Inputs: pattern text, cursor positions, flags, and optional source spans.
- Outputs: translated fragments and updated cursor positions.
- Exclusions: whole-pattern anchoring, replacement strings, regex compilation,
  public XPath functions, and runtime matching.

### `regexDiagnostics.ts`

- Subject: source-aware regex translation failures.
- Responsibility: construct structured `XPathError` values while preserving
  optional source spans.
- Authority: the shared span shape used by the regex translation modules.
- Inputs: XPath error code, message, and optional span.
- Output: an `XPathError` with source metadata when available.
- Exclusions: deciding which syntax is invalid or which error code applies.

## Dependency and coupling review

```text
XPath regex functions
    -> regex.ts
        -> regexCharacterClasses.ts
            -> regexDiagnostics.ts
        -> regexDiagnostics.ts
```

`regex.ts` remains the public facade and re-exports the existing XML name
class constants and `RegexSpanLike` type. The extracted modules depend only on
XPath error codes and the structured error type; they do not import function
registration or evaluation state.

Post-extraction, `regex.ts` contains 678 physical lines,
`regexCharacterClasses.ts` contains 566, and `regexDiagnostics.ts` contains
22. Every unit is below ADR-0004's size review threshold.

## Conservation evidence

The baseline is commit `f91cfad`, where the complete suite passed 1,019 tests
across 86 files. After extraction:

- `npm run typecheck` passes; and
- all 28 focused regex translator, regex function, and built-in function tests
  pass across three files.

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

- character-class translation begins depending on evaluator or function
  registration state;
- Unicode property support moves to generated data or a versioned contract;
- JavaScript target capabilities require multiple character-class backends;
- error span propagation diverges between translation layers; or
- either retained unit again crosses a review threshold or reveals another
  independently testable owner.

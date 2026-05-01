# Errors — structured diagnostics and runtime failures

This document defines the error-reporting model for Weaver (`@arakendo/xslt`) across
XPath, XSLT, serialization, the future CLI/watch-mode surface, codegen, and downstream
editor or debugger tooling.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md), especially DEC-007 and DEC-013,
and [DIFFERENTIATORS.md](./DIFFERENTIATORS.md), especially D1. Those documents define
why diagnostics matter; this file defines the durable shape of the error and diagnostic
contract. See also [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md) for the
cross-cutting rules behind structured-vs-formatted diagnostics, provenance
tier clarity, and the requirement that boundary translations preserve meaning.

## Goals

- Give every diagnosable failure a stable machine-readable identity.
- Preserve source locations, related locations, and runtime call context as errors propagate.
- Use one structured report shape for parse errors, static diagnostics, runtime failures,
  watch-mode output, and future editor integration.
- Keep the canonical code aligned with W3C XPath/XSLT/serialization codes whenever the spec
  defines one.
- Translate errors to human-readable text, JSON, logs, or editor squiggles only at system
  boundaries.
- Keep generated-code and interpreter diagnostics semantically equivalent.

## Non-goals

- Inventing a second primary error taxonomy when the spec already gives us W3C codes.
- Replacing local TypeScript error classes with one giant enum-like mega-object.
- Making core XPath/XSLT code know about terminal colors, JSON envelopes, or watch-mode UX.
- Parsing formatted error strings after the fact.
- Treating compiler diagnostics and runtime errors as unrelated systems.

## Core model

Weaver has two closely related shapes:

1. **`XdmError`**: throwable internal error object used inside the engine.
2. **`DiagnosticReport`**: plain JSON-serializable boundary shape used for formatting,
   watch mode, tests, codegen parity, and future editor integration.

The rule is:

- Internal code may throw `XdmError` or a subclass.
- Boundary code translates it to `DiagnosticReport`.
- Human-readable formatting is done from `DiagnosticReport`, not by inventing strings in many places.

## Identity model

### Primary code: W3C first

When XPath, XSLT, or serialization defines a code, that code is the canonical identity.

Examples:

```txt
XPST0003
XPDY0002
XPTY0004
XTSE0010
XTDE0040
SENR0001
```

This is better than introducing a second parallel naming system because:

- users already see these codes in the spec and existing tooling
- conformance tests key off these codes
- the current engine already models them in `src/errors/codes.ts`

### Weaver-local codes

Use Weaver-local codes only when the failure is outside W3C language semantics, such as:

- codegen emitter failures
- source-map generation failures
- watch-mode file resolution failures
- internal invariant failures where no W3C code fits

Suggested format:

```txt
WEAVER_<AREA>_<REASON>
```

Examples:

```txt
WEAVER_CODEGEN_EMIT_FAILED
WEAVER_SOURCEMAP_BUILD_FAILED
WEAVER_WATCH_RESOLVE_FAILED
WEAVER_INTERNAL_IR_INVARIANT_FAILED
```

Local codes should stay rare. If a W3C code is even reasonably correct, prefer it.

## Report shape

A durable `DiagnosticReport` should carry these fields:

```ts
export type DiagnosticPhase =
  | 'compile'
  | 'runtime'
  | 'serialization'
  | 'codegen'
  | 'internal';

export type DiagnosticSeverity = 'error' | 'warning' | 'note';

export type DiagnosticCategory =
  | 'syntax'
  | 'type'
  | 'resolution'
  | 'analysis'
  | 'execution'
  | 'serialization'
  | 'internal';

export interface SourceSpan {
  uri?: string;
  offsetStart: number;
  offsetEnd: number;
  lineStart: number;
  columnStart: number;
  lineEnd: number;
  columnEnd: number;
}

export interface RelatedSpan {
  label: string;
  span: SourceSpan;
}

export interface DiagnosticFrame {
  kind: 'template' | 'instruction' | 'xpath' | 'function' | 'mode';
  label: string;
  span?: SourceSpan;
}

export type KnownDetailKind =
  | 'sequenceType'
  | 'qname'
  | 'axis'
  | 'functionSignature'
  | 'templateRef'
  | 'instructionRef';

export type DiagnosticDetailValue =
  | string
  | number
  | boolean
  | { kind: KnownDetailKind | string; [key: string]: unknown };

export interface DiagnosticDetail {
  key: string;
  value: DiagnosticDetailValue;
}

export type DiagnosticSuggestionKind = 'fix' | 'hint' | 'alternative';

export interface DiagnosticSuggestion {
  kind: DiagnosticSuggestionKind;
  label: string;
  replacement?: string;
  confidence?: number;
}

export interface DiagnosticReport {
  code: string;
  phase: DiagnosticPhase;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  primary?: SourceSpan;
  related: readonly RelatedSpan[];
  frames: readonly DiagnosticFrame[];
  details: readonly DiagnosticDetail[];
  suggestions: readonly DiagnosticSuggestion[];
  causes: readonly DiagnosticReport[];
}
```

The important design choice is that `details`, `related`, `frames`, `suggestions`,
and `causes` are structured. They must not be collapsed back into the message string.

## Why not a Tosumu-style status enum?

Tosumu uses statuses like `Busy`, `Conflict`, and `IntegrityFailure` because it is a
storage engine with CLI/process boundaries.

Weaver is a compiler/runtime product. The broad policy axes that matter here are:

- **`code`**: stable identity
- **`phase`**: when in the lifecycle it happened
- **`category`**: what kind of problem it is
- **`severity`**: how serious it is

That is a better fit than a database-style status enum.

If we later need exit-code policy for a CLI, it should be derived from `phase` and
`severity`, with code-specific overrides where necessary.

`phase` is intentionally coarse. `compile` includes lexing, parsing, resolution,
static analysis, and compile-time type checking. Finer distinctions belong in
`category` and, when useful, structured `details` such as `analysisPass: 'type'`.

`category` is intentionally about **problem kind**, not lifecycle. That means:

- `phase = 'runtime'`, `category = 'execution'` is meaningful
- `phase = 'runtime'`, `category = 'execution'` is the right pairing for evaluator failures

If a category starts restating a phase, the category is wrong.

## Source locations

Diagnostics-first means source locations are not optional metadata.

`SourceSpan` must use one canonical coordinate system:

- `uri`: source identity for files, virtual buffers, or generated artifacts
- `offsetStart` / `offsetEnd`: **UTF-16 code unit offsets**
- `lineStart` / `columnStart` / `lineEnd` / `columnEnd`: 1-based human-facing positions

The UTF-16 rule is deliberate because this project lives in TypeScript, source maps,
and editor tooling that already operate in UTF-16 offsets. If one part of the engine
uses bytes and another uses UTF-16, diagnostics will drift.

Rules:

1. Tokens carry full spans.
2. XPath AST nodes carry full spans.
3. Stylesheet AST and IR nodes carry full spans.
4. Runtime failures keep the most precise XPath or instruction span available.
5. Codegen preserves source-map fidelity so generated-code failures can still be reported
   against the original `.xsl`.

A location-lite error is incomplete, not merely less polished.

## Related spans

Many Weaver failures need more than one location.

Examples:

- the current offending XPath expression
- the containing template match declaration
- the `apply-templates` call site that invoked it
- the conflicting template when priorities overlap
- the previous declaration when a name is duplicated

These secondary locations belong in `related`, not in prose-only messages.

Example:

```txt
XTSE0010: unknown XSLT element `xsl:vale-of`

  at invoice.xsl:42:4
       <xsl:vale-of select="total"/>
        ^^^^^^^^^^^

related:
  did you mean `xsl:value-of`
```

## Runtime frames

Dynamic errors need call context, not just a single point location.

A runtime diagnostic should be able to say:

- which template was executing
- which instruction failed
- which caller invoked that template
- which mode or function context applied

This is the Weaver equivalent of Tosumu preserving error cause and structured context.

Suggested frame examples:

```txt
in template match="invoice/total" (invoice.xsl:39)
called from apply-templates select="total" (invoice.xsl:24)
```

These should come from structured `frames`, not be assembled ad hoc in every formatter.

## Suggestions

Suggestions are part of the product, not optional polish.

Use them for cases like:

- misspelled XSLT instruction names
- misspelled function names
- unknown variable names with close matches
- obvious replacement for invalid string/number concatenation

Suggestions should be represented structurally:

```ts
{
  kind: 'fix',
  label: 'did you mean',
  replacement: "concat(string(amount), ' USD')",
  confidence: 0.92,
}
```

That lets different boundaries render them differently while preserving the same meaning.

`confidence` must use a stable `0.0..1.0` scale:

- `1.0`: deterministic fix; safe for auto-apply if the boundary supports it
- `0.5`: likely suggestion; good default for editor hints and ranked alternatives
- `< 0.3`: weak hint; show only when the boundary wants low-confidence guidance

If a suggestion generator cannot explain its confidence policy, it should omit the field.

## Throwable shape inside the engine

`XdmError` and its subclasses should stay as the engine-facing throwable types:

```txt
XdmError
├─ XPathError
├─ XsltError
└─ SerializationError
```

`XdmError` should grow to carry the structured information needed to produce a
`DiagnosticReport`, for example:

- `code`
- `message`
- `phase`
- `category`
- `primary`
- `related`
- `frames`
- `details`
- `suggestions`
- JS-native `cause`

The engine throws `XdmError`; boundaries call something like `toDiagnosticReport()`.

Inside the engine, a thrown `XdmError` may still use JS-native `Error.cause`. At the
boundary, that is normalized into `causes: readonly DiagnosticReport[]`. The durable
report contract should use plural `causes` because static analysis and aggregated
compile errors can legitimately have more than one underlying diagnostic.

Normalization rules:

- If `cause` is another `XdmError`, convert it to a `DiagnosticReport` and append it.
- If `cause` is already a `DiagnosticReport`, append it directly.
- If `cause` is an unknown `Error`, project it to a single `WEAVER_INTERNAL_*` diagnostic
  with preserved message text in `details`.
- Flatten cause chains during boundary conversion; do not create recursively nested
  `DiagnosticReport` trees-of-trees when a flat `causes[]` list preserves the meaning.
- Boundary formatters should guard against cycles even if the engine accidentally creates one.

## Formatter boundary

Human-readable text should be produced by a dedicated diagnostics module, not by hand-building
strings all over the engine.

Planned boundary:

```txt
src/diagnostics/
  report.ts      // DiagnosticReport types and conversions
  format.ts      // formatDiagnostic(report, sourceText)
  json.ts        // JSON-safe projection if needed later
```

For MVP+1, the minimum formatter output is the D1-style caret format:

```txt
XPTY0004: expected xs:string, got xs:integer (1)

  at invoice.xsl:42:18
         <xsl:value-of select="amount + ' USD'"/>
                                      ^^^^^^^^^
  in template match="invoice/total" (invoice.xsl:39)
  called from apply-templates select="total" (invoice.xsl:24)

did you mean: concat(string(amount), ' USD')
```

## Compile-time diagnostics vs runtime failures

Weaver should use one shared report shape for both:

- parse errors
- static analysis findings
- type mismatches
- runtime transform failures
- serialization failures
- codegen failures

The only meaningful difference is the combination of `phase` and `severity`.

Examples:

- parse failure: `phase = 'compile'`, `category = 'syntax'`, `severity = 'error'`
- unreachable template: `phase = 'compile'`, `category = 'analysis'`, `severity = 'warning'`
- compile-time type failure: `phase = 'compile'`, `category = 'type'`, `severity = 'error'`
- type mismatch in evaluation: `phase = 'runtime'`, `category = 'type'`, `severity = 'error'`
- sourcemap emit bug: `phase = 'codegen'`, `category = 'internal'`, `severity = 'error'`

This keeps watch mode, tests, interpreter, and codegen on one contract.

## Details usage

Use `details` for stable, machine-meaningful fields such as:

- `expectedType`
- `actualType`
- `functionName`
- `variableName`
- `mode`
- `axis`
- `templateMatch`
- `instructionKind`

Do not duplicate prose in `details`, and do not store large opaque payloads there.

Some details are inherently structured and should stay that way. Examples:

```ts
{ key: 'expectedType', value: { kind: 'sequenceType', raw: 'xs:string?' } }
{ key: 'functionName', value: { kind: 'qname', prefix: 'fn', local: 'concat' } }
{ key: 'axis', value: { kind: 'axis', name: 'descendant-or-self' } }
```

If a detail needs later comparison, grouping, or transformation, do not squeeze it
into a string too early.

## Classification invariants

This design only stays useful if the contract is validated.

At minimum, development builds or test helpers should have an invariant check such as
`assertValidDiagnostic(report)`.

Suggested checks:

- W3C codes match their expected family shape when not using a `WEAVER_*` local code
- `phase`, `category`, and `severity` are present and internally consistent
- `primary` and `related` spans use valid UTF-16 offset ordering
- code families and categories line up reasonably (`XPST*` should not ship as `category = 'execution'`)
- code-specific required details exist when the engine depends on them

This does not need to become a framework. It does need to be strict enough that no one
can casually ship `code: 'oops'` and call it structured diagnostics.

Required details should be explicit rather than implied in prose. A small map is enough:

```ts
const REQUIRED_DETAILS: Record<string, readonly string[]> = {
  XPTY0004: ['expectedType', 'actualType'],
  XPST0017: ['functionName'],
  XTDE0040: ['mode'],
  XTSE0165: ['href'],
};
```

This table should stay deliberately small and only cover codes where missing detail fields
would make the diagnostic materially less useful.

## Immutability at the boundary

`DiagnosticReport` is a contract object. Treat it as immutable once created.

In practice that means one of:

- construct reports through small factory helpers
- freeze reports before exposing them at boundaries
- avoid in-place mutation after formatting, testing, or boundary translation begins

The exact mechanism is less important than the rule: boundary diagnostics should not be
mutable bags of fields that different layers casually rewrite.

## Boundary translation

Different boundaries may render the same `DiagnosticReport` differently:

- CLI compile/run command: rich human-readable stderr
- watch mode: streaming formatted diagnostics to stdout/stderr
- tests: byte-exact golden strings or object snapshots
- editor tooling: squiggles, hover, related locations, quick fixes
- codegen parity tests: compare structured reports between interpreter and generated code

The stable contract is the report object, not any specific renderer.

## Semantic parity rule

A feature that exists in both interpreter and codegen backends should produce equivalent
structured diagnostics, not merely similar prose.

Parity means:

- same canonical `code`
- same `phase`, `category`, and `severity`
- same primary span when the same source is available
- same relevant `details`
- same logical suggestions

String wording may differ slightly in development, but the structured meaning must match.

## Suggested module ownership

Start small.

Suggested first implementation:

```txt
src/errors/
  XdmError.ts
  XPathError.ts
  XsltError.ts
  SerializationError.ts
  codes.ts

src/diagnostics/
  report.ts
  format.ts
```

Why this shape:

- the error class hierarchy already exists in `src/errors/`
- formatter logic should not live inside engine exceptions
- diagnostics are a first-class product surface and deserve their own module

## Rollout plan

### Phase 1 — MVP+1 diagnostic bones

- expand `SourceLocation` into a full source span shape
- introduce `DiagnosticReport`
- add `toDiagnosticReport()` conversion from `XdmError`
- add `formatDiagnostic(report, sourceText)`
- lock one or two byte-exact formatter tests for XPath parse/type failures

### Phase 2 — XPath evaluator context

- add structured `details` for expected/actual type, function names, and context failures
- make evaluator errors emit structured `phase = 'runtime'`
- extend QT3-focused tests to assert codes and structured fields where practical

### Phase 3 — XSLT runtime context

- add runtime `frames` for template, instruction, caller chain, and mode
- add `related` spans for containing template and caller locations
- ensure apply-templates and template dispatch preserve this information

### Phase 4 — codegen parity

- make generated TypeScript reconstruct or emit equivalent `DiagnosticReport` values
- compare interpreter and codegen diagnostics in fixture tests
- ensure source maps preserve XSLT-facing locations

### Phase 5 — watch mode and editor surfaces

- stream formatted diagnostics in watch mode
- add a JSON-safe projection if a future CLI or editor protocol needs it
- preserve one stable report contract across all user-facing surfaces

## Rules to keep this small

- No string parsing as control flow.
- No second naming system when a W3C code already exists.
- No giant formatter switch scattered across parser, evaluator, compiler, and codegen.
- No boundary-specific concepts inside core XPath/XSLT logic.
- No feature is done if it still produces poor diagnostics.

The goal is not an error framework. The goal is a stable, inspectable, product-quality
contract for failures and diagnostics that makes XSLT debugging stop feeling punitive.

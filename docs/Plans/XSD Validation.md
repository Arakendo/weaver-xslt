# XSD Validation Design

This note defines the intended XSD feature boundary for Weaver.

The short version:

- XSD belongs in Weaver as a diagnostics-first boundary tool.
- It should be implemented as optional preflight validation, not as schema-aware XSLT.
- It should land before streaming and before `1.0`, but after the core XSLT engine and conformance work are stable enough that it does not distract from the main product line.

## Product position

Weaver's product thesis is readable, debuggable XSLT in normal TypeScript
toolchains. XSD support helps that thesis when it catches bad input early and
explains the problem well.

It does not help the thesis if it turns the engine into a partial clone of a
schema-aware enterprise processor.

The intended pipeline is:

```txt
xml source
  -> optional XSD preflight validation
  -> Weaver transform
  -> output
```

That keeps XSD at the XML boundary instead of making it a semantic dependency of
the compiler, the IR, or both execution backends.

## Goals

- Catch invalid input XML before transform execution.
- Produce structured diagnostics with precise XML locations.
- Let hosts choose whether schema failures stop execution or surface as
  warnings.
- Reuse Weaver's existing diagnostics and XML-boundary design instead of
  creating a separate reporting model.
- Keep the implementation small enough to ship as a bounded increment.

## Non-goals

These are explicitly out of scope for the first XSD increment:

- Schema-aware XPath or XSLT typing.
- PSVI-style typed node annotations flowing through the engine.
- Full XSD 1.0 or 1.1 feature coverage.
- Full support for `xs:import`, `xs:include`, `xs:redefine`, substitution
  groups, identity constraints, assertions, or advanced derivation rules.
- Using schemas to change template dispatch, expression semantics, or codegen
  shape.
- Turning `xsl:import-schema` into executable schema-aware XSLT. Per the
  roadmap, that remains parse-only in MVP+8.

## Recommended roadmap placement

XSD should be sooner than `1.0`, but not before the core engine maturity work.

Recommended slot:

- after MVP+9
- before the separately tracked streaming work
- effectively a candidate `MVP+9.5 — XSD preflight validation`

Why this slot fits best:

- MVP+8 finishes the non-streaming XSLT 3.0 surface, including parse-only
  `xsl:import-schema`, which gives the compiler a stable place to recognize
  schema-related syntax without promising schema-aware execution.
- MVP+9 is the credibility and conformance push. That needs focus. XSD should
  not dilute the engine's core pass-rate work before Weaver can honestly claim a
  strong non-schema baseline.
- Streaming is a separately tracked execution-model project. XSD
  preflight is smaller, more bounded, and more diagnostics-centric. It is the
  better candidate to land first.
- `1.0` is at MVP+12. Waiting until after `1.0` would defer a
  high-value diagnostics feature longer than necessary.

Practical guidance:

- Do not start XSD before MVP+8 and MVP+9 are stable.
- Do start XSD before streaming if the team wants one more bounded, customer-
  visible quality feature before the execution-model work gets deeper.

## Public API shape

The boundary should be explicit.

Preferred shape:

```ts
type ValidationMode = 'off' | 'warn' | 'error';

interface XsdSchemaInput {
  readonly uri: string;
  readonly text: string;
}

interface XsdPreflightOptions {
  readonly xml: string;
  readonly sourceName?: string;
  readonly schemas: readonly XsdSchemaInput[];
  readonly mode?: ValidationMode;
}

interface PreflightResult {
  readonly ok: boolean;
  readonly reports: readonly DiagnosticReport[];
}

declare function preflight(options: XsdPreflightOptions): PreflightResult;
```

Transform integration can then stay thin and policy-driven:

```ts
transform({
  xml,
  xslt,
  validation: {
    schemas: [{ uri: 'invoice.xsd', text: invoiceSchema }],
    mode: 'error',
  },
});
```

The transform API should internally call the same preflight boundary rather than
inventing a second validation path.

## Initial feature slice

The first shippable slice should support one practical subset well.

### Supported schema constructs

- top-level `xs:schema`
- global `xs:element` declarations
- `xs:complexType`
- `xs:sequence`
- `xs:attribute`
- `use="required"`
- `minOccurs` and `maxOccurs`
- built-in simple types needed for common business XML:
  - `xs:string`
  - `xs:boolean`
  - `xs:integer`
  - `xs:decimal`
  - `xs:double`
  - `xs:date`
  - `xs:dateTime`

### Initial validation rules

- root element matches a declared global element
- required child elements are present
- child elements appear in the required sequence order
- child element multiplicity is respected
- required attributes are present
- attribute and text values satisfy supported built-in types

### Explicitly deferred

- `xs:choice`
- `xs:all`
- namespaces beyond the minimum needed to resolve declared names correctly
- complex simple-type facets beyond a small lexical-value subset
- identity constraints such as keys, keyrefs, and uniques
- schema composition across multi-file import graphs

## Diagnostics model

XSD validation must emit normal Weaver diagnostics, not ad hoc strings.

Each validation failure should produce a `DiagnosticReport` with:

- a machine-readable code in a dedicated XSD range
- a primary span pointing at the XML source location
- optional related spans pointing at the schema declaration location
- stable detail fields for expected element, actual element, expected type,
  actual lexical value, and occurrence expectations
- suggestions only when the engine can make a concrete, non-fabricated guess

Example categories:

- unexpected element
- missing required element
- missing required attribute
- invalid lexical value for built-in type
- child order violation
- too many occurrences

Example shape:

```txt
XSDV1003: Element <total> must appear before <currency> inside <invoice>.

invoice.xml:14:5
  <currency>USD</currency>
   ^^^^^^^^^^^^^^^^^^^^^^

Related:
  invoice.xsd:22:7
  xs:sequence for invoiceType declares total before currency
```

## Architecture

The implementation should live in an engine-owned XSD boundary:

```txt
src/xsd/
  ast.ts
  parse.ts
  compile.ts
  validate.ts
  diagnostics.ts
```

Responsibilities:

- `parse.ts`
  - parse XSD XML through the shared XML boundary in `src/xml/parse.ts`
  - preserve source locations for schema nodes
- `ast.ts`
  - define the minimal schema AST for the supported subset
- `compile.ts`
  - normalize AST into a validation plan optimized for source-document checks
- `validate.ts`
  - walk the source XML against the compiled schema plan
- `diagnostics.ts`
  - translate validation failures into `DiagnosticReport`

This should remain separate from:

- `src/xslt/compile/`
- `src/xslt/codegen/`
- `src/xpath/`

except for shared diagnostics and XML parsing infrastructure.

## Execution model

The first XSD slice should be interpreter-style validation logic even when the
transform later runs through codegen.

Reasoning:

- It is boundary work, not a hot-path transform feature.
- It avoids inventing a second schema-validation backend.
- It keeps the schema verdict independent from whether the caller later uses the
  interpreter backend, direct native execution, or emitted native modules.

If performance becomes an issue later, the compiled validation plan can be made
more efficient without turning schema validation into generated TypeScript.

## Streaming interaction

The first XSD increment should not block on streaming.

Two rules keep the scope honest:

- XSD preflight may be non-streaming in v1.
- Streaming-compatible validation, if needed later, is a separate increment.

That matters because a customer asking for streaming usually cares about very
large inputs, and validating the full document tree up front may conflict with
that usage. That is acceptable for v1 because the feature is optional and the
tradeoff is explicit.

## Testing strategy

The first increment should ship with three test layers.

- focused parser tests for supported XSD subset syntax
- focused validator tests for each failure category
- end-to-end preflight fixtures proving host policy behavior:
  - `off` ignores reports
  - `warn` returns reports and still allows transform
  - `error` blocks transform

Suggested fixture families:

- valid invoice XML against invoice schema
- missing required element
- wrong child order
- invalid decimal total
- missing required attribute
- undeclared root element

## Exit criteria for the first XSD increment

- One-schema preflight works end-to-end through a public API.
- Supported subset diagnostics are source-located in both XML and schema files.
- `warn` and `error` policy behavior is covered by tests.
- The feature does not change XSLT semantics, IR shape, or native codegen.
- The design note and public docs clearly say this is preflight validation, not
  schema-aware XSLT.

## Decision summary

Weaver should add XSD support as optional preflight validation.

It should be scheduled after the core non-streaming XSLT and conformance work,
but before streaming and before `1.0`.

If the roadmap is later revised, the safest wording is:

- not before MVP+8
- preferably after MVP+9
- definitely before any attempt to pair XSD with streaming semantics

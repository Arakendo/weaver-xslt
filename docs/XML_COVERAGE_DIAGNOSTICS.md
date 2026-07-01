# XML Coverage Diagnostics — flagging unhandled source tags at transform time

> Status: **proposed**. This is a design note for a runtime warning feature,
> not an implemented capability.
>
> How Weaver can warn when an input XML document contains element or attribute
> names that the compiled stylesheet has no explicit way to process, and surface
> those warnings from the emitted transform module itself.

This document is a design note, not a shipped feature. It describes how to bake
a "possible unhandled XML tag" check into the compiled output so it runs during
`transform(...)`, rather than living in an external audit script.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md) (IR is the contract, native
emission is the product), [DIAGNOSTIC_INTRINSICS.md](./DIAGNOSTIC_INTRINSICS.md)
(compiler-recognized observability surface), [ERRORS.md](./ERRORS.md) (typed
diagnostics), and [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md) (where
meaning boundaries stay explicit).

Related design context:

- [ROADMAP.md](./ROADMAP.md) for increment placement
- [WORKBENCH_API.md](./WORKBENCH_API.md) for host-facing result surfaces
- the S1000D HTML health audit in `Audits/` for the motivating real-world class
  of silent coverage holes this feature is intended to expose earlier

## Motivation

When a large stylesheet such as an S1000D presentation transform is lowered to
IR and emitted as TypeScript/JS, a missing or under-implemented branch does not
usually crash. It silently produces a thinner document. The symptom shows up
downstream as a sparse HTML output, and today the only way to find it is to
audit the output by hand.

The goal is to move that signal upstream and inside the product: when a user
runs the emitted transform against real XML, the transform should be able to
report the input tags that it had no explicit coverage for.

This is a **warning channel**, not a correctness gate. XSLT legitimately handles
many elements generically, so the feature must express _possible_ gaps with a
confidence level, never assert a definite bug.

## Goals and non-goals

### Goals

- surface likely source-XML coverage gaps from the emitted transform itself
- keep the signal namespace-aware and grounded in stylesheet structure, not in
  final HTML shape
- preserve parity across interpreter, native direct, and emitted-module
  execution paths
- make the check opt-in at runtime and cheap to omit from builds that do not
  need it

### Non-goals

- proving full stylesheet reachability or semantic completeness
- requiring one template per input element name
- introducing Node-specific dependencies into the core engine
- turning coverage findings into hard transform failures by default
- replacing source-location diagnostics that point at stylesheet code

## What "coverage" means here

An input element or attribute name is considered **explicitly covered** if the
stylesheet references it in a load-bearing position:

- a template `match=` pattern whose name test can select it
- a `select=` / `test=` / predicate path that references the name
- a named-key or grouping expression that references the name

It is considered **generically covered** if it is only reached through broad
handling:

- wildcard name tests (`*`)
- `node()` / `text()` kind tests
- default built-in template behavior and broad `xsl:apply-templates`

It is considered a **possible gap** if it appears in the XML but falls into
neither explicit nor plausible generic handling.

This mirrors the classification the interpreter and codegen already reason about
when they inspect `nodeTest.kind === 'nameTest'` versus wildcard/kind tests.

## Grounding in the current codebase

Weaver already has most of the machinery this feature needs; the work is mostly
about relocating and productizing it.

### 1. There is already a compile-time precedent

`analyzeStylesheet(...)` in
[src/xslt/compile/analyze.ts](../src/xslt/compile/analyze.ts) already accepts an
optional `sampleDocument` and runs `collectSampleDocumentNameDiagnostics(...)`.
That pass:

- parses a sample XML document
- collects element and attribute names by namespace via
  `collectSampleDocumentNames(...)`
- walks stylesheet XPath expression contexts via
  `collectXPathExpressionContexts(...)`
- emits diagnostics when a sampled name looks like a typo relative to what the
  stylesheet references

This is conceptually the inverse of what we want. That pass asks "does the
stylesheet reference a name the sample almost has?" The coverage check asks
"does the sample contain a name the stylesheet never meaningfully references?"
The same two inventories power both.

### 2. There is already a comparable match-pattern model

`ComparableTemplateMatchPattern` and `getComparableTemplateMatchPattern(...)` in
[src/xslt/compile/analyze.ts](../src/xslt/compile/analyze.ts) already reduce
template match patterns to `name` / `wildcard` / `node` / `text` steps. That is
exactly the shape needed to decide whether a given element name is explicitly
matched, generically matched, or unmatched.

### 3. The emit already carries the IR into the module

`emitStylesheetModule(...)` in
[src/xslt/codegen/emit.ts](../src/xslt/codegen/emit.ts) emits:

- `const stylesheet = <serialized IR> satisfies StylesheetIR;`
- `export function transform(sourceXml, ctx) { return transformCompiledStylesheet(stylesheet, sourceXml, ctx); }`

So the emitted module already has a compile-time-derived data structure sitting
next to the runtime entry point. A coverage manifest can ride along the same
way.

### 4. The runtime entry point is a single funnel

`transformCompiledStylesheet(...)` in
[src/runtime/index.ts](../src/runtime/index.ts) is the one place every emitted
module calls into, and it returns a `TransformResult` from
[src/processor/types.ts](../src/processor/types.ts). That is the natural place
to run the check and the natural shape to attach warnings to.

## Design

### Step 1 — build a coverage manifest at compile time

Add a coverage-manifest builder next to the existing analysis code. It consumes
the IR and produces a compact, serializable model:

```ts
interface StylesheetCoverageManifest {
  /** Element localnames (by namespace) with an explicit template match. */
  matchedElements: Readonly<Record<string, readonly string[]>>;
  /** Names referenced by select/test/predicate/key expressions. */
  referencedNames: Readonly<Record<string, readonly string[]>>;
  /** Attribute names referenced explicitly in XPath or attribute-oriented tests. */
  referencedAttributes: Readonly<Record<string, readonly string[]>>;
  /** True when the stylesheet has wildcard / node() handling that could
   *  plausibly process arbitrary elements. */
  hasGenericElementHandling: boolean;
  /** True when the stylesheet has broad attribute handling such as @* patterns. */
  hasGenericAttributeHandling: boolean;
  /** True when broad apply-templates default behavior is in play. */
  hasDefaultTemplateTraversal: boolean;
}
```

The builder reuses:

- `getComparableTemplateMatchPattern(...)` to populate `matchedElements` and to
  set `hasGenericElementHandling` when a pattern reduces to a wildcard/node step
- `collectXPathExpressionContexts(...)` plus name-test walking to populate
  `referencedNames`

The manifest is intentionally name-based and namespace-aware. It is not a full
reachability proof; it is a coverage heuristic input.

The important constraint is that the manifest should capture only information
the compiler can defend from the IR. It should not guess from output shape, text
content, or host conventions.

### Step 2 — emit the manifest into the module

Extend `emitStylesheetModule(...)` to also serialize the manifest:

```ts
const coverage = <serialized manifest> satisfies StylesheetCoverageManifest;
```

Keep it separate from the IR so it can be tree-shaken or omitted when the
feature is disabled. Emission stays readable per the architecture rules, and the
manifest is small relative to the serialized IR.

The compile-time control and the runtime control are different knobs:

- compile-time decides whether the artifact carries the manifest at all
- runtime decides whether a specific transform invocation spends time producing
  warnings from that manifest

### Step 3 — run the check inside the transform funnel

Add an opt-in coverage pass in `transformCompiledStylesheet(...)` (or a helper it
calls). During or before the transform, walk the parsed source document once and
build a name inventory using the same logic as `collectSampleDocumentNames(...)`
so element/attribute collection stays consistent with the compile-time pass.

Then classify each observed name against the manifest:

- element name is in `matchedElements` or `referencedNames` -> covered, no warning
- attribute name is in `referencedAttributes` -> covered, no warning
- name is not covered but `hasGenericElementHandling` or
  `hasDefaultTemplateTraversal` is true -> `medium` confidence warning for
  elements
- attribute name is not covered but `hasGenericAttributeHandling` is true ->
  `medium` confidence warning for attributes
- name is not covered and no generic handling exists -> `high` confidence
  warning

The single-walk cost is proportional to input size and can be gated so it does
not affect hot-path transforms that opt out.

The classification should aggregate by `(nodeKind, namespaceUri, localName)` and
report counts, not one warning per node instance. The intent is "tell me which
shapes looked uncovered," not "spam me for every occurrence."

### Step 4 — surface warnings on the result

Extend `TransformResult` in
[src/processor/types.ts](../src/processor/types.ts) with an optional,
non-breaking field:

```ts
interface TransformCoverageWarning {
  code: 'possible_unhandled_xml_tag';
  nodeKind: 'element' | 'attribute';
  namespaceUri: string;
  localName: string;
  count: number;
  confidence: 'high' | 'medium';
  message: string;
}

interface TransformResult {
  output: string;
  // ...existing fields...
  coverageWarnings?: readonly TransformCoverageWarning[];
}
```

Because the field is optional, existing consumers are unaffected, and the
emitted `transform(...)` contract stays stable.

This should remain a dedicated result field rather than being forced into the
existing stylesheet/source-location diagnostic report shape. A coverage warning
is about observed runtime input, often without a single owning stylesheet span,
so modeling it as transform output is a better fit than pretending it is a
normal compile diagnostic.

## Control surface

The check should be explicitly opt-in and cheap to disable, consistent with the
diagnostics-first-but-not-noisy posture in
[DIAGNOSTIC_INTRINSICS.md](./DIAGNOSTIC_INTRINSICS.md).

Suggested `TransformContext` option:

```ts
interface TransformOptions {
  // ...existing options...
  coverage?: {
    /** off by default; when true, populate result.coverageWarnings */
    report?: boolean;
    /** minimum confidence to include; defaults to 'high' */
    minConfidence?: 'high' | 'medium';
  };
}
```

Compile-time toggles decide whether the manifest is emitted at all, so a build
that never wants this pays no size cost.

One reasonable packaging surface is to carry this behind the existing artifact
emission/options boundary rather than inventing a dedicated standalone feature
switch. The doc does not require a CLI flag yet, but if one is added later it
should align with the existing compile/emit controls rather than bypass them.

## Avoiding false positives

The main risk is warning on tags that are handled generically and intentionally.
Mitigations:

- treat any wildcard/`node()` handling as generic coverage that downgrades a
  warning to `medium` rather than `high`
- treat default built-in traversal the same way: it can explain why a node was
  visited, but it does not prove the stylesheet produced meaningful output for
  that node
- default the reported set to `high` confidence only
- namespace-qualify every name so cross-namespace collisions do not mask or
  fabricate coverage
- allow a stylesheet-author allowlist later (for tags known to be ignored on
  purpose) if noise proves to be a problem

The practical rule is conservative:

- explicit name-based evidence suppresses a warning
- wildcard/default traversal can only downgrade confidence
- wildcard/default traversal never upgrades a name to "definitely handled"

That rule matters because broad `xsl:apply-templates`, `match="*"`, and
built-in template behavior are common in real XSLT. They are evidence of
possible intent, not proof that a missing branch is harmless.

What this feature must not do:

- infer holes purely from emitted HTML shape
- assume every input element needs a dedicated template
- promote coverage warnings to hard errors by default
- treat broad traversal as proof of correctness; wildcard handling reduces
  confidence, it does not prove the stylesheet did something useful

## Parity and testing

Per DEC-010 (both backends, same tests), the classification must agree across
interpreter, native direct, and native emitted execution, because all three
share the IR-derived manifest and the same source-name inventory logic.

Suggested tests:

- a stylesheet with an explicit `match` for `foo` and no handling for `bar`,
  against XML containing both, yields exactly one `high` warning for `bar`
- adding a `match="*"` template downgrades the `bar` warning to `medium`
- attribute-only references are classified independently from element names
- the same input/stylesheet pair produces identical `coverageWarnings` under all
  three execution paths
- disabling `coverage.report` yields no `coverageWarnings` and no measurable
  walk cost

## Implementation map

Likely implementation seams:

- [src/xslt/compile/analyze.ts](../src/xslt/compile/analyze.ts): coverage
  manifest builder and shared XML-name inventory helpers
- [src/xslt/compile/ir.ts](../src/xslt/compile/ir.ts): manifest type if it
  becomes part of the serialized stylesheet contract
- [src/xslt/codegen/emit.ts](../src/xslt/codegen/emit.ts): serialized manifest
  emission beside the IR
- [src/runtime/index.ts](../src/runtime/index.ts): runtime coverage evaluation
  hook at `transformCompiledStylesheet(...)`
- [src/processor/types.ts](../src/processor/types.ts): `TransformOptions`
  control surface and `TransformResult.coverageWarnings`

If the manifest is needed by both interpreter and emitted-native execution, it
should live in the shared IR/runtime boundary rather than becoming a codegen-only
side channel.

## Implementation checklist

### 1. Shared analysis helpers in [src/xslt/compile/analyze.ts](../src/xslt/compile/analyze.ts)

Scope:

- factor the XML name inventory logic so runtime coverage collection can reuse
  the same namespace/local-name rules as sample-document analysis
- add a coverage-manifest builder that walks template match patterns and XPath
  expression contexts
- classify wildcard/name/kind tests without baking in backend-specific behavior

Acceptance criteria:

- manifest output distinguishes explicit element names, explicit attribute
  names, and generic wildcard/kind coverage
- runtime and compile-time callers can share the same XML-name collection logic
- no Node-only APIs or CLI concerns leak into the helper layer

### 2. Serialized contract in [src/xslt/compile/ir.ts](../src/xslt/compile/ir.ts)

Scope:

- define the manifest type here if both interpreter and emitted-native paths
  need to consume it from the shared stylesheet contract
- keep the type compact and serialization-friendly

Acceptance criteria:

- the type expresses only IR-defensible facts, not speculative runtime claims
- the serialized shape is stable enough to be consumed by both runtime paths
- the manifest can be omitted entirely when the feature is not emitted

### 3. Module emission in [src/xslt/codegen/emit.ts](../src/xslt/codegen/emit.ts)

Scope:

- serialize the manifest beside the stylesheet IR in emitted modules
- thread any compile-time option that decides whether the manifest is included

Acceptance criteria:

- emitted modules remain readable and inspectable
- builds that disable the feature do not carry dead manifest payloads
- emitted modules still call the same `transformCompiledStylesheet(...)` funnel

### 4. Runtime hook in [src/runtime/index.ts](../src/runtime/index.ts)

Scope:

- add a helper that inventories observed input names and classifies them against
  the manifest
- run it from `transformCompiledStylesheet(...)` only when coverage reporting is
  requested and manifest data is present

Acceptance criteria:

- warnings are aggregated by `(nodeKind, namespaceUri, localName)` with counts
- explicit coverage suppresses warnings; wildcard/default traversal only
  downgrades confidence
- transforms that do not request coverage reporting do not pay the extra walk

### 5. Host-facing surface in [src/processor/types.ts](../src/processor/types.ts)

Scope:

- extend `TransformOptions` with an opt-in coverage control
- extend `TransformResult` with optional `coverageWarnings`

Acceptance criteria:

- the new fields are optional and non-breaking for existing callers
- the warning payload is specific enough for host UIs and logs without requiring
  stylesheet source locations
- the type names and field names fit the existing result/options vocabulary

### 6. Parity and regression tests in [test/](../test)

Scope:

- add focused tests for explicit matches, wildcard downgrades, attribute-only
  coverage, and disabled-report behavior
- verify parity across interpreter, native direct, and emitted-module execution
  where that execution mode exists today

Acceptance criteria:

- the same XML/stylesheet pair yields the same `coverageWarnings` across
  supported backends
- wildcard/default-template cases do not escalate to `high` when only generic
  evidence exists
- S1000D-style broad traversal patterns do not flood results with low-value
  warnings by default

### 7. Corpus tuning against S1000D

Scope:

- run the feature against the same family of transforms that produced the thin
  HTML outputs in the audit
- review which warnings are genuinely helpful versus generic-traversal noise

Acceptance criteria:

- the feature highlights likely holes such as sparse or unsupported branches
  earlier than output-shape auditing alone
- default settings keep false positives low enough to be usable in normal
  transform runs
- any confidence or allowlist adjustment is documented back into this design
  note and the relevant roadmap increment

This keeps the feature inside the product path: compile builds the coverage
model, the emitted module carries it, and every `transform(...)` run can tell a
user which input tags looked unhandled.

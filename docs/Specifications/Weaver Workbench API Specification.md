# Workbench API — engine boundary for external editor tooling

> This document defines the Weaver-side API shape needed by a live XSLT
> workbench or playground. It is intentionally about the **engine boundary**,
> not the UI or product implementation.

For the public host-facing shape of the first `weaverxslt.org` embed, see
[Workbench Embed](../Plans/Workbench%20Embed.md).

It complements [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md), especially the public API
boundary and source-map guidance, [Weaver Product Thesis](Weaver%20Product%20Thesis.md)
for why this matters to the product thesis, [Weaver Roadmap](../Plans/Weaver%20Roadmap.md) for
where the workbench lands, [Weaver Error Design Document](Weaver%20Error%20Design%20Document.md) for the diagnostic
contract, and [Weaver URI Resolution Specification](Weaver%20URI%20Resolution%20Specification.md) for host-owned resource
loading and identity.

## Why this doc exists

The live workbench idea is good, and the current plan is to embed the first
public example directly into `weaverxslt.org`.
Weaver should therefore contribute the **engine contract** that such a host
needs without collapsing the engine boundary into page-specific UI code.

That means this doc is deliberately narrower than the original note:

- it defines what Weaver should expose
- it defines what the host/workbench must own
- it does **not** design the final UI
- it does **not** require the engine package itself to absorb website UI logic

## Core rule

Weaver may expose a workbench-friendly API.
Weaver does **not** blur engine semantics and website UI into one surface.

Corollaries:

- The engine returns structured artifacts: diagnostics, generated TS,
  source-map data, IR handles, output.
- The embedding host owns panes, debouncing policy, editor widgets,
  persistence, sharing, starter presets, and browser sandbox UX.
- The same compile/run semantics must serve CLI, watch mode, tests, and the
  embedded workbench. No UI-only compiler path is allowed.

## Goals

- Support an in-memory XML + XSLT editing loop without filesystem-only
  assumptions.
- Return first-class structured artifacts suitable for editor tooling.
- Preserve the existing diagnostic contract rather than inventing a second
  UI-specific error shape.
- Keep the generated TypeScript inspectable and read-only in the first slice.
- Leave enough room for later linked-highlighting, trace, and output mapping.

## Non-goals

- Building the actual four-pane UI in this repository.
- Choosing Monaco versus another editor surface.
- Defining the final website information architecture, routing, persistence,
  examples gallery, or sharing model beyond what the engine boundary needs.
- Allowing edited generated TS to flow back into XSLT semantics.
- Requiring browser execution of generated TS in Weaver itself.

## Host placement

For MVP+6.5, assume the first host is a public embed on `weaverxslt.org`.
That changes where the example appears, but it does not change the boundary:

- this repository owns the engine-facing compile/run and mapping API
- the site embed owns pane layout, browser worker wiring, and page UX
- the site embed may ship a small preset picker that seeds both editable
  panes with starter XML + XSLT examples
- the workbench example should be demonstrable from docs-site content without
  inventing a second compiler path

## Placement in the roadmap

This contract exists to support [Weaver Roadmap](../Plans/Weaver%20Roadmap.md) MVP+6.5.

It depends on earlier increments providing:

- readable codegen output
- stable source maps
- watch-mode correctness
- structured compile-time and runtime diagnostics

Without those, a workbench API is just a thin wrapper over unstable internals.

## Design principles

### 1. In-memory first

Workbench callers must be able to supply XML and XSLT as `uri + text` pairs.
No core loop should require local files.

### 2. Structured artifacts, not scraped strings

The host should never parse formatted diagnostic text or generated output logs
to recover semantics. Weaver returns structure; renderers are separate.

### 3. Same engine path everywhere

Workbench compile/run calls must reuse the same compiler/runtime machinery as
other entry points. If CLI/watch/tests and workbench disagree, the workbench
API is wrong.

### 4. Read-only generated TS in v1

Generated TS is an inspectable artifact. It is not an editable round-trip
surface in the first workbench slice.

### 5. Host-owned execution and sandbox policy

If a host executes generated TS in the browser, sandboxing and runtime policy
belong to the host boundary. Weaver must not assume ambient `eval()`, network,
filesystem, or DOM access.

## Terminology

Use these terms consistently:

- **source document**: a `uri + text` input supplied by the host
- **compiled stylesheet**: Weaver-owned compiled form suitable for repeated
  transform runs
- **generated TS**: emitted TypeScript artifact for inspection or execution
- **source map**: mapping between XSLT spans and generated TS spans
- **workbench host**: the external application or product embedding Weaver

## Recommended contract shape

The exact exported function names can still evolve. What matters is the shape
and separation of concerns.

Current implemented slice:

- `@arakendo/weaver-xslt/workbench` now exports `SourceDocument`,
  `CompiledStylesheet`, `WeaverSourceMap`, `CompileRequest`, `CompileResult`,
  `TransformRequest`, `TransformResult`, `ResolveSourceXmlNodeHandleRequest`,
  `ResolveSourceXmlNodeHandleResult`,
  `ResolveSourceXmlNodeHandleAtOffsetRequest`,
  `ResolveSourceXmlNodeHandleAtOffsetResult`,
  `ResolveSourceXmlNodeHandleInRangeRequest`,
  `ResolveSourceXmlNodeHandleInRangeResult`,
  `CompileAndTransformRequest`, `CompileAndTransformResult`, `compile(...)`,
  `transform(...)`, `resolveSourceXmlNodeHandle(...)`,
  `resolveSourceXmlNodeHandleAtOffset(...)`,
  `resolveSourceXmlNodeHandleInRange(...)`, and `compileAndTransform(...)`.
- The first slice now includes a reusable compiled-stylesheet handle for
  repeated runs while keeping `compileAndTransform(...)` as the one-shot
  convenience boundary.
- The source-map surface is now structured rather than raw-only: callers keep
  access to the raw JSON while also getting `mapSourceToGenerated(...)` and
  `mapGeneratedToSource(...)` for linked-highlighting work.

### Source documents

```ts
export interface SourceDocument {
  uri: string;
  text: string;
}
```

The `uri` is for diagnostics, source maps, caching, and host identity. It is
not permission to perform I/O.

### Compile surface

```ts
export interface CompileRequest {
  stylesheet: SourceDocument;
  options?: {
    emitGeneratedTs?: boolean;
    emitSourceMap?: boolean;
    emitIr?: boolean;
  };
}

export interface CompileSuccessResult {
  ok: true;
  diagnostics: DiagnosticReport[];
  stylesheet: CompiledStylesheet;
  generatedTs?: string;
  sourceMap?: WeaverSourceMap;
}

export interface CompileFailureResult {
  ok: false;
  diagnostics: DiagnosticReport[];
}

export type CompileResult = CompileSuccessResult | CompileFailureResult;
```

Rules:

- `diagnostics` is always present.
- Successful compile returns a reusable `CompiledStylesheet` handle.
- `generatedTs` may be present even when a later transform would fail.

### Transform surface

```ts
export class CompiledStylesheet {
  readonly stylesheet: SourceDocument;
  readonly diagnostics: DiagnosticReport[];
  readonly generatedTs?: string;
  readonly sourceMap?: WeaverSourceMap;

  transform(sourceXml: SourceDocument, options?: TransformOptions): TransformResult;
}

export interface TransformRequest {
  stylesheet: CompiledStylesheet;
  sourceXml: SourceDocument;
  options?: TransformOptions;
}

export interface TransformResult {
  ok: true | false;
  diagnostics: DiagnosticReport[];
  output?: string;
  execution?: TransformExecutionInfo;
  notices?: WorkbenchNotice[];
}
```

Rules:

- Transform-only callers use the compiled handle returned from `compile(...)`.
- Runtime failures still use `DiagnosticReport`; no special workbench-only
  exception shape is introduced.

### Source-XML node handle resolution

For tracked-node debugging hosts, the workbench surface can resolve the stable
XML trace path format, a caret offset, or a selection range against an
in-memory `SourceDocument`:

```ts
export interface ResolveSourceXmlNodeHandleRequest {
  sourceXml: SourceDocument;
  path: string;
}

export interface ResolveSourceXmlNodeHandleAtOffsetRequest {
  sourceXml: SourceDocument;
  offset: number;
}

export interface ResolveSourceXmlNodeHandleInRangeRequest {
  sourceXml: SourceDocument;
  offsetStart: number;
  offsetEnd: number;
}

export interface ResolveSourceXmlNodeHandleSuccessResult {
  ok: true;
  diagnostics: DiagnosticReport[];
  handle?: XmlNodeHandle;
}

export interface ResolveSourceXmlNodeHandleFailureResult {
  ok: false;
  diagnostics: DiagnosticReport[];
}

export type ResolveSourceXmlNodeHandleResult =
  | ResolveSourceXmlNodeHandleSuccessResult
  | ResolveSourceXmlNodeHandleFailureResult;

export type ResolveSourceXmlNodeHandleAtOffsetResult =
  ResolveSourceXmlNodeHandleResult;

export type ResolveSourceXmlNodeHandleInRangeResult =
  ResolveSourceXmlNodeHandleResult;
```

Rules:

- Parse failures use the normal `DiagnosticReport[]` contract.
- A missing path is not a parse/runtime failure; it returns `ok: true` with no
  `handle` so hosts can treat it as an empty selection lookup.
- A caret offset resolves the deepest matching element, attribute, or
  non-whitespace text node using the parsed XML node locations already tracked
  by the engine.
- A selection range resolves the deepest matching element, attribute, or
  non-whitespace text node whose selectable region fully covers the range.
  Ranges spanning multiple selectable nodes return `ok: true` with no handle.
- The returned handle matches the same stable trace identity used by
  XML-node breakpoints and pause payloads.

### Convenience surface

For the external workbench host, one-shot compile-and-run is useful:

```ts
export interface CompileAndTransformRequest {
  stylesheet: SourceDocument;
  sourceXml: SourceDocument;
  options?: {
    emitGeneratedTs?: boolean;
    emitSourceMap?: boolean;
  } & TransformOptions;
}

export interface WorkbenchNotice {
  severity: 'warning';
  code: 'native_fallback';
  message: string;
  details: { key: string; value: string }[];
  suggestions?: {
    kind: 'fix' | 'hint' | 'alternative';
    label: string;
    confidence?: number;
    replacement?: string;
  }[];
}

export interface CompileAndTransformResult {
  ok: true | false;
  diagnostics: DiagnosticReport[];
  output?: string;
  stylesheet?: CompiledStylesheet;
  generatedTs?: string;
  sourceMap?: WeaverSourceMap;
  execution?: TransformExecutionInfo;
  notices?: WorkbenchNotice[];
}
```

This is a boundary convenience, not a new semantic engine.

On success, `compile(...)` and `compileAndTransform(...)` return the reusable
compiled handle directly. On failure, callers still receive the same
`DiagnosticReport[]` contract without a partial stylesheet handle.

For the first implemented slice, `notices` is where caller-facing execution
warnings belong. In particular, `execution: 'auto'` fallback to the
interpreter should surface a structured warning notice instead of forcing the
host to reverse-engineer CLI text formatting.

### Generated TS inspection

If generated TS is exposed directly, the contract should stay minimal:

```ts
export interface EmitResult {
  code: string;
  sourceMap?: WeaverSourceMap;
  diagnostics: DiagnosticReport[];
}
```

The host may show this text in a pane. The host must not treat local symbol
names or helper names as a stable imported API.

## Mapping surfaces

The workbench's first useful linked-highlighting features depend on mappings,
not on reparsing generated code.

Recommended shape:

```ts
export interface SourceSpanMap {
  mapSourceToGenerated(span: SourceSpan): readonly GeneratedSpan[];
  mapGeneratedToSource(span: GeneratedSpan): readonly SourceSpan[];
}
```

The current `WeaverSourceMap` implementation uses the existing emitted
line-based source map plus provenance comments, so returned spans are honest
line-level spans rather than pretending to have token precision.

Rules:

- Empty results are acceptable; fake precision is not.
- Mapping APIs should consume the same span model used by diagnostics.
- Output-to-source mapping is explicitly later work and not required for the
  first public contract.

## Diagnostics

The workbench consumes the same `DiagnosticReport` contract defined in
[Weaver Error Design Document](Weaver%20Error%20Design%20Document.md).

That means:

- code, phase, category, severity, `primary`, `related`, `frames`, `details`,
  `suggestions`, and `causes` remain first-class data
- formatted text is optional convenience, not the semantic contract
- the workbench host should render structure directly where practical

No new workbench-specific diagnostic schema should be introduced.

Non-diagnostic execution warnings still belong in structured data. The current
example is native fallback under `execution: 'auto'`, which is surfaced as a
workbench notice alongside the existing `execution.fallbackReason` metadata.

## Resource loading and identity

Any future workbench-facing compile or transform entry points must honor the
resolver split from [Weaver URI Resolution Specification](Weaver%20URI%20Resolution%20Specification.md):

- Weaver owns URI resolution semantics.
- The host owns resource access and policy.

That includes in-memory providers for `playground:/...`, `untitled:...`, or
other virtual URIs.

## Deferred surfaces

The following are real future needs, but they should not be required for the
first workbench-friendly API boundary.

### Trace events

Useful later for step/trace UI:

```ts
export interface TraceOptions {
  enabled: boolean;
  includeValues?: boolean;
  includeTemplateFrames?: boolean;
  includeGeneratedLocations?: boolean;
}
```

This should land only after the compile/run surfaces are already stable.

### Session / incremental editing API

An incremental session object may be valuable later, but it is an optimization
surface and should not be the first contract.

Stateless compile + transform calls are enough to prove the loop first.

### Output mapping

`mapOutputToSource(...)` is high-value but should be treated as a later layer.
Do not block the first workbench contract on output provenance.

## Minimal Weaver-side surface for MVP+6.5

For the roadmap slice in this repository, the minimal useful contract is:

- source documents with `uri + text`
- compile result returning `DiagnosticReport[]`
- optional generated TS artifact
- optional source-map artifact
- transform result returning output + `DiagnosticReport[]`
- structured notices for caller-facing execution warnings such as native
  fallback under `execution: 'auto'`
- convenience compile-and-transform entry point

That is enough for a `weaverxslt.org` embed or any other host to build:

- XML pane
- XSLT pane
- read-only generated TS pane
- output pane
- diagnostics panel
- a small preset selector that swaps in editable starter documents

without forcing the engine package to absorb the actual page implementation.

## Starter preset set for MVP+6.5

For the first public `weaverxslt.org` embed, keep the preset set small and
intentional. The point is to remove blank-page friction, not to ship a full
examples catalog.

Recommended host-side preset shape:

```ts
interface WorkbenchPreset {
  id: string;
  label: string;
  description: string;
  sourceXml: SourceDocument;
  stylesheet: SourceDocument;
}
```

Rules:

- Selecting a preset should replace both editable panes.
- After hydration, users must be able to edit both panes freely.
- Presets should be static content owned by the host, not fetched through a
  second compiler path.
- The first set should stay small enough that users can understand what each
  one is demonstrating at a glance.

Recommended first set:

### 1. Hello world

Purpose: prove the core compile -> generated TS -> output loop with the
smallest possible stylesheet.

Source XML:

```xml
<root>
  <name>world</name>
</root>
```

Stylesheet:

```xml
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <hello>
      <xsl:value-of select="/root/name"/>
    </hello>
  </xsl:template>
</xsl:stylesheet>
```

Expected output:

```xml
<hello>world</hello>
```

### 2. Parameters with defaults

Purpose: show that stylesheets can expose explicit configuration while still
producing useful output without requiring extra UI beyond the XML + XSLT panes.

Source XML:

```xml
<root/>
```

Stylesheet:

```xml
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:param name="greeting" select="'hello'"/>
  <xsl:template match="/root">
    <out>
      <xsl:value-of select="$greeting"/>
    </out>
  </xsl:template>
</xsl:stylesheet>
```

Expected output:

```xml
<out>hello</out>
```

### 3. Apply-templates flow

Purpose: show the rule-based execution model instead of only single-template
rendering.

Source XML:

```xml
<catalog>
  <item>alpha</item>
  <item>beta</item>
</catalog>
```

Stylesheet:

```xml
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/catalog">
    <items>
      <xsl:apply-templates select="item"/>
    </items>
  </xsl:template>

  <xsl:template match="item">
    <entry>
      <xsl:value-of select="."/>
    </entry>
  </xsl:template>
</xsl:stylesheet>
```

Expected output:

```xml
<items><entry>alpha</entry><entry>beta</entry></items>
```

These three presets are enough to prove:

- direct value extraction
- parameterized stylesheet structure
- multi-template rule dispatch

without turning the first embed into an examples browser.

## Product boundary reminder

This repository should stop at the engine contract.

The website embed or any later host may build:

- panes and editor chrome
- sharing
- examples gallery
- authentication and persistence
- browser worker orchestration
- execution policy and sandbox UX

Weaver's job is to make that possible without leaking semantics through prose,
deep imports, or UI-only hacks.
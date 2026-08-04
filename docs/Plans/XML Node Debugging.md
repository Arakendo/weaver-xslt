# XML Node Debugging — tracing and breakpoints over runtime input data

> This document defines the Weaver-side design for pausing on **input XML
> nodes** as they move through an XSLT transform. It is about runtime tracing
> and debugging semantics, not about extending source maps to pretend XML is
> executable code.

It complements [Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md),
[Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md), [Weaver Roadmap](Weaver%20Roadmap.md),
[Weaver Error Design Document](../Specifications/Weaver%20Error%20Design%20Document.md), and [Weaver Semantic Boundary Specification](../Specifications/Weaver%20Semantic%20Boundary%20Specification.md).

## Why this doc exists

Weaver can already map authored `.xsl` to generated TS for debugger stepping.
That solves **where in the stylesheet am I?**

It does not solve **which input node is being processed right now, and where
did it go?**

That second question is not a better source-map problem. The input XML is
runtime data. A breakpoint on `<para>` means:

- find a stable identity for that node in the runtime model
- observe when that node becomes the current focus or is selected by an
  instruction
- optionally pause execution at a meaningful event boundary

That is a trace/debugger feature with explicit runtime events, not a file/line
mapping trick.

## Core stance

Weaver should model XML-node debugging as **runtime tracing over stable node
identity**.

Weaver should **not** model it as:

- an extension of `.xsl` source maps
- a fake executable XML source file
- backend-specific ad hoc logging
- a UI-only workbench behavior with no engine contract

## Goals

- Let a host ask: "pause when this input node is matched, selected, or used as
  the current focus."
- Provide a stable event model that works across interpreter, native direct
  execution, and native emitted execution.
- Preserve the existing diagnostic and provenance contracts rather than adding
  a second debugging dialect.
- Keep the first slice small enough to be shippable: node tracing first,
  generalized debugger protocols later.

## Non-goals

- Treating input XML as executable source code in DevTools.
- Full DAP integration in the first increment.
- Time-travel debugging, reverse stepping, or replay in v1.
- Full output-to-input lineage for every emitted character.
- A polished workbench product UI in this repository.

## Placement in the roadmap

This design fits **after** [Weaver Roadmap](Weaver%20Roadmap.md) MVP+6.5 and **before**
XPath maturity work in MVP+7.

Why there:

- MVP+6.25 establishes native direct execution and a shared execution-plan
  boundary.
- MVP+6.5 establishes the workbench-facing compile/run boundary and basic
  linked-highlighting.
- XML-node debugging needs both: shared runtime semantics and a host boundary
  that can render trace/pause state.

This work should not be pulled earlier than those two increments because it
would otherwise either:

- become interpreter-only instrumentation, or
- become a UI feature with no stable engine contract.

## Terminology

- **observed node**: an input XML node the host wants to track or pause on
- **node handle**: a stable identity for an observed node within one transform
  session
- **trace event**: a structured runtime event emitted by the engine about node
  processing
- **breakpoint predicate**: host-supplied rule for when execution should pause
- **pause frame**: the current template/instruction/focus state when a trace
  breakpoint fires

## Design principles

### 1. Runtime-data breakpoints are not source breakpoints

The host may visually place a breakpoint in an XML editor, but Weaver should
translate that into a runtime predicate over node identity and event kind.

The semantic breakpoint is:

- "pause when node N becomes the focus of template dispatch"
- not "pause on XML file line 42 because it looks like source code"

### 2. Stable node identity comes first

If node identity is fuzzy, the entire feature becomes misleading.

The engine needs a stable per-run node handle derived from the parsed input
document, not from display text or string matching alone.

At minimum, a node handle should distinguish:

- document URI or host-supplied document identity
- node kind
- stable path or ordinal identity within that parsed document

It does not need to be globally persistent across different parses in v1.

### 3. Events must be meaningful, not noisy

Tracing every micro-operation would bury the useful signal.

The first slice should emit a small set of semantically meaningful events:

- node selected into an instruction result set
- node becomes current focus for template dispatch or iteration
- node enters a matched template body
- node is read by `xsl:value-of` / string-value extraction

That is enough to answer "did this `<para>` pass through this part of the
transform?" without inventing a full instruction-level execution log.

### 4. Same event model across backends

Interpreter, native direct, and native emitted execution must not invent
different trace semantics.

The event contract belongs to the shared execution boundary. Backends may emit
those events differently internally, but the host-visible meaning must match.

### 5. Pause semantics are host-visible but engine-owned

The host chooses breakpoint predicates and renders pause state.
The engine decides when a predicate matches and what execution frame is paused.

That prevents UI surfaces from re-deriving execution meaning differently.

### 6. Trace data complements diagnostics; it does not replace them

Diagnostics still explain failures.
Trace events explain runtime flow.

If a paused event later turns into an error, the host may show both, but Weaver
should keep the two contracts distinct.

## Recommended contract shape

The exact public names can evolve. The important part is the separation of
runtime tracing concerns from compile/run concerns.

### Node handles

```ts
export interface XmlNodeHandle {
  documentUri: string;
  kind: 'document' | 'element' | 'attribute' | 'text' | 'comment' | 'pi';
  path: string;
}
```

Notes:

- `path` is a stable per-document identity string for the parsed input tree.
- The host may derive it from an editor selection or ask Weaver to resolve it.
- This is runtime identity, not a promise about lexical formatting.
- Hosts that want engine-aligned handle derivation without reaching into
  internal modules can use the public `createCompiledDocument(...)`,
  `createXmlNodeHandle(...)`, `resolveXmlNodeHandle(...)`, and
  `resolveXmlNodeHandleAtOffset(...)`, and `resolveXmlNodeHandleInRange(...)`
  helpers from the package root.

### Trace events

```ts
export interface XmlTraceEvent {
  kind:
    | 'focus-enter'
    | 'template-enter'
    | 'instruction-select'
    | 'value-read';
  node: XmlNodeHandle;
  template?: {
    match?: string;
    name?: string;
  };
  instruction?: {
    kind: string;
    sourceSpan?: SourceSpan;
  };
}
```

Notes:

- Events should carry enough information to connect the node to the current
  template and instruction.
- `sourceSpan` reuses the same span model as diagnostics and source maps.
- The first slice should prefer a small event vocabulary over a huge generic
  logging surface.

### Breakpoint predicates

```ts
export interface XmlTraceBreakpoint {
  node: XmlNodeHandle;
  on: readonly Array<'focus-enter' | 'template-enter' | 'instruction-select' | 'value-read'>;
}
```

Rules:

- Breakpoints are predicates over node identity and event kinds.
- The first slice should avoid arbitrary expression languages for breakpoint
  conditions.
- Additional filtering, if needed later, can build on this rather than replace
  it.

### Trace-enabled transform

```ts
export interface TraceTransformOptions extends TransformOptions {
  trace?: {
    breakpoints?: readonly XmlTraceBreakpoint[];
    onEvent?: (event: XmlTraceEvent) => void;
  };
}

export interface TracePause {
  event: XmlTraceEvent;
  frames: readonly DiagnosticFrame[];
}
```

Rules:

- A host may consume a stream of events without pausing.
- If a breakpoint matches, the engine should surface a structured pause result
  rather than forcing the host to infer pause state from missing callbacks.
- The paused frame shape should reuse existing frame/provenance ideas where
  practical.

## What the first shipped slice should support

The first increment should support this user story:

1. The host identifies an input `<para>` node.
2. The host asks Weaver to pause when that node:
   - becomes the current focus for template dispatch, or
   - is selected by an `xsl:apply-templates` / `xsl:for-each` / `xsl:value-of`
     path.
3. The engine pauses with:
   - the matched node handle
   - current template match/name
   - current instruction source span if available
   - stack-like frames for how execution got there

That is enough to make "watch this node pass through the stylesheet" a real,
reviewable product behavior.

## What should stay out of the first slice

- Editor-gutter XML breakpoints as a productized UX requirement
- Reverse stepping / replay
- Full output-character provenance
- Trace conditions based on arbitrary XPath expressions
- Full debugger-protocol integration

Those are all plausible follow-ons, but they should not be required to make the
first XML-node debugging increment useful.

## Testing expectations

This feature needs parity tests, not screenshots alone.

Minimum recommended coverage:

- the same fixture node pauses under interpreter, native direct, and native
  emitted execution
- a selected node entering a matched template yields the expected event kind
  and template metadata
- `xsl:value-of` over a tracked node emits `value-read` with the right source
  span
- a non-matching node does not spuriously pause

The browser/workbench demo is still useful, but it must sit on top of a stable
engine contract with executable tests.

## Suggested roadmap increment shape

The corresponding roadmap slice should be framed as a debugging/observability
increment, not a source-map increment.

Recommended name:

- **MVP+6.75 — XML node trace debugging**

Recommended emphasis:

- stable runtime node identity
- shared event model across backends
- pause-on-node support for the workbench or other hosts
- explicit separation from source maps and diagnostics

## Bottom line

If Weaver wants to let a user say "break on this `<para>` and show me where it
flows through the transform," the engine needs a **trace boundary** over
runtime node identity.

That is a real differentiator, but only if it is designed as a first-class
semantic surface rather than as an ad hoc debugger trick.

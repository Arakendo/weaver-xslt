# Native Plan Boundary — shared plan between direct and emitted native execution

> This document names the current shared native plan objects for M6.25 and
> draws the boundary between IR, shared plan data, direct-runtime helper state,
> and emit-only state.

It complements [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md),
[Weaver Roadmap](../Plans/Weaver%20Roadmap.md),
[Weaver Native Execution Boundary Specification](Weaver%20Native%20Execution%20Boundary%20Specification.md), and
[Native Execution Implementation Record](../Evidence/Native%20Execution%20Implementation%20Record.md).

## Why this doc exists

M6.25 is no longer at the stage where "native plan boundary" can stay as an
implicit idea.

The current engine already has one concrete plan path that both native surfaces
consume:

- direct native execution in `src/processor/XsltProcessor.ts`
- emitted native code in `src/xslt/codegen/emit.ts`

This note exists to make that boundary explicit so later widening work does not
smuggle emit-only or execution-only concerns across it by accident.

## Current shared plan objects

The current shared native plan objects are:

- `NativeTransformPlan` in `src/xslt/codegen/emitInstructions.ts`
- `ApplyTemplatesTemplatePlan` in `src/xslt/codegen/nativeApplyTemplates.ts`

`NativeTransformPlan` is the top-level plan that both native consumers use.

It currently carries:

- `entryTemplate`: the template that starts native execution
- `currentNodeExpression` and `currentNodeMayBeNull`: how the native path
  establishes the current focus
- `needsCurrentNodeBinding`: whether that focus needs a named local binding
- `setupStatements`: top-level setup such as lazy global-binding getters
- `outputExpression`: the final expression that produces serialized output
- `runtimeHelpers`: the runtime helper names the plan depends on

`ApplyTemplatesTemplatePlan` is the recursive sub-plan for supported
`xsl:apply-templates` dispatch.

It currently carries:

- the matched template to render
- whether the match path is absolute
- the simple match path used for dispatch
- nested candidate plans for recursive native dispatch

## What belongs where

### IR contract

The IR contract remains `StylesheetIR` in `src/xslt/compile/ir.ts`.

That is the compiler-owned semantic contract shared across interpreter,
analysis, direct native planning, and emitted native lowering.

The IR owns:

- templates
- global bindings
- source locations
- parsed XPath ASTs
- instruction structure

The IR does not own:

- helper function inventories
- native setup statements
- emitted module imports
- source-map wiring
- direct-runtime helper objects

### Shared native plan

The shared native plan is the post-IR plan layer produced by
`tryCreateNativeTransformPlan(...)`.

This is the contract shared by:

- direct native execution through `executeNativeTransformPlan(...)`
- emitted native module generation through `emitStylesheetModule(...)`

Today, that plan is already somewhat lowered toward executable JavaScript and
TypeScript. It is not a second semantic IR. It is the current shared native
execution plan.

That means the plan may include:

- lowered expressions
- helper names
- setup statements for the supported slice
- recursive apply-templates dispatch plans

But it must still stay free of host-specific packaging concerns.

### Direct-runtime helper state

Direct-runtime helper state lives outside the shared plan.

Today that means:

- `NATIVE_RUNTIME_HELPERS` in `src/processor/XsltProcessor.ts`
- actual helper implementations in `src/runtime/index.ts`
- the parsed source document and runtime `ctx` values supplied at execution time

This state is execution-owned rather than compiler-owned.

### Emit-only state

Emit-only state also lives outside the shared plan.

Today that means concerns such as:

- module import rendering
- runtime module specifiers
- export layout
- source-map comments
- file-path-specific emission wrapping

Those concerns are owned by `src/xslt/codegen/emit.ts` and neighboring
emission code, not by `NativeTransformPlan` itself.

## What this means in practice

The current boundary is:

- `StylesheetIR`: semantic compiler contract
- `NativeTransformPlan` plus `ApplyTemplatesTemplatePlan`: shared native plan
- runtime helper objects and documents: direct execution state
- imports, module wrappers, and source-map decoration: emit-only state

That is enough for M6.25 because both native consumers already share one plan
source of truth, even though that plan is still a pragmatic lowered form rather
than a future idealized declarative runtime plan.

## What must not drift

Future widening work should preserve these rules:

- do not move runtime caches or live helper objects into `StylesheetIR`
- do not push module-import or source-map concerns into `NativeTransformPlan`
- do not let direct native and emitted native invent separate template-dispatch
  planning rules
- if a native widening needs a special-case path in only one consumer, fix the
  shared plan boundary instead of normalizing the divergence

## Current limitation, stated plainly

The current shared native plan is explicit, but it is not yet the final shape
Weaver would want long-term.

It is intentionally a transitional plan layer that is:

- shared across both native consumers
- explicit enough to reason about
- still close to executable output for the current slice

That is acceptable for M6.25. The important part for this increment is that the
boundary is now named and reviewable instead of being implied by helper reuse.
# Native Execution Boundary — what "unsupported under native" means

> This document defines the M6.25 boundary for when Weaver may execute a
> stylesheet through the direct native path and what must happen when that
> request cannot stay on native semantics.

It complements [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md),
[Native Execution Implementation Record](../Evidence/Native%20Execution%20Implementation%20Record.md),
[Weaver Roadmap](../Plans/Weaver%20Roadmap.md), and [Weaver Semantic Boundary Specification](Weaver%20Semantic%20Boundary%20Specification.md).

## Why this doc exists

M6.25 adds an explicit execution choice:

- `execution: 'interpreter'`
- `execution: 'native'`
- `execution: 'auto'`

That choice is only useful if "unsupported under native" has a stable meaning.

Without that boundary, `auto` becomes silent vibes-based fallback and `native`
becomes a promise the engine cannot explain.

## Core stance

"Unsupported under native" means:

- Weaver cannot build or execute the requested transform through the current
  direct native slice while preserving the same semantics contract the
  interpreter owns.

It does not mean:

- "native looked inconvenient so Weaver quietly used the interpreter"
- "the emitted TS backend and the direct native backend are allowed to drift"
- "the host should guess whether native was used"

## Current M6.25 policy

For the current slice:

- `execution: 'interpreter'` always resolves to the interpreter
- `execution: 'native'` must either execute natively or fail explicitly
- `execution: 'auto'` uses native when the stylesheet is inside the supported
  native slice and otherwise falls back to the interpreter with a structured
  reason

The current processor surface reports that reason through transform execution
metadata, and explicit `native` failure uses
`WEAVER_XSLT_NATIVE_UNSUPPORTED`.

## What counts as unsupported today

Today, the most important unsupported-native reason is:

- `unsupported_stylesheet`

This means the stylesheet falls outside the currently implemented native slice.
Examples include shapes the interpreter can run but the direct native planner
does not yet lower safely.

At the moment, that decision is planner-owned. If the native planner cannot
produce a valid plan, the stylesheet is unsupported under native.

## What must happen on each execution mode

### `interpreter`

- use the interpreter
- do not fabricate fallback metadata
- this remains the stable reference path

### `native`

- execute through the direct native path when supported
- otherwise throw `WEAVER_XSLT_NATIVE_UNSUPPORTED`
- include structured details explaining why the request could not stay native

### `auto`

- prefer native when the stylesheet is inside the supported slice
- otherwise use the interpreter
- return structured execution metadata describing the fallback reason

## Rules the engine must keep

### 1. No silent fallback for explicit `native`

If a caller asks for `native`, Weaver must not quietly run the interpreter.

That would turn a semantics boundary into guesswork and make later parity bugs
harder to see.

### 2. `auto` is policy, not a shrug

`auto` is allowed to choose the interpreter, but only with an explicit,
machine-readable reason.

The host should be able to answer:

- what was requested
- what actually ran
- why native was not used

### 3. Unsupported is about semantics, not preference

If the engine cannot preserve the native slice contract cleanly, the answer is
unsupported.

Do not stretch the native label across partial lowering, hidden interpreter
callbacks, or ad hoc mixed execution.

### 4. Same behavior contract across direct and emitted native

The direct native path and emitted native path may differ in mechanics, but not
in their host-visible semantics contract.

If one path needs a special exception to succeed, the shared plan boundary is
still wrong or incomplete.

## Non-goals for this document

- Exhaustively listing every unsupported construct in perpetuity
- Defining future workbench UX
- Defining debugger protocols or trace events
- Allowing partial native execution with hidden interpreter escape hatches

## Practical implication for M6.25

The increment is not done when "native works for some demos." It is done when:

- the supported slice executes natively in a way the host can request
- unsupported requests are explicit and structured
- the boundary is documented enough that future slices widen it intentionally
  instead of accidentally
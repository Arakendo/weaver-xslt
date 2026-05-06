# M6.25 Checklist — native direct execution

> Concrete execution checklist for [ROADMAP.md](./ROADMAP.md) MVP+6.25.
> This is a work-order document: small, explicit, and biased toward the first
> shippable slice.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md), especially DEC-005 on the
IR/plan boundary, [ROADMAP.md](./ROADMAP.md) for increment scope/exit criteria,
and [XML_NODE_DEBUGGING.md](./XML_NODE_DEBUGGING.md) for why later tracing work
depends on this increment landing cleanly.

## Current status

Current progress as of 2026-05-06:

- recursive native `xsl:apply-templates` planning now covers the supported
      three-hop chain instead of falling back to interpreter emission
- the public transform surface now exposes
      `execution: 'interpreter' | 'native' | 'auto'`
- supported stylesheets can execute through the direct native path today
- unsupported native requests stay explicit through structured diagnostics and
      `auto` fallback metadata
- a targeted parity helper now checks interpreter, direct native, and emitted
      native behavior together for the supported top-level global-binding slice
- that targeted parity surface also now covers the current core runtime fixtures
      for conditional logic, relative paths, boolean helpers, and the supported
      apply-templates cases
- the first three-way diagnostic parity case now locks XTDE0640 structure and
      formatter text across interpreter, direct native, and emitted native
- the first golden subset now under three-way parity is `hello`,
      `value-of-basic`, and `invoice-simple`
- the remaining current goldens now also lock the unsupported-native contract:
      explicit `native` rejection plus `auto` fallback metadata

Still open:

- shared plan-boundary documentation is still thinner than it should be
- parity is still focused on targeted tests rather than the broader goldens
- unsupported-native policy needed a dedicated design note, which now lives in
      [NATIVE_EXECUTION_BOUNDARY.md](./NATIVE_EXECUTION_BOUNDARY.md)

## Why this doc exists

M6.25 is easy to describe and easy to let sprawl.

The goal is not "make native faster" or "add another runtime mode" in the
abstract. The goal is narrower:

- native execution becomes a first-class in-process strategy
- emitted native execution and direct native execution share the same semantic
  plan boundary
- the current nested `xsl:apply-templates` native gap is closed for the
  supported slice

This checklist keeps the increment scoped to that outcome.

## Increment target

At the end of M6.25, Weaver should be able to run the currently supported slice
three ways:

- interpreter
- native direct execution
- native emitted execution

And those three paths should agree on:

- output
- structured diagnostics
- current supported behavior for nested template dispatch

## First rule

Do not start with public API polish.

Start by making the shared native semantic boundary testable. If that part is
fuzzy, the rest of the increment becomes surface churn over divergent engines.

## Tomorrow-first checklist

### 0. Lock the comparison target

- [x] Identify the smallest current golden set that must pass under all three
      execution strategies
- [x] Add or extend a parity harness that can run:
      - interpreter
      - native direct
      - native emitted
- [x] Add one intentionally failing fixture that demonstrates the current
      nested `xsl:apply-templates` native limitation
- [ ] Decide and document the temporary test label/tag for "native-direct"
      so parity results stay grep-able

Outcome:

- there is a red test that proves the current gap
- there is a harness shape that will go green when the increment is done

### 1. Define the shared native plan boundary

- [ ] Name the shared plan object that both direct native execution and emitted
      native execution consume
- [ ] Verify that execution-only caches/helpers stay out of the IR contract
- [ ] Verify that emit-only naming/import/hoisting state stays out of the
      shared runtime plan
- [ ] Write down, in code or doc comments, which data is:
      - IR contract
      - shared native plan
      - direct-runtime helper state
      - emit-only helper state

Outcome:

- direct and emitted native execution have one semantic plan source of truth
- the plan boundary is explicit rather than implied by helper reuse

### 2. Close the nested `xsl:apply-templates` gap

- [x] Find the exact fallback path where nested native dispatch drops back to
      interpreter behavior
- [x] Replace root-only/native-special planning with intentional recursive
      planning for the supported slice
- [ ] Add coverage for at least these nested cases:
      - nested `apply-templates` inside a matched child template
      - nested `apply-templates` with built-in-template/default behavior
      - nested `apply-templates` that still preserves provenance/comments/source
        mapping expectations for emitted TS

Outcome:

- nested dispatch is no longer an ad hoc fallback for the supported slice

### 3. Expose explicit execution selection

- [x] Add one library-facing execution selection surface using:
      - `execution: 'interpreter' | 'native' | 'auto'`
- [x] Define `auto` as policy, not convenience text:
      - native when supported by the requested slice
      - interpreter otherwise
- [x] Return a structured reason when `auto` or `native` cannot stay on native
      semantics for a requested input/slice

Outcome:

- callers can choose execution strategy intentionally
- unsupported-under-native behavior is explicit instead of silent fallback

### 4. Prove semantic parity

- [x] Compare output parity on the supported goldens
- [ ] Compare `DiagnosticReport` parity on representative failures
- [ ] Confirm that direct native execution does not invent a second
      diagnostics/provenance dialect
- [x] Add at least one representative failure where all three strategies are
      asserted on structure first and formatter text second

Outcome:

- parity is enforced by executable checks rather than by inspection

### 5. Close the increment docs

- [x] Add the small design note the roadmap asks for: what exactly
      "unsupported under native" means
- [ ] Update public docs/API examples only after the behavior is real
- [ ] Re-read roadmap exit criteria and ensure each one maps to an executable
      validation or named doc artifact

Outcome:

- M6.25 has a clear done boundary instead of a vague "native feels real now"

## Suggested file targets

These are likely anchors, not a guaranteed full list.

- `src/xslt/compile/` for plan construction or overlays
- `src/xslt/codegen/` for emitted-native plan lowering
- `src/processor/` or public orchestration surfaces for execution selection
- `src/runtime/` for native direct execution helpers
- `test/golden/` and/or integration parity harnesses for three-way execution
- `docs/` for the final unsupported-native design note

## Validation order

Run checks in this order while iterating:

1. smallest failing parity fixture for nested `apply-templates`
2. focused native/direct vs emitted parity tests
3. relevant golden/parity suite
4. `npm run typecheck`
5. broader `npm test` once the slice is stable

Do not jump to full-suite confidence before the red parity fixture exists.

## Things to avoid

- Do not add new XSLT features under cover of this increment.
- Do not let `auto` become silent semantic fallback with no structured reason.
- Do not fix this by making emitted native execution more opaque.
- Do not move runtime caches/helpers onto the IR contract.
- Do not accept parity on output alone if diagnostics diverge.

## Minimum definition of done

M6.25 is done when all of these are true:

- the supported slice runs under interpreter, native direct, and native emitted
- nested `xsl:apply-templates` no longer depends on ad hoc interpreter fallback
- execution selection is explicit and documented
- unsupported-under-native is explicit and structured
- parity is proven by tests for output and `DiagnosticReport`

## If time collapses

If the increment has to be split, keep the first shipped slice as:

- shared native plan boundary
- nested `apply-templates` parity on a minimal supported fixture set
- explicit execution selection with structured unsupported reasons

Defer broader API polish and larger parity matrices until after that core is
green.
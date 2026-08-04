# M6.25 Checklist — native direct execution

> Concrete execution checklist for [Weaver Roadmap](../Plans/Weaver%20Roadmap.md) MVP+6.25.
> This is a work-order document: small, explicit, and biased toward the first
> shippable slice.

It complements [Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md), especially DEC-005 on the
IR/plan boundary, [Weaver Roadmap](../Plans/Weaver%20Roadmap.md) for increment scope/exit criteria,
and [XML Node Debugging](../Plans/XML%20Node%20Debugging.md) for why later tracing work
depends on this increment landing cleanly. The current shared native plan is
documented in [Weaver Native Plan Boundary Specification](../Specifications/Weaver%20Native%20Plan%20Boundary%20Specification.md).

## Current status

Current progress as of 2026-05-06:

- recursive native `xsl:apply-templates` planning now covers the supported
      three-hop chain instead of falling back to interpreter emission
- nested `xsl:apply-templates` coverage now includes matched-child runtime
      parity, built-in/default behavior, and checked-in emitted TS fixtures
      that preserve comment/source mapping markers
- the public transform surface now exposes
      `execution: 'interpreter' | 'native' | 'auto'`
- the CLI run surface now also accepts `--execution interpreter|native|auto`,
      and `--execution auto` prints a caller-facing warning when structured
      fallback metadata reports that native execution was not used
- the workbench / embedding boundary now also surfaces native fallback as
      structured `notices`, and supports explicit compile-once reuse via a
      reusable compiled stylesheet handle
- supported stylesheets can execute through the direct native path today
- unsupported native requests stay explicit through structured diagnostics and
      `auto` fallback metadata
- a targeted parity helper now checks interpreter, direct native, and emitted
      native behavior together for the supported top-level global-binding slice
- that targeted parity surface also now covers the current core runtime fixtures
      for conditional logic, relative paths, boolean helpers, and the supported
      apply-templates cases, plus malformed source-XML runtime and malformed
      stylesheet-XML compile failures as first-class typed diagnostics across
      interpreter, direct native, and emitted native
- targeted three-way diagnostic parity now locks XTDE0640, XTDE0050,
      XTDE0040 initialMode, XTSE0010 initialTemplate, and representative
      XTSE0630/XTSE0650/XTSE0660/XTSE0680/XTSE0690 compile-time failures for
      structure and formatter text across interpreter, direct native, and
      emitted native
- named-only and mixed matched-template plus `initialTemplate` entry now
      execute natively for the supported slice, and XTDE0700 parity is covered
      in the native diagnostics harness
- generated native execution now normalizes prefixed `initialTemplate` QNames
      against the stylesheet static namespace map before selecting the native
      entry or reporting an invalid template name
- generated native root-match plans now also reject stray `initialTemplate`
      requests up front instead of silently running the default entry
- public stylesheet diagnostics now also lock XTDE0640, XTDE0050,
      XTDE0040 initialMode, XTSE0010 initialTemplate, and representative
      XTSE0630/XTSE0650/XTSE0660/XTSE0680/XTSE0690 compile-time failures under
      explicit native execution, including the representative typo-suggestion
      paths
- required top-level stylesheet params now execute natively when supplied,
      instead of plan-rejecting the stylesheet up front
- local `xsl:variable` temporary trees and top-level `xsl:param`/`xsl:variable`
      sequence-constructor defaults now execute natively for the supported
      simple-path slice instead of forcing explicit native fallback
- named-template `xsl:param` defaults and `xsl:with-param` overrides, including
      the supported temporary-tree parameter slice, now execute natively instead
      of forcing explicit native fallback
- matched-template `xsl:apply-templates` calls now keep the supported
      `xsl:with-param` slice on the native path, including temporary-tree
      parameter values and defaulted matched-template params
- the built-in/default `xsl:apply-templates` traversal now preserves supported
      `position()`/`last()` focus metadata for matched child templates instead
      of collapsing every native callback to position `1`
- child-only numeric `xsl:apply-templates` step predicates such as `item[1]`
      and `item[position() = 1]`, plus the last-position case
      `item[position() = last()]`, and simple numeric range comparisons such as
      `item[position() >= 2]` and `item[position() != 1]` now stay on the
      native path, along with simple modular predicates such as
      `item[position() mod 2 = 0]` and exact `last()`-offset predicates such as
      `item[position() = last() - 1]`, plus relative `last()` upper-bound
      predicates such as `item[position() &lt; last()]`, plus compound
      positional predicates joined by `and` such as
      `item[position() > 1 and position() &lt; last()]`, plus simple `or`-joined
      exact-position predicates such as
      `item[position() = 1 or position() = last()]`, plus mixed disjunctions of
      otherwise supported branches such as `item[position() = 1 or position() > 2]`,
      plus simple boolean negation over supported position comparisons such as
      `item[position() = 1 or not(position() = last())]`, plus negated modulo
      predicates such as `item[not(position() mod 2 = 0)]`, plus negated
      positional disjunctions composed of otherwise supported branches such as
      `item[not(position() = 1 or position() = last())]` and
      `item[not(position() mod 2 = 0 or position() = 1)]`, plus modulo-branch
      intersections such as `item[not(position() mod 2 = 0 or position() mod 3 = 0)]`,
      plus multi-position exclusions such as `item[not(position() = 1 or position() = 2)]`,
      plus negated exact `last()`-offset comparisons such as
      `item[not(position() = last() - 1)]`, plus negated disjunctions across
      multiple `last()`-offset comparisons such as
      `item[not(position() = last() - 1 or position() = last() - 2)]`, plus
      negated relative `last()`-offset range comparisons such as
      `item[not(position() &lt; last() - 1)]`, plus negated non-equality
      `last()`-offset comparisons such as `item[not(position() != last() - 1)]`,
      plus exact absolute/from-last merges such as
      `item[not(position() != last() - 1 or position() != 1)]`, plus exact
      absolute with included-from-last combinations such as
      `item[not(position() != 1 or position() &lt; last() - 1)]`, plus exact
      absolute with exact `last()` combinations such as
      `item[not(position() != last() or position() != 1)]`, plus direct
      `last()` inequality comparisons such as `item[position() != last()]`,
      plus direct lower-bound `last()`-offset comparisons such as
      `item[position() > last() - 1]`, plus direct non-equality
      `last()`-offset comparisons such as `item[position() != last() - 1]`,
      plus computed positional arithmetic equalities and non-equalities such as
      `item[position() = last() div 2]`, `item[position() != last() div 2]`,
      `item[not(position() = last() div 2)]`, `item[position() &lt; last() div 2]`,
      `item[not(position() &lt; last() div 2)]`, `item[position() = last() div 2 + 1]`,
      `item[position() != last() div 2 + 1]`,
      `item[not(position() = last() div 2 + 1)]`, `item[position() &lt; last() div 2 + 1]`,
      `item[not(position() &lt; last() div 2 + 1)]`,
      `item[position() = last() div 2 + last() div 4]`,
      `item[position() = (last() div 2) * 2]`,
      `item[position() = (last() div 2) * (last() div 2)]`,
      `item[position() != last() div 2 + last() div 4]`,
      `item[position() != (last() div 2) * (last() div 2)]`,
      `item[not(position() = last() div 2 + last() div 4)]`,
      `item[not(position() = (last() div 2) * (last() div 2))]`,
      `item[position() &lt; last() div 2 + last() div 4]`, and
      `item[not(position() &lt; last() div 2 + last() div 4)]`,
      `item[position() &lt; (last() div 2) * (last() div 2)]`, and
      `item[not(position() &lt; (last() div 2) * (last() div 2))]`, while higher-order
      nonlinear computed arithmetic ranges such as
      `item[position() &lt; (last() div 2) * (last() div 2) * (last() div 2)]`
      remain outside the current supported slice
- the first golden subset now under three-way parity is `hello`,
      `value-of-basic`, and `invoice-simple`
- the current golden runtime set now runs under interpreter, direct native,
      and emitted native, including duplicate-priority and wildcard-vs-specific
      template selection
- the current shared native plan boundary is now documented in
      [Weaver Native Plan Boundary Specification](../Specifications/Weaver%20Native%20Plan%20Boundary%20Specification.md)
- the final M6.25 closeout suite is green:
      `npx vitest run test/codegen/golden-runtime.test.ts test/codegen/compile.native-runtime.test.ts test/codegen/compile.apply-templates-nested-match-fixtures.test.ts test/codegen/diagnostics.test.ts test/xslt/diagnostics/stylesheet.test.ts test/smoke.test.ts test/cli.test.ts test/workbench.test.ts`
      (`8` files, `275` tests)

Still open:

- broader-than-representative diagnostic failure-matrix expansion is deferred;
      M6.25 closeout is now covered by the targeted parity audit commands below

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
- [x] Decide and document the temporary test label/tag for "native-direct"
      so parity results stay grep-able

Current temporary tag: `[native-direct]`

Outcome:

- there is a red test that proves the current gap
- there is a harness shape that will go green when the increment is done

### 1. Define the shared native plan boundary

- [x] Name the shared plan object that both direct native execution and emitted
      native execution consume
- [x] Verify that execution-only caches/helpers stay out of the IR contract
- [x] Verify that emit-only naming/import/hoisting state stays out of the
      shared runtime plan
- [x] Write down, in code or doc comments, which data is:
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
- [x] Add coverage for at least these nested cases:
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
- [x] Compare `DiagnosticReport` parity on representative failures
- [x] Run the roadmap closeout parity audit and either close or explicitly
      track the remaining representative interpreter/native direct/native
      emitted mismatches
- [x] Confirm that direct native execution does not invent a second
      diagnostics/provenance dialect
- [x] Add representative failures where all three strategies are
      asserted on structure first and formatter text second

Current focused audit status (2026-05-06):

- `npx vitest run test/codegen/golden-runtime.test.ts test/codegen/compile.native-runtime.test.ts test/codegen/compile.apply-templates-nested-match-fixtures.test.ts test/codegen/diagnostics.test.ts test/xslt/diagnostics/stylesheet.test.ts test/smoke.test.ts`
  passed with 257 tests across goldens, nested emitted fixtures, runtime parity,
  representative diagnostics, and execution-selection coverage

Outcome:

- parity is enforced by executable checks rather than by inspection

### 5. Close the increment docs

- [x] Add the small design note the roadmap asks for: what exactly
      "unsupported under native" means
- [x] Update public docs/API examples only after the behavior is real
- [x] Re-read roadmap exit criteria and ensure each one maps to an executable
      validation or named doc artifact

Outcome:

- M6.25 has a clear done boundary instead of a vague "native feels real now"

Roadmap exit-criteria map:

- current supported goldens under interpreter, native direct, and native
      emitted: `npx vitest run test/codegen/golden-runtime.test.ts`
- nested `xsl:apply-templates` without ad hoc native fallback:
      `npx vitest run test/codegen/compile.native-runtime.test.ts` plus
      `npx vitest run test/codegen/compile.apply-templates-nested-match-fixtures.test.ts`
- shared semantic plan contract and representative `DiagnosticReport` parity:
      [Weaver Native Plan Boundary Specification](../Specifications/Weaver%20Native%20Plan%20Boundary%20Specification.md),
      `npx vitest run test/codegen/diagnostics.test.ts`, and
      `npx vitest run test/xslt/diagnostics/stylesheet.test.ts`
- explicit execution selection semantics:
      [Weaver Native Execution Boundary Specification](../Specifications/Weaver%20Native%20Execution%20Boundary%20Specification.md),
      [Weaver Roadmap](../Plans/Weaver%20Roadmap.md), and `npx vitest run test/smoke.test.ts`
- explicit unsupported-native boundary note:
      [Weaver Native Execution Boundary Specification](../Specifications/Weaver%20Native%20Execution%20Boundary%20Specification.md)

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
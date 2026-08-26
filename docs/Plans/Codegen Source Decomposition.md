# Codegen Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `2d1af74`

## Purpose

This record applies ADR-0004 to the two codegen units that crossed Weaver's
explicit decomposition-review threshold. It records the responsibility
inventory, extraction disposition, dependency direction, conservation gates,
and remaining work. The campaign is behavior-preserving; semantic expansion
and performance optimization are outside its scope.

## Conservation checkpoint

The pre-extraction checkpoint is commit `2d1af74`. At that checkpoint:

- `test/codegen/compile.native-runtime.test.ts` passed 82 tests;
- the combined runtime, trace, and native-runtime selection passed 100 tests;
- `npm run typecheck` reached only two already-known unused-constant failures
  in the `.NET` packaging integration tests; and
- the S1000D/BREX timeout remained a known performance observation rather than
  a condition this structural work could silently reinterpret as fixed.

The extraction must retain public exports, IR shape, generated source text
semantics, runtime-helper selection, template dispatch, positional predicate
behavior, trace events, source provenance, and interpreter/native parity.

## Review: `emitInstructions.ts`

### Trigger and responsibility inventory

The unit contained 2,409 physical lines and therefore required an explicit
review. It also satisfied responsibility triggers independent of size:

- selection and composition of whole native transform plans;
- global, template-parameter, invocation, and local-variable binding setup;
- recursive XSLT instruction rendering;
- XPath test and scalar-expression lowering;
- simple path recognition and optimized path string-value emission; and
- specialized `document()/root/data[@name]/value` lookup lowering used by the
  BREX path.

Ordinary native-feature, trace, and BREX optimization campaigns all modified
the unit. The disposition is **decompose**.

### First extraction: native path expressions

`nativePathExpressions.ts` owns the native backend's supported simple-path
recognition and string-value lowering.

- Subject: native code generation.
- Responsibility: recognize the supported path subset and lower it to typed
  TypeScript expression nodes and runtime-helper requirements.
- Authority: native lowering for an already-compiled XPath AST; it does not
  define XPath meaning.
- Inputs: source-located XPath AST, context-node identifier, bound-variable
  expressions, and the runtime-helper accumulator.
- Outputs: a `TsExpression`, recognized path description, or `undefined` when
  the native subset does not support the expression.
- Dependencies: XPath AST contracts and `ts-ir`; dependency direction is
  `emitInstructions -> nativePathExpressions`.
- Exclusions: XSLT instruction sequencing, template dispatch, runtime I/O,
  host resource policy, and public API ownership.

After extraction, `emitInstructions.ts` contains 1,968 physical lines and
`nativePathExpressions.ts` contains 449. The parent remains in the
inspect-on-substantive-change band; its remaining transform-plan, binding, and
instruction-rendering responsibilities require another cohesion check before
the campaign closes.

### Second extraction: native transform planning

The follow-up review found a directional seam between whole-transform plan
selection and recursive instruction lowering. `nativeTransformPlan.ts` now
owns:

- selection among named-initial, mixed-initial, single-template, root
  apply-templates, and matched-template native plan shapes;
- global and default template-parameter setup;
- selection of the initial/current context node; and
- the `NativeTransformPlan` contract consumed by emitted and direct native
  execution.

It consumes the instruction emitter as a bounded dependency. The instruction
emitter does not import transform-plan selection, so the extraction introduces
no cycle. `emitInstructions.ts` now contains 1,180 physical lines and owns
recursive instruction lowering plus the `xsl:call-template` invocation setup
that is used directly by that lowering. `nativeTransformPlan.ts` contains 795
lines. Both are below the explicit-review threshold.

The retained disposition for `emitInstructions.ts` is **retain and inspect on
substantive change**. Its remaining XPath test/value, attribute, variable, and
instruction cases cooperate through the same recursive emitter state and
runtime-helper accumulator. Splitting those cases now would primarily pass the
same broad emission context between sibling modules rather than reduce
responsibility coupling.

## Review: `nativeApplyTemplates.ts`

### Trigger and responsibility inventory

The unit contained 2,304 physical lines and therefore required an explicit
review. Its responsibilities were:

- recognize root and nested apply-templates shapes;
- select candidate template rules and preserve priority/order behavior;
- render native apply-templates callbacks and trace hooks;
- recognize supported child selection paths; and
- compile positional XPath predicates into serializable step constraints,
  including `position()`, `last()`, ranges, negation, modulo constraints, and
  total-dependent polynomial forms.

The positional predicate compiler is independently describable and consumes
neither template bodies nor renderer state. The disposition is **decompose**.

### First extraction: native position predicates

`nativePositionPredicate.ts` owns compilation of the supported positional
predicate subset.

- Subject: native apply-templates path planning.
- Responsibility: translate a positional predicate AST into the constraint
  object consumed by `selectSimplePathNodesByStepPlan`.
- Authority: native recognition and optimization only; XPath predicate meaning
  remains owned by Weaver's shared XPath semantics.
- Inputs: XPath AST nodes.
- Outputs: a serializable `SimpleSelectPathStepPlan` constraint fragment or
  `undefined` for unsupported forms.
- Dependencies: XPath AST contracts only; dependency direction is
  `nativeApplyTemplates -> nativePositionPredicate`.
- Exclusions: template selection, instruction rendering, tracing, runtime node
  traversal, resource access, and public API ownership.

After the first extraction, `nativeApplyTemplates.ts` contains 728 physical
lines and owns apply-templates planning and emission. The initial
`nativePositionPredicate.ts` extraction contained 2,085 lines, so it received
its own explicit review rather than merely moving the size pressure.

Direct tests demonstrated a second ownership seam:

- `nativePositionPlan.ts` owns the 166-line serializable constraint contract;
- `nativePositionPredicate.ts` owns the 1,261-line recognition and
  normalization of supported XPath predicate forms; and
- `nativePositionPlanAlgebra.ts` owns the 672-line merge/union algebra and its
  integer constraint arithmetic.

Dependency direction is predicate recognition to plan algebra and plan
contract, while the algebra depends only on the plan contract. None of these
modules imports template rendering or runtime traversal. This disposition is
**decompose completed for the demonstrated position-planning seams**. The
predicate recognizer remains in the inspect-on-substantive-change band.

## Post-extraction coupling review

The first extractions are directional:

```text
emitInstructions
    -> nativePathExpressions

nativeTransformPlan
    -> emitInstructions
    -> nativeApplyTemplates
        -> nativePositionPredicate
            -> nativePositionPlanAlgebra
                -> nativePositionPlan
            -> nativePositionPlan

nativePathExpressions
    -> XPath AST + ts-ir

nativePositionPredicate
    -> XPath AST + private plan contract/algebra
```

Neither extracted unit imports its former parent, owns mutable renderer state,
or receives a broad context object. Both return bounded typed results and
signal unsupported native lowering with `undefined`, preserving the existing
fallback boundary.

## Remaining campaign

- [x] Extract simple-path recognition and optimized path-value lowering from
      `emitInstructions.ts`.
- [x] Extract positional predicate compilation from
      `nativeApplyTemplates.ts`.
- [x] Add focused tests around the positional predicate planning boundary so a
      merge/union-algebra extraction can be evaluated without relying only on
      full renderer fixtures.
- [x] Review whether transform-plan selection, binding setup, and recursive
      instruction rendering are separate responsibilities in
      `emitInstructions.ts`; retain or extract them with an explicit coupling
      disposition.
- [x] Review whether `nativePositionPredicate.ts` can separate its serializable
      constraint contract and merge/union algebra without creating a cyclic or
      pass-through module graph.
- [x] Run `npm run typecheck`, the focused native/runtime/trace tests, and
      `npm test` after each coherent extraction group.
- [x] Re-run the bounded and full BREX comparison separately from structural
      changes before claiming any performance effect.

## Verification status

The current structural checkpoint has:

- `npm run typecheck` passing;
- 107 focused native-position, native-runtime, runtime, and trace tests passing;
- 421 broader codegen emission, runtime, diagnostics, source-map, declaration,
  extension-function, and golden tests passing across 33 files;
- `npm run build` and focused ESLint validation passing;
- the XSLT 3.0 MVP+3 conformance slice passing 73/73 during the full-suite run;
  and
- a normal MkDocs build completing. The mandated strict build reaches 56
  pre-existing broken-link warnings outside this campaign and therefore
  remains non-green.

The generated-fixture baseline was refreshed for the coverage/trace-summary
emission introduced before this campaign. The fixture harness now exposes an
explicit `WEAVER_UPDATE_GENERATED_FIXTURES=1` update path, and 149 checked-in
fixtures were regenerated through that path. Windows emitted-JS tests now load
temporary modules through decoded file URLs. The React consumer runtime shim
was synchronized with the generated runtime-helper surface.

The `.NET` package integration tests now use an isolated package cache and a
dedicated integration package version. This avoids parallel tests deleting or
partially observing the shared user package cache while retaining the normal
NuGet fallback cache for framework reference packages.

The final `npm test` run passed all 85 test files: 1,016 tests passed, one was
skipped, and two remain todo. The run also confirmed the QT3 MVP+2 supported
slice at 2,487/2,487 and the XSLT 3.0 MVP+3 slice at 73/73. Vite continues to
print non-fatal warnings when emitted JavaScript source-map comments name the
stylesheet map rather than the adjacent JavaScript map; no tests fail on those
warnings.

Repository-wide ESLint reaches one pre-existing unused-variable error in
`src/cli.ts` plus existing warnings in conformance tests. Focused lint for the
codegen, processor, and test files participating in this extraction passes.

The separately executed BREX conservation run completed for interpreter and
emitted bundle with identical output lengths and trace summaries. The bounded
`refs=20`, `br=20` case completed in 347.0 ms and 197.6 ms with 58,725 output
characters and 3,060 trace events. The full case completed in 9.75 s and 9.47 s
with 946,691 output characters and 58,862 trace events. Native direct execution
reported its existing explicit unsupported result. These measurements update
the old timeout evidence; they are not attributed to the structural moves in
this campaign.

## Reopening triggers

Revisit the first boundaries if:

- path recognition starts importing instruction-rendering policy;
- positional planning starts owning runtime traversal or template selection;
- helper accumulation or generated source changes despite equal output tests;
- fallback frequency changes for an unchanged fixture;
- the extracted modules need broad access to their former parents; or
- BREX or conformance evidence changes and cannot be attributed independently
  of the structural move.

# W3C Corpus Ledger And Expansion

- Status: in progress
- Governing decisions: [ADR-0003](../ADR/ADR-0003-dual-execution-and-conformance-parity.md) and [ADR-0005](../ADR/ADR-0005-verification-ledger-and-corpus-accounting.md)
- Baseline: `be91790`
- Peer evidence: FastXSLT `a063ed3`

## Purpose

Convert Weaver's existing W3C gates into reproducible, denominator-conserving
evidence, then widen XSLT30 coverage through complete semantic families while
preserving interpreter/native/emitted parity.

Weaver currently executes more W3C cases than the peer that motivated this
plan. The goal is not to copy its narrower engine roadmap. The useful lesson is
to retain every admitted case—including unsupported and harness-unsupported
members—so implementation completeness is measured against stable upstream
families rather than a growing list of already-green examples.

## Baseline

- QT3 revision: `83993587711dbd5c18ed846385ec37d079d6e492`
- XSLT30 revision: `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b`
- QT3 inventory: 31,821 cases in 428 test sets
- XSLT30 inventory: 14,600 cases in 234 test sets
- Current QT3 MVP+2 checkpoint: 2,487/2,487 selected cases pass
- Current XSLT30 MVP+3 checkpoint: 73/73 selected cases pass

The 73 XSLT30 cases come from 12 upstream test sets containing 1,320 cases.
The other 1,247 cases are not automatically applicable, but they currently
lack a durable selection disposition.

## Phase 0: Accounting foundation

**Status: complete in this checkpoint.**

- [x] Accept ledger identity, classification, conservation, and corpus-purpose
  invariants in ADR-0005.
- [x] Add cross-platform checks for exact submodule revisions, clean upstream
  worktrees, catalog references, duplicate references, and structural totals.
- [x] Add a private typed ledger model with conservation and duplicate/unknown
  observation rejection tests.
- [x] Move the 73-case XSLT30 selection from source code into a versioned
  first-party JSON overlay.
- [x] Preserve the existing QT3 and XSLT30 passing checkpoints.

## Phase 1: Complete small-family admission

**Status: pending.**

- [ ] Admit all six cases in XSLT30 `tests/decl/template/_template-test-set.xml`.
- [ ] Admit all ten cases in XSLT30 `tests/expr/path/_path-test-set.xml`.
- [ ] Resolve every case's dependency, environment, stylesheet, and assertion
  shape without ambient filesystem or network authority during engine
  execution.
- [ ] Record engine-unsupported and harness-unsupported cases before changing
  semantics.
- [ ] Execute applicable cases under the interpreter and identify which native
  modes are required or legitimately unsupported by the current profile.
- [ ] Add focused parity cases for every semantic behavior newly enabled by
  family widening.

The `template` family is first because Weaver already passes `template-006`
and owns broader named-template, parameter, node-test, attribute, mode, and
dispatch behavior. The `path` family follows because it applies pressure to
XPath axes, predicates, arithmetic, functions, match patterns, and file-backed
environments already represented elsewhere in Weaver.

## Phase 2: Migrate QT3 filtering into durable outcomes

**Status: pending.**

- [ ] Preserve the current structured exclusion reasons as ledger selection
  dispositions rather than debug-only output.
- [ ] Version the MVP+2 selection policy and retain every discovered case in
  the selected test sets.
- [ ] Treat unknown assertion, dependency, and environment shapes as visible
  metadata or harness outcomes.
- [ ] Retain broad-baseline reports instead of publishing only the filtered
  passing denominator.
- [ ] Pair XSLT family work with complete QT3 groups when XPath semantics are
  the actual implementation pressure.

## Phase 3: Multi-backend corpus parity

**Status: pending.**

- [ ] Record interpreter, native-direct, and native-emitted observations
  independently for profiles that require them.
- [ ] Compare structured semantic output and diagnostic identity before
  serializer text.
- [ ] Record documented native fallback separately from native execution.
- [ ] Reject a profile report when a required backend observation is missing.
- [ ] Keep generated-code readability and source-map checks in their existing
  focused suites while linking them to the same case identity when applicable.

## Phase 4: Metadata-driven XSLT30 widening

**Status: pending.**

- [ ] Inventory dependency kinds, environment shapes, stylesheet references,
  and assertion families across all 14,600 XSLT30 cases.
- [ ] Rank complete candidate families by implemented semantic overlap,
  harness readiness, diagnostic value, and backend parity cost.
- [ ] Prefer small coherent families over isolated green cases or enormous
  mixed error collections.
- [ ] Widen one family at a time, preserving its membership while dispositions
  move from unsupported to selected and passing.
- [ ] Publish no unqualified conformance percentage; every report names its
  suite revision, profile, exclusions, execution modes, and denominator.

Likely candidates after `template` and `path` include coherent groups within
parameters, variables, call-template, choose, literal result elements,
node-tests, and apply-templates. The 582-case generic error set is not an early
family merely because Weaver already passes 13 examples from it.

## Separate future corpus work

- W3C XML 20130923 remains an optional, hash-verified candidate pending rights,
  DTD/entity, edition, encoding, and parser-boundary review.
- Differential SaxonCS evidence remains separate from W3C conformance.
- Adversarial resource-limit fixtures remain separate from conformance.
- Compile/runtime benchmarks remain correctness-gated performance evidence,
  not standards results.

## Exit criteria

- Exact W3C inputs and structural totals are reproducibly verified in CI.
- Every admitted overlay conserves its selection denominator.
- Every selected case conserves its required per-backend execution outcomes.
- At least `template` and `path` are represented as complete upstream families.
- QT3 exclusion outcomes are durable and reproducible.
- Reports cannot silently lose a case because support, metadata, assertion, or
  execution handling changed.

## Checkpoint evidence

At the initial accounting checkpoint:

- `npm run test:corpus-sources` verifies the exact QT3 and XSLT30 revisions and
  reproduces 31,821/428 and 14,600/234 case/test-set inventories;
- typecheck, focused ESLint, and the package build pass;
- 20 focused ledger, inventory, overlay, XSLT30, and QT3 tests pass with one
  optional broad-baseline test skipped;
- the complete suite passes 1,025 tests across 89 files, with one skipped and
  two todo;
- XSLT30 remains 73/73 and QT3 MVP+2 remains 2,487/2,487; and
- a normal MkDocs build passes. Strict mode retains the same 56 pre-existing
  broken-link warnings and reports no new warning from this work.

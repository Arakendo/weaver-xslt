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

**Status: complete in the template/path family checkpoint.**

- [x] Admit all six cases in XSLT30 `tests/decl/template/_template-test-set.xml`.
- [x] Admit all ten cases in XSLT30 `tests/expr/path/_path-test-set.xml`.
- [x] Resolve every case's dependency, environment, stylesheet, and assertion
  shape without ambient filesystem or network authority during engine
  execution.
- [x] Record engine-unsupported and harness-unsupported cases before changing
  semantics.
- [x] Execute applicable cases under the interpreter and identify which native
  modes are required or legitimately unsupported by the current profile.
- [x] Add focused parity cases for every semantic behavior newly enabled by
  family widening.

The `template` family is first because Weaver already passes `template-006`
and owns broader named-template, parameter, node-test, attribute, mode, and
dispatch behavior. The `path` family follows because it applies pressure to
XPath axes, predicates, arithmetic, functions, match patterns, and file-backed
environments already represented elsewhere in Weaver.

The completed family overlay inventories all 16 upstream members. All six
`template` cases and seven `path` cases pass under the interpreter. Three
`path` cases remain explicitly engine-unsupported: two require `floor()`, and
one currently produces an empty result for a complex arithmetic match pattern.
The discovery profile does not require native modes, and no new engine
semantics were enabled in this checkpoint, so no new parity fixture was
necessary. See the [family baseline evidence](../Evidence/XSLT30%20Template%20And%20Path%20Family%20Baseline.md).

## Phase 2: Migrate QT3 filtering into durable outcomes

**Status: complete in the QT3 MVP2 profile checkpoint.**

- [x] Preserve the current structured exclusion reasons as ledger selection
  dispositions rather than debug-only output.
- [x] Version the MVP+2 selection policy and retain every discovered case in
  the selected test sets.
- [x] Treat unknown assertion, dependency, and environment shapes as visible
  metadata or harness outcomes.
- [x] Retain broad-baseline reports instead of publishing only the filtered
  passing denominator.
- [x] Pair XSLT family work with complete QT3 groups when XPath semantics are
  the actual implementation pressure.

The versioned MVP2 profile now conserves all 7,289 upstream cases across its
65 test sets. Its 2,487 selected cases pass, while 4,802 non-selected cases
retain explicit dispositions. Expected totals plus a digest over every
identity, disposition, reason, and detail make selection drift visible even
when aggregate counts do not change. The existing `fn/floor` QT3 group is
included and passing; the XSLT `path-008`/`path-009` gaps therefore identify
an XSLT match-expression integration boundary rather than absent XPath
`floor()` semantics. See the [QT3 profile evidence](../Evidence/QT3%20MVP2%20Profile%20Baseline.md).

## Phase 3: Multi-backend corpus parity

**Status: complete in the corpus-linked native artifact checkpoint.**

- [x] Record interpreter, native-direct, and native-emitted observations
  independently for profiles that require them.
- [x] Compare structured semantic output and diagnostic identity before
  serializer text.
- [x] Record documented native fallback separately from native execution.
- [x] Reject a profile report when a required backend observation is missing.
- [x] Keep generated-code readability and source-map checks in their existing
  focused suites while linking them to the same case identity when applicable.

The initial parity profile retains the complete 16-case template/path
denominator and requires interpreter, native-direct, and native-emitted
observations. `template-006` is the first selected case and passes under all
three. The other 15 cases remain engine-unsupported for this profile.

The initial probe also found that generic emitted modules can execute through
`transformCompiledStylesheet` when no shared native plan exists. Those
results are useful compatibility evidence but are not native-emitted evidence.
The corpus harness now rejects that fallback before recording a native-emitted
observation. See the [native parity baseline](../Evidence/XSLT30%20Native%20Parity%20Baseline.md).

The selected `template-006` identity also drives a focused codegen test. It
compiles the exact upstream stylesheet, rejects compiler imports and generic
runtime fallback, checks readable lowered TypeScript, retains suite-native
provenance, embeds the upstream source, and maps generated template/literal
execution back to upstream line 4.

## Phase 4: Metadata-driven XSLT30 widening

**Status: in progress at the metadata-ranking and deep-equal checkpoint.**

- [x] Inventory dependency kinds, environment shapes, stylesheet references,
  and assertion families across all 14,600 XSLT30 cases.
- [x] Rank complete candidate families by implemented semantic overlap,
  harness readiness, diagnostic value, and backend parity cost.
- [x] Prefer small coherent families over isolated green cases or enormous
  mixed error collections.
- [x] Widen one family at a time, preserving its membership while dispositions
  move from unsupported to selected and passing.
- [x] Publish no unqualified conformance percentage; every report names its
  suite revision, profile, exclusions, execution modes, and denominator.

The deterministic metadata screen found 16 complete, harness-ready candidate
families of at most 20 cases. Execution ranking selected the two-case
`deep-equal` family for immediate admission; it now passes 2/2 under the
interpreter. The four-case `for` family is next because it combines one passing
case with focused pressure on `xsl:sequence`, sequence arithmetic, and
`format-number()`, and FastXSLT independently selected the same family. See the
[metadata inventory and ranking evidence](../Evidence/XSLT30%20Metadata%20Inventory%20And%20Family%20Ranking.md).

The complete `for` denominator is now admitted separately: `for-002` passes,
while the other three cases retain those precise engine-unsupported
dispositions. Implementation can move each disposition without changing the
family membership.

Larger coherent groups within parameters, variables, call-template, choose,
literal result elements, node-tests, and apply-templates remain candidates
after the small-family queue. The 582-case generic error set is not an early
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

At the template/path family checkpoint:

- all 16 upstream cases are durably inventoried by a separate overlay;
- 13/13 selected interpreter cases pass and three engine gaps remain visible;
- overlay membership is checked against the complete pinned upstream test sets;
- the reusable XSLT30 harness preserves the existing 73/73 MVP+3 checkpoint;
- malformed actual engine output is classified as a semantic mismatch rather
  than a harness failure;
- the complete suite passes 1,027 tests across 90 files, with one skipped and
  two todo; and
- typecheck, focused ESLint, package build, exact corpus verification, and a
  normal MkDocs build pass. Strict documentation mode retains the same 56
  pre-existing broken-link warnings.

At the QT3 MVP2 profile checkpoint:

- all 7,289 upstream cases in the 65 admitted test sets receive durable
  selection outcomes;
- 2,487/2,487 selected interpreter cases pass, with 4,802 explicit
  non-selected outcomes;
- an outcome digest detects per-case selection, reason, or detail drift;
- the complete suite passes 1,028 tests across 91 files, with one skipped and
  two todo; and
- typecheck, focused ESLint, package build, exact corpus verification, and a
  normal MkDocs build pass. Strict documentation mode retains the same 56
  pre-existing broken-link warnings.

At the initial native-parity checkpoint:

- the complete 16-case template/path denominator is retained;
- `template-006` passes independently under interpreter, native-direct, and
  genuine native-emitted execution;
- 15 engine-unsupported cases remain visible;
- generic `transformCompiledStylesheet` emission is rejected as
  native-emitted evidence when no shared native plan exists;
- the complete suite passes 1,031 tests across 92 files, with one skipped and
  two todo; and
- typecheck, focused ESLint, package build, exact corpus verification, and a
  normal MkDocs build pass. Strict documentation mode retains the same 56
  pre-existing broken-link warnings.

At the corpus-linked native artifact checkpoint:

- the parity-selected `template-006` identity is shared by corpus execution,
  emitted-code readability, runtime-boundary, provenance, and source-map
  checks;
- common source-map decoding helpers are kept in focused test support rather
  than duplicated between suites;
- the complete suite passes 1,032 tests across 93 files, with one skipped and
  two todo; and
- Phase 3's initial multi-backend accounting and artifact-linkage criteria are
  complete. Native family widening continues through Phase 4.

At the metadata-ranking and deep-equal checkpoint:

- all 14,600 XSLT30 cases contribute dependency, environment, stylesheet, and
  assertion metadata to a reproducible inventory;
- the inventory retains 9,663 stylesheet references, 7,646 distinct files,
  564 metadata shapes, and the exact 10,798 referenced / 2,161 inline / 1,641
  absent environment split;
- 16 complete small families receive independent interpreter, native-direct,
  and native-emitted execution rankings with per-family outcome digests;
- the complete `deep-equal` family passes 2/2 under its interpreter profile;
- the complete `for` family is the next semantic decomposition target; and
- the complete suite passes 1,039 tests across 97 files, with one skipped and
  two todo; typecheck, focused ESLint, package build, exact corpus
  verification, and a normal MkDocs build pass. Strict documentation mode
  retains the same 56 pre-existing broken-link warnings.

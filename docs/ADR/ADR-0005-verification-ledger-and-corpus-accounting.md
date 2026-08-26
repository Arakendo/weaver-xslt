# ADR-0005: Verification Ledger And Corpus Accounting

- Status: Accepted
- Date: 2026-08-26
- Related decisions: ADR-0002, ADR-0003, and ADR-0004
- Peer evidence: FastXSLT ADR-0006, ADR-0007, and AR-0011 at commit `a063ed3`

## Context

Weaver uses the pinned W3C QT3 and XSLT 3.0 suites as primary standards
evidence. The current harness has useful curated gates: 2,487 QT3 cases pass
the MVP+2 support filter and 73 explicitly named XSLT30 cases pass the MVP+3
runner. The QT3 gate exposes structured exclusion reasons, and the XSLT runner
retains upstream set and case names.

Those results are real but do not yet form a conserved verification ledger. A
case can disappear when a support filter changes, an assertion cannot be
decoded, an environment cannot be loaded, or a curated list simply does not
name it. A passing-only list also cannot distinguish product scope from engine
capability or harness capability. With three relevant execution modes—
interpreter, native direct, and native emitted—one aggregate result can also
hide parity gaps.

FastXSLT, a narrower peer using the same pinned suite revisions, demonstrated a
useful accounting discipline: preserve suite-native identity, separate case
selection from execution, keep unsupported and unknown cases visible, widen by
complete metadata families, and mechanically conserve denominators. Weaver
adopts those invariants while extending them for its dual-backend architecture.

## Decision

Weaver standards verification uses a denominator-conserving ledger governed by
the following rules.

### Stable case identity

A standards case is identified by:

- suite name;
- immutable suite revision;
- suite-native test-set path; and
- suite-native case name.

Generated test names, array positions, shards, workers, completion order, and
local filenames alone are not case identity.

### Selection and execution are separate axes

Every inventoried case in an admitted overlay receives exactly one selection
disposition:

- `selected`;
- `profile-excluded`;
- `engine-unsupported`;
- `harness-unsupported`; or
- `metadata-failure`.

Every selected case receives an execution observation for each execution mode
required by that profile. Execution outcomes distinguish:

- comparison passed;
- semantic result mismatch;
- expected-diagnostic mismatch;
- engine operation failure;
- harness operation failure; and
- incomplete execution.

An expected standards error that matches its assertion is a comparison pass.
Unsupported behavior is not a pass. A harness limitation is not an engine
failure. Unknown metadata is not silently converted into profile exclusion.

### Backend observations remain independent

Interpreter, native-direct, and native-emitted observations are recorded
separately. A profile states which modes it requires. Parity is derived from
their structured semantic results and diagnostics; it is not inferred from one
mode passing or from identical display text.

Native fallback remains governed by ADR-0003 and the native boundary
specifications. The ledger observes fallback or unsupported outcomes without
changing their semantics.

### Denominators are conserved

For every admitted overlay:

```text
inventoried cases
    = selected
    + profile excluded
    + engine unsupported
    + harness unsupported
    + metadata failures
```

For each required execution mode:

```text
selected cases
    = passed
    + semantic mismatches
    + diagnostic mismatches
    + engine failures
    + harness failures
    + incomplete
```

Duplicate identities, observations for unknown or unselected cases, duplicate
mode observations, and mixed suite/profile identities fail visibly.

### Immutable upstream, first-party overlays

QT3 and XSLT30 remain immutable Git submodules. Weaver-owned overlays live
outside `vendor/` and record selection, expected capability, rationale, and
issue references without modifying upstream fixtures or expected results.

Integrity verification checks the exact submodule revisions, clean submodule
worktrees, root catalogs, referenced test-set existence, duplicate references,
and expected structural totals. A revision update reviews catalog, metadata,
fixture, and licensing movement before changing the pin.

### Widen by coherent upstream families

Curated green slices remain useful checkpoints, but future widening admits a
complete, reviewable upstream family before implementation work begins.
Unsupported and harness-unsupported members remain in the family denominator
as support grows. A family may be a complete small test set or another complete
metadata-defined group whose membership can be reproduced from upstream data.

Selection rules may be programmatic, but their version and complete outcomes
must be durable. A source-code predicate alone is not a historical ledger.

### Corpus purposes remain distinct

Conformance, adversarial/security, backend-parity, differential, golden, and
performance corpora answer different questions. Reports may relate their
evidence but do not merge their denominators or silently promote a regression,
stress fixture, benchmark, or external-engine comparison into a standards
claim.

### Reports identify material inputs

A retained report names the suite revision, overlay/profile version, Weaver
revision, harness revision, required execution modes, Node/toolchain version,
target platform, and relevant feature configuration. A material input change
creates a new report identity rather than rewriting earlier evidence.

## Consequences

### Positive

- Corpus growth cannot improve a percentage by silently hiding hard cases.
- Harness gaps, engine gaps, parity gaps, and standards mismatches remain
  distinguishable.
- Complete W3C families can drive implementation without claiming adjacent
  XSLT or XPath support.
- The same accounting supports local runs, CI, sharding, and later durable
  reports.
- Exact corpus provenance becomes mechanically verifiable.

### Negative

- Overlays and disposition changes require maintenance and review.
- Broad discovery produces many visible unsupported cases before it produces
  a flattering percentage.
- Multi-mode accounting increases execution and reporting cost.
- The initial implementation must migrate existing curated gates before the
  full ledger is available.

## Initial application

The first implementation checkpoint will:

1. verify the existing QT3 and XSLT30 revisions and structural inventories;
2. add a tested private ledger/conservation model;
3. move the existing 73-case XSLT30 MVP+3 selection into a versioned overlay;
4. preserve the current 73/73 and 2,487/2,487 gates; and
5. plan complete `template` and `path` family admission before broader
   metadata-driven widening.

This ADR does not make the verification ledger a package API, claim complete
XSLT 3.0 or XPath 3.1 conformance, require every corpus case in ordinary unit
test runs, or admit the W3C XML conformance archive.

## Reopening triggers

Reconsider this decision if suite-native identity cannot survive a required
adapter, denominator conservation makes ordinary development impractical,
upstream licensing or suite structure prevents reproducible use, or a formal
conformance process requires materially different accounting.

## Related documentation

- [ADR-0002: Diagnostics And Public Boundaries](ADR-0002-diagnostics-and-public-boundaries.md)
- [ADR-0003: Dual Execution And Conformance Parity](ADR-0003-dual-execution-and-conformance-parity.md)
- [W3C Corpus Ledger And Expansion](../Plans/W3C%20Corpus%20Ledger%20And%20Expansion.md)
- [QT3 Gate](../Corpus/QT3%20Gate.md)
- [Test Sources](../Corpus/Test%20Sources.md)

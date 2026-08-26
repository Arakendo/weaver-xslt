# ADR-0004: Source Unit Cohesion, Size Pressure, And Decomposition

- Status: Accepted
- Date: 2026-08-26
- Related decisions: ADR-0001, ADR-0002, and ADR-0003

## Context

Weaver deliberately owns XML, XPath, and XSLT semantics while retaining an
interpreter, native direct execution, readable TypeScript/JavaScript emission,
structured diagnostics, host adapters, conformance harnesses, and focused
regressions. As those surfaces mature, a successful implementation unit can
accumulate several responsibilities even when each individual change is
reasonable.

This pressure is already visible in hand-maintained compiler, runtime, and
test files. At the time of this decision, for example:

| Source unit | Approximate lines | Initial disposition |
| --- | ---: | --- |
| `src/xslt/codegen/emitInstructions.ts` | 2,169 | Explicit decomposition review required. |
| `src/xslt/codegen/nativeApplyTemplates.ts` | 2,004 | Explicit decomposition review required. |
| `src/xslt/compile/analyze.ts` | 1,461 | Inspect cohesion during substantive modification. |
| `src/xslt/eval/transform.ts` | 1,436 | Inspect cohesion during substantive modification. |
| `src/runtime/index.ts` | 1,167 | Inspect cohesion during substantive modification. |

The same pressure exists in large regression suites. Retaining regressions is
valuable evidence, but their growth does not require every invariant to remain
in the first test file that exposed it.

Line count alone is not an architectural defect. A short file can mix semantic
owners, while a generated artifact, lookup table, or cohesive declarative unit
can reasonably be large. The architectural problem appears when a source unit
no longer communicates one coherent implementation responsibility and makes
ownership, review, testing, navigation, or change isolation materially worse.

> File size triggers review; responsibility boundaries justify decomposition.

> Split by meaning, not by line count.

## Decision

Weaver hand-maintained source units must represent one coherent implementation
responsibility. Size and responsibility signals trigger an explicit cohesion
review. The review may retain a cohesive unit, require behavior-preserving
decomposition, or record a bounded exception.

This decision applies proportionally to TypeScript, JavaScript, C#, CSS, and
other hand-maintained implementation and test files. It does not move XML,
XPath, or XSLT semantics into host adapters, nor does it create a reason to
fork interpreter and native behavior.

### Size review triggers

Physical line count is a deliberately inexpensive first signal:

| Hand-maintained source size | Required treatment |
| --- | --- |
| Up to 1,000 lines | Ordinary. No size justification is required, although responsibility signals may still require review. |
| 1,001-2,000 lines | Inspect cohesion during a substantive modification. |
| 2,001-4,000 lines | Perform and retain an explicit decomposition review. |
| More than 4,000 lines | Presume decomposition debt. Retain the file only with a documented cohesion or sequencing reason. |
| More than 8,000 lines | Exceptional. Active work should normally include a checkpointed decomposition campaign. |

These are review thresholds, not merge failures, quality scores, or automatic
instructions to create more files. Comments and embedded tests count because
they contribute to the same navigation and review burden.

Tooling may report units that cross a threshold. CI must not fail solely
because a file crosses a numeric threshold unless a later accepted decision
admits a specific mechanical gate with demonstrated value.

### Responsibility review triggers

A decomposition review is required regardless of line count when a source unit
shows two or more of these conditions:

- it contains multiple independently testable subsystems or invariants;
- it mixes XML/XPath/XSLT semantics with CLI, UI, packaging, filesystem, or
  other host policy;
- it gives interpreter, native direct, and emitted execution separate copies
  of meaning that should be shared;
- it mixes stable compilation or runtime behavior with exploratory corpus or
  performance work;
- it contains several unrelated diagnostic, trace, or reporting systems;
- ordinary changes routinely touch distant, unrelated regions of the file;
- understanding a focused test requires navigating substantial unrelated
  implementation or fixtures;
- the path and filename do not communicate a useful semantic owner and
  implementation responsibility;
- a responsibility can move behind a private module without changing a stable
  contract; or
- multiple plans, ADRs, Architectural Reviews, or conformance campaigns
  independently modify the same unit.

Crossing a size threshold and satisfying one responsibility trigger is also
sufficient to require review.

### Decomposition follows ownership seams

Every extracted module must name the responsibility it owns. Decomposition
must not produce numbered fragments, arbitrary line buckets, generic `utils`
collections, or files that only make sense when read as one anonymous
continuous source unit.

Directory structure communicates subject ownership. Module naming communicates
the implementation responsibility within that subject. Existing Weaver
subjects include `xml`, `xdm`, `xpath`, `xslt/compile`, `xslt/eval`,
`xslt/codegen`, `runtime`, `diagnostics`, and `processor`. Those paths are not
permission to create new public boundaries; they identify where an already
demonstrated responsibility belongs.

Useful responsibility names may include `contract`, `analysis`, `selection`,
`dispatch`, `lowering`, `serialization`, `diagnostics`, `trace`, `adapter`, or
`fixture`, but this vocabulary is descriptive rather than a required file
template. Prefer a precise semantic name such as `templateDispatch` over a
generic name such as `helpers`.

Before accepting an extracted unit as a coherent seam, the review must be able
to state:

- its subject and implementation responsibility;
- the semantic authority or host policy it owns;
- the inputs it consumes;
- the outputs, effects, or observations it produces;
- its allowed dependency direction; and
- the responsibilities it explicitly must not own.

The smallest sufficient visibility is preferred:

1. a private sibling or child module;
2. an existing internal shared module when several local owners need it;
3. an existing public abstraction when the responsibility already belongs
   there; or
4. a new public export or package boundary only after a separate accepted
   decision and caller evidence justify it.

Moving code to reduce a file's size does not change who owns its meaning.
Filesystem ownership and architectural ownership remain distinct.

### Successful extraction reduces responsibility coupling

Smaller files alone are not evidence of successful decomposition. A review
must inspect:

- dependency direction between the extracted modules;
- which state and policy each module reads or mutates;
- whether the module can be tested through its named responsibility;
- whether sibling internals are routed through a parent merely to hide a
  dependency cycle; and
- whether a broad context object or parameter recreates the former monolith.

Coordination through a composition root is expected. The extraction is not
successful when most child modules still require most of the former unit's
state or policy for ordinary work.

> Successful decomposition reduces responsibility coupling, not merely
> physical source size.

### Tests are organized by invariant

Tests that require private implementation access may remain adjacent to a
private module. Contract, golden, conformance, and parity tests should use the
narrowest honest boundary and be grouped by the invariant they retain.

Splitting a large test file must preserve focused assertions, fixture identity,
and diagnostic expectations. It must not replace semantic or parity assertions
with broad snapshots, duplicate engine behavior in test helpers, or divide one
fixture family into arbitrary numeric batches.

### Active semantic and performance work uses checkpoints

A size trigger does not authorize an unrelated refactor in the middle of an
unresolved conformance, semantic, diagnostic, or performance investigation.
For an exceptional or contested unit under active work:

1. reach and record a coherent checkpoint;
2. retain the passing focused tests, parity results, conformance counts,
   benchmarks, traces, and known failures relevant to that checkpoint;
3. perform behavior-preserving extraction separately from semantic repair or
   optimization;
4. rerun the same evidence gates after each coherent extraction group; and
5. resume the investigation only after the reorganized implementation
   reproduces the checkpoint.

If a safe checkpoint is not available, the review records why extraction would
increase attribution risk and names the next bounded checkpoint at which the
decision will be revisited.

### Conservation requirements

A decomposition change must retain all applicable contracts and observations:

- Weaver's ownership of XML, XPath, and XSLT semantics;
- public API, package exports, and visibility unless separately changed by an
  accepted decision;
- versioned IR shape and native-plan boundaries;
- interpreter, native direct, emitted TypeScript/JavaScript, and bundle
  semantic parity;
- evaluation order, output order, node identity, and failure behavior;
- structured diagnostic identities, ordering, frames, and source provenance;
- explicit resource, security, filesystem, and execution policy;
- readability, deterministic naming, and source-map behavior of generated
  TypeScript;
- relevant golden, conformance, packaging, workbench, and integration evidence;
- retained performance baselines and trace summaries; and
- the known failure or falsification being investigated.

Mechanical extraction must not quietly fix, suppress, or reinterpret an active
defect. A semantic fix or optimization discovered during extraction is made as
a separate reviewable change after the conservation baseline is restored.

### Exceptions

The graduated thresholds do not apply directly to:

- generated TypeScript, JavaScript, declarations, source maps, or bundled site
  assets;
- vendored code and W3C conformance suites;
- machine-produced bindings;
- static lookup tables or data-dominant source units;
- exact corpus and golden artifacts whose value depends on retained identity;
  or
- cohesive declarative schemas or manifests where splitting would materially
  reduce comprehension.

An exception must identify its category, distinguish generated or data content
from hand-maintained implementation where practical, and explain why the unit
is more coherent intact. Convenience alone is not sufficient.

### Review record

An explicit decomposition review records:

- current line count and responsibility inventory;
- the thresholds and triggers that caused the review;
- proposed module subjects, responsibilities, authorities, inputs, outputs,
  exclusions, and owners;
- expected dependency direction and the intended coupling reduction;
- whether public APIs, IR contracts, or dependency direction would change;
- the checkpoint and conservation evidence;
- the disposition: decompose, retain with reason, or defer to a named
  checkpoint; and
- reopening triggers.

A multi-step extraction campaign belongs in a plan or implementation record.
That record must distinguish behavior-preserving moves from later semantic
repairs and performance changes.

## Initial Application

This ADR does not mandate an immediate repository-wide split. It establishes
the following review obligations:

- `src/xslt/codegen/emitInstructions.ts` and
  `src/xslt/codegen/nativeApplyTemplates.ts` receive explicit decomposition
  reviews before or as part of their next substantial campaigns;
- files in the 1,001-2,000 line band receive cohesion inspection when next
  modified substantively; and
- large test suites may be reorganized by retained invariant when that work can
  conserve fixture and assertion behavior.

Candidate seams must be derived from the code. For example, emission of
specific instruction families, template selection, path lowering, tracing,
and runtime composition may prove to be separate responsibilities, but this
ADR does not pre-admit those candidates or require one file per instruction.

The current S1000D/BREX performance investigation is an active checkpointed
campaign. Decomposition touching its hot paths must retain the same bounded and
full-document fixtures, backend comparisons, trace summaries, and known timeout
observation before a structural change is described as successful.

## Alternatives Considered

### Continue with local judgment only

This avoids process, but it gives recurring compiler, backend, diagnostics, and
corpus work no shared point at which to evaluate contested ownership.

Rejected because current source units already cross explicit-review thresholds
and several are modified by independent feature and performance campaigns.

### Enforce a hard maximum line count

Fail CI or review when a file exceeds a fixed size.

Rejected because line count is not responsibility. A hard cap encourages
arbitrary splits and mishandles generated, data-heavy, and declarative units.

### Publish a size report without an architectural rule

Report large files but leave the consequences unspecified.

Rejected as insufficient. A report can locate pressure but cannot preserve
semantic ownership or decide whether a unit should be retained, decomposed, or
deferred to a safer checkpoint.

### Use graduated triggers and cohesion review

Use size as an inexpensive signal, require responsibility analysis, and
conserve semantics and evidence through checkpointed decomposition.

Accepted because it addresses the demonstrated pressure without turning
filesystem layout into architectural authority or weakening Weaver's semantic
and backend boundaries.

## Consequences

### Positive

- Large or contested units receive review before navigation and attribution
  costs grow without bound.
- Semantic, backend, diagnostic, and host-policy ownership becomes easier to
  inspect.
- Private extraction can improve isolation without manufacturing public APIs.
- Regression and conformance evidence can keep growing while being organized by
  meaningful invariants.
- Active semantic and performance investigations retain a clear before/after
  checkpoint.

### Negative

- Reviews and conservation reruns add near-term work.
- Extraction may expose hidden coupling that requires careful sequencing.
- Cohesive units may require a written retain decision even when no split is
  appropriate.
- Numeric thresholds may be mistaken for quality scores unless reviews keep
  responsibility and evidence central.

## Reopening Triggers

Revisit this decision if:

- reviews repeatedly become ritual justification without improving ownership;
- the thresholds cause arbitrary fragmentation or substantial churn;
- generated, vendored, corpus, or data-heavy files are routinely
  misclassified;
- private extraction repeatedly requires accidental public APIs;
- decomposition cannot reliably conserve cross-backend, conformance,
  diagnostic, or performance evidence; or
- a Weaver artifact class demonstrates materially different maintenance
  pressure requiring a narrower policy.

## Related Documentation

- [Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md)
- [ADR-0001: Engine Representation And Semantic Ownership](ADR-0001-engine-representation-and-semantic-ownership.md)
- [ADR-0002: Diagnostics And Public Boundaries](ADR-0002-diagnostics-and-public-boundaries.md)
- [ADR-0003: Dual Execution And Conformance Parity](ADR-0003-dual-execution-and-conformance-parity.md)


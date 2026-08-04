# Semantic Boundary Principles

> Cross-cutting rules for keeping Weaver's semantic layers explicit,
> auditable, and hard to accidentally collapse.

This document exists because a large fraction of hard engine bugs are not
"algorithm bugs." They are **boundary bugs**: one layer silently acting as
though it were another, one relation type being treated as though it were
another, or one provenance tier being reported as though it had stronger
support than it actually has.

It complements [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md), [Weaver XPath Design Document](Weaver%20XPath%20Design%20Document.md),
[Weaver Error Design Document](Weaver%20Error%20Design%20Document.md), and [Weaver URI Resolution Specification](Weaver%20URI%20Resolution%20Specification.md).

This document was sharpened by design pressure from the Tonesu language
spec and notes, especially its commitments to semantic compositionality,
reasoning transparency, explicit relation typing, and treating boundary
violations as named events rather than invisible accidents.

## Goals

- Keep semantic layers distinct even when implementation pressure pushes
  toward convenience shortcuts.
- Make support/provenance tiers explicit in diagnostics and analysis.
- Prevent interpreter, codegen, and host integrations from re-deriving
  meaning differently.
- Make boundary crossings visible, reviewable, and testable.

## Non-goals

- Replacing the architecture doc.
- Rewriting W3C semantics in prose.
- Prohibiting all abstraction or code reuse.
- Turning every implementation detail into a named principle.

## What a semantic boundary is

A semantic boundary is any place where Weaver must distinguish between two
things that are easy to conflate in code but not equivalent in meaning.

Examples:

- source text versus AST
- AST versus analyzed overlay
- plain IR versus execution plans
- URI resolution versus resource loading versus result publication
- sequence versus singleton expectation
- general comparison versus value comparison versus node comparison
- observed fact versus inferred fact versus host-supplied fact
- diagnostic prose versus structured diagnostic data
- interpreter semantics versus generated-runtime semantics

If the distinction matters to correctness, it is a real boundary.

## Core stance

Weaver should prefer **explicit boundary objects and explicit relation
types** over clever helpers that infer meaning later.

This is the same design instinct behind several existing decisions:

- plain AST/IR plus overlays rather than mutating nodes into backend bags
- `Sequence` as an owned abstraction rather than incidental JS collection behavior
- `DiagnosticReport` as structured data rather than formatted strings
- URI resolve/load/publish separation rather than one helper doing all I/O

The recurring rule is simple:

> If two things are semantically different, make that difference survive
> the implementation boundary.

## Principle 1 — Layer identities stay distinct

Source, AST, analyzed overlays, IR, runtime plans, emit plans, generated
TS, and diagnostic projections are different artifacts with different jobs.

Rules:

- AST and IR stay plain-data contracts.
- Derived facts live in overlays or plans, not by mutating the contract objects.
- Generated code is a product artifact, not the semantic source of truth.
- Formatted diagnostics are a renderer output, not the canonical error object.

If a boundary object starts carrying fields whose meaning only exists for
one backend or one renderer, the boundary is being weakened.

## Principle 2 — Lower layers do not silently reinterpret enclosing layers

This is the meta-level rule.

The lower-level object should not be able to reach up and redefine the
meaning of the layer that contains it.

Examples:

- an XPath expression should not implicitly reinterpret its containing
  stylesheet context without going through explicit static/dynamic context
- generated code should not invent its own URI resolution semantics
- runtime helpers should not "fix up" compile-time meaning by guesswork
- a formatted error string should not be parsed back into structured meaning

One-way visibility is often correct:

- the enclosing layer can describe, annotate, or report on the inner one
- the inner layer does not get to redefine the contract of the outer one

## Principle 3 — Relation types are first-class, not inferred by vibe

Weaver should not collapse distinct relation types into one generic edge
unless the shared meaning is already proven.

Examples already present in design:

- URI `resolve -> load -> publish`
- XPath comparison families
- runtime frames versus related spans versus causes
- sequence order versus causal/grounding relationships in analysis

Practical rule:

- sequence is not grounding
- correlation is not causation
- containment is not identity
- "same output" is not full semantic parity
- "resolved URI" is not "allowed to load"

Early duplication is preferable to an abstraction that erases semantic
distinctions before the model is stable.

## Principle 4 — Provenance tiers stay explicit

Not every fact in the engine has the same kind of support.

At minimum, Weaver should distinguish between facts that are:

- directly present in user source
- supplied by the host
- derived mechanically by parse or resolution
- inferred by analysis
- validated by tests or conformance fixtures

This does not require a grand taxonomy everywhere. It does require that
diagnostics, analysis results, and boundary contracts avoid presenting an
inference as though it were a source fact.

Examples:

- a suggestion is not the same as a proven fix
- a host canonical URI is not the same as the lexical `href`
- a static-analysis warning is not the same as a parse failure
- a typed extension-function signature is not the same as proof that a
  runtime value already has the required JS shape

## Principle 5 — Preserve lexical form and resolved identity separately

When the engine transforms a thing into a more resolved form, it should
usually preserve both:

- the lexical/user-facing form for diagnostics and auditability
- the resolved/normalized form for execution, caching, and identity

Examples:

- lexical QName versus resolved QName
- lexical URI reference versus resolved/canonical URI
- source expression text versus analyzed expression metadata

If we keep only the resolved form, we lose explainability.
If we keep only the lexical form, we lose stable execution identity.

## Principle 6 — Boundary crossings should be named events

The engine should not treat a boundary crossing as an invisible,
uninteresting implementation detail when it affects meaning.

Examples:

- sequence-of-many used where singleton is required
- host policy denying URI resolution/load
- type coercion from XDM space into JS extension-function inputs
- diagnostic suggestion upgrading from hint to deterministic fix
- moving from belief-level or report-level information to established
  compile-time knowledge

When practical, these crossings should surface as:

- typed APIs
- structured diagnostic details
- explicit helper names
- focused tests

The point is not to make every crossing noisy. The point is to make it
hard for meaning-changing crossings to happen by accident.

## Principle 7 — Visibility beats prohibition

Weaver will not prevent every bad inference or shortcut.
It should make them hard to do invisibly.

That means:

- keep structured diagnostics instead of only prose
- keep parity tests instead of trusting codegen by inspection
- keep source maps instead of asking users to debug generated TS blind
- keep explicit context/focus passing instead of hidden evaluator state
- keep clear host contracts instead of ambient I/O assumptions

The system does not need to ban every mistake. It needs to expose enough
structure that mistakes become reviewable.

## Principle 8 — Stable primitives before surface growth

Do not solve every awkward feature request by adding a new semantic kind,
new escape hatch, or new public API surface prematurely.

Awkwardness is often diagnostic:

- maybe the IR is missing a concept
- maybe the Sequence boundary is too weak
- maybe provenance/support is being collapsed
- maybe a host contract is underspecified

The correct response is usually to strengthen the underlying boundary,
not to spray new ad hoc constructs across the surface.

## Principle 9 — Same meaning across backends or it is a bug

Interpreter, codegen, watch mode, and future editor integrations may use
different execution paths and renderers. They must not invent different
semantic rules.

Parity is required for:

- core evaluation meaning
- base-URI choice where the same source is available
- structured diagnostic identity and relevant details
- host contract usage for URI operations

If one backend arrives at a different meaning by re-deriving semantics in
its own local helpers, that is not implementation freedom. That is drift.

## Weaver applications

These are the concrete places where the principles already bite:

| Surface | Boundary to protect | Existing/desired rule |
|---|---|---|
| XPath AST | syntax vs analyzed meaning | plain AST plus semantic preparation overlays |
| XSLT IR | contract vs execution helpers | plain IR plus `RuntimePlan` / `EmitPlan` |
| Diagnostics | structured meaning vs human text | `DiagnosticReport` is canonical |
| URI handling | resolve vs load vs publish | resolver contract stays split |
| Sequence handling | semantic sequence vs JS container | owned `Sequence` abstraction |
| Comparisons | general vs value vs node | separate families, not one vague compare helper |
| Context | static vs dynamic vs focus | explicit context/focus passing |
| Codegen | reference semantics vs emitted artifact | generated code uses runtime boundary, not private rules |

## Litmus tests

We are on the right track if these stay true:

- a reviewer can point to where a meaning-changing boundary is crossed
- diagnostics can tell whether a fact was lexical, resolved, inferred, or suggested
- codegen calls the same runtime boundary for host-dependent behavior
- AST and IR can still be serialized and inspected without backend junk attached
- relation types stay explicit in tests and APIs

We are drifting if any of these become common:

- one helper both resolves, loads, parses, and normalizes because it is convenient
- backend-specific caches or bindings start living on AST/IR nodes
- formatted text becomes the only durable form of a diagnostic
- a "smart" abstraction erases comparison-family or provenance distinctions
- source-facing identity is lost once something is normalized for execution

## Review questions

When a design change feels plausible but slightly dirty, ask:

1. Which semantic boundary is this crossing?
2. Is the crossing explicit in the API/model, or only implicit in code?
3. Are two relation types being collapsed because they look similar in JS?
4. Have we preserved both the user-facing form and the execution identity?
5. Would interpreter and codegen still agree if they both followed this rule literally?

If those questions are hard to answer, the design probably needs a sharper
boundary before more code is added.

This document should change when we discover a missing cross-cutting
boundary rule, not every time one subsystem gets a new feature.
# Diagnostic Intrinsics — observability hooks for compiled XSLT

> How Weaver should expose traceability, diagnostics, and runtime explanation
> without inventing a second transformation language.

This document exists because the natural pressure to add "just one useful
helper" quickly turns into non-standard transformation semantics, product-local
mini libraries, and long-tail support burden.

Weaver's sharper boundary is narrower: `wx:*` is not a general helper-function
surface. It is a compiler-recognized diagnostics and traceability surface over
standard XSLT/XPath semantics.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md),
[DIFFERENTIATORS.md](./DIFFERENTIATORS.md), [XPATH.md](./XPATH.md),
[ERRORS.md](./ERRORS.md), and [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md).

## What this document covers

This document covers `wx:*` intrinsics embedded in stylesheets and XPath
expressions.

It does **not** redefine the later product story for typed host-provided
extension bindings such as `app:formatCurrency(...)` described in
[ARCHITECTURE.md](./ARCHITECTURE.md). Those are integration features. This
document is about compiler-recognized observability hooks inside Weaver's own
surface.

## Goals

- Make Weaver's non-standard surface explicit and narrowly scoped.
- Lean into traceability as a product differentiator instead of general helper
  functions.
- Expose diagnostics, assertions, and runtime explanation without adding new
  transformation semantics.
- Keep source-to-generated-TypeScript-to-runtime traceability explicit.

## Non-goals

- Extending the `fn:` namespace.
- Building a convenience standard library for ordinary transformation work.
- Creating alternate transformation semantics that standard XSLT/XPath cannot
  express.
- Hiding resource access or host policy behind function-like syntax.
- Making provenance claims the runtime cannot actually support.

## Namespace rule

Diagnostic intrinsics must live in a clearly non-spec namespace.

Suggested namespace:

```xml
xmlns:wx="urn:weaver"
```

Do not put diagnostic intrinsics in `fn:`.

## Product boundary

The rule is simple:

1. Intrinsics may observe or report.
2. Intrinsics may assert and fail with structured diagnostics.
3. Intrinsics must not become alternate transformation semantics.

That means `wx:*` is allowed to expose visibility into standard evaluation, not
to provide Weaver-flavored replacements for normal XPath/XSLT operations.

Good direction:

- `wx:trace($label, $value)`
- `wx:type-of($value)`
- `wx:path($node)`
- `wx:warn($message, $details?)`
- `wx:fail($code, $message, $details?)`
- `wx:expect-one($seq, $message)`

Bad direction:

- `wx:first-or()`
- `wx:class-list()`
- `wx:group-by()`
- `wx:index-by()`
- domain-pack helpers such as `s1:filter-applic()` in core

Those may be useful, but they create Weaver-specific transformation surface.
That is a different product decision and not the one this document endorses.

## Why this boundary fits Weaver

Weaver's core pitch is not "XSLT plus helper functions." It is:

- standard XSLT/XPath semantics
- compiled to readable TypeScript
- with first-class diagnostics and traceability across source, generated code,
  and runtime

That is sharper, easier to explain, and less likely to metastasize into a side
language.

## Traceability layer

Diagnostic intrinsics only make sense if they are backed by a real traceability
layer in the compiler and runtime.

At minimum, Weaver should aim to preserve these links:

- stylesheet instruction or XPath subexpression
- generated TypeScript region or helper site
- runtime diagnostic frame or evaluation context

This layer should make it possible to explain not only that something failed,
but where it came from in source and how it reached the current runtime point.

## Allowed intrinsic categories

### 1. Observation intrinsics

These expose information about the current value or node without changing the
meaning of the transformation.

Candidates:

- `wx:trace($label, $value)`
- `wx:type-of($value)`
- `wx:path($node)`
- `wx:explain($value)`

These should be backed by actual runtime knowledge, not guessed prose.

### 2. Assertion intrinsics

These validate expectations and raise structured diagnostics when violated.

Candidates:

- `wx:expect-one($seq, $message)`
- `wx:expect-non-empty($seq, $message)`
- `wx:expect-type($value, $type, $message)`

These are acceptable because they do not add new transformation capability;
they turn implicit assumptions into explicit, diagnosable checks.

### 3. Reporting intrinsics

These emit warnings, notes, or failures with structured detail payloads.

Candidates:

- `wx:warn($message, $details?)`
- `wx:warn-at($node, $message, $details?)`
- `wx:fail($code, $message, $details?)`

These should integrate directly with the structured diagnostic model in
[ERRORS.md](./ERRORS.md), not invent text-only side channels.

## Disallowed categories

The following are out of scope for `wx:*` diagnostic intrinsics:

- convenience/data-shaping helpers such as `wx:first-or()` or
  `wx:class-list()`
- collection and grouping helpers
- map/array helper libraries
- graph helper libraries
- domain-specific packs in the core namespace
- hidden I/O or host-policy shortcuts

These are exactly the kinds of additions that create a Weaver-flavored side
language instead of a traceability surface.

## Provenance rule

No provenance claim without runtime metadata backing it.

This is a hard rule.

Examples:

- `wx:path($node)` is acceptable if the runtime can identify the node path.
- `wx:type-of($value)` is acceptable if the runtime can describe the actual
  item or sequence shape.
- `wx:origin($value)` is acceptable only if the runtime truly tracks origin.
- `wx:derived-from($value)` is forbidden until Weaver can prove that relation
  with real metadata rather than inference or wishful thinking.

We should not do epistemic fraud in the name of better debugging.

## Compilation model

Diagnostic intrinsics should be compiler-recognized.

That means:

- syntax may still look like XPath function calls
- the compiler gives them explicit treatment
- generated TypeScript routes them through well-defined runtime hooks
- diagnostics emitted by those hooks preserve source and runtime context

They should not be treated as arbitrary library calls with fuzzy semantics.

## Testing guidance

Every diagnostic intrinsic that lands should have:

- focused behavioral tests
- tests for structured diagnostic details when failure/reporting is involved
- source-location and frame tests where traceability is part of the contract
- documentation that states what runtime metadata the intrinsic depends on

## Working rule

Weaver intrinsics should expose abnormal visibility over normal semantics. If a
proposed intrinsic starts acting like a convenience library or alternate
transformation language, it belongs outside this surface.
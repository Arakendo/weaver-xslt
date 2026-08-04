# Test Sources — conformance, parity, and external suites

> Which upstream test sources Weaver should use, what each source is good for,
> and when an external suite belongs in the repo.

This document exists because "more tests" is not automatically better. A new
suite is only useful if it sharpens semantic confidence, exposes a real blind
spot, or gives coverage the current stack cannot provide without drowning the
project in unactionable failures.

It complements [Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md), [Weaver Roadmap](../Plans/Weaver%20Roadmap.md),
[Weaver Entity Resolution Specification](../Specifications/Weaver%20Entity%20Resolution%20Specification.md), and
[Comparison Harness](Comparison%20Harness.md).

## Goals

- Name the primary upstream suites Weaver relies on.
- Distinguish core conformance sources from later candidate suites.
- Define when a new external suite should be adopted.
- Keep roadmap scope intact so test imports do not silently pull later feature
  tiers forward.

## Non-goals

- Listing every XML/XSLT-adjacent project on the internet.
- Treating implementation-specific regressions as spec authority.
- Adding suites just because they exist.
- Promoting future schema or HTML-compat test sources into current scope before
  the product surface exists.

## Source classes

Weaver should think about test sources in three classes:

1. **Core conformance**: normative or near-normative suites that measure the
   main language surface.
2. **Reference implementation suites**: implementation-owned tests that are
   useful for messy real-world behavior but not themselves the spec.
3. **Compatibility or boundary suites**: targeted sources for parser, entity,
   schema, or HTML-related behavior that only matter when Weaver exposes the
   corresponding feature boundary.

## Core conformance sources

These are the primary always-on upstream sources.

### QT3

- Source: https://github.com/w3c/qt3tests
- Role: primary XPath/XQuery semantics suite
- Best for: expressions, sequences, comparisons, functions, focus behavior,
  atomization, and error-code expectations
- Status in Weaver: core conformance source now

### W3C XSLT 3.0 test suite

- Source: https://github.com/w3c/xslt30-test
- Role: primary XSLT conformance suite
- Best for: templates, modes, serialization-adjacent behavior, stylesheet
  execution, environments, and output expectations
- Status in Weaver: core conformance source now

These two suites are the backbone. They should remain the primary published
conformance denominator unless a future doc explicitly broadens that contract.

## Secondary candidate sources

These are real upstreams worth considering, but they are not automatic imports.

### libxslt test suite

- Source: https://gitlab.gnome.org/GNOME/libxslt
- Expected location: `tests/` in the libxslt repo
- Role: reference implementation suite
- Best for: messy XSLT 1.0 behavior, parser-adjacent XML cases, entity and
  serialization quirks, and real-world interoperability pressure
- Caveat: implementation tests are useful evidence, not normative authority

Adopt targeted slices of libxslt tests when Weaver hits a real blind spot in
messy input handling or XSLT behavior that QT3 and the W3C XSLT suite do not
cover well.

### W3C xsdtests

- Source: https://github.com/w3c/xsdtests
- Role: XML Schema conformance suite
- Best for: schema-aware or schema-validation boundaries
- Caveat: not relevant to current non-schema-aware milestones

This source should remain deferred until a roadmap increment explicitly brings
schema-aware behavior or schema validation into scope.

### html5lib-tests

- Source: https://github.com/html5lib/html5lib-tests
- Role: HTML parsing compatibility suite
- Best for: HTML-ish parsing, named-entity compatibility behavior, and error
  recovery expectations in HTML-oriented modes
- Caveat: high-value only if Weaver intentionally exposes HTML-like input modes

This source should not be treated as an XML conformance suite. It is only
relevant if Weaver deliberately adds HTML-compat or fragment-compat behavior.

## Limited-use sources

These are useful references, but they do not provide the same kind of clean,
centralized upstream suite as the sources above.

### EXSLT material

- Source: https://github.com/exslt/exslt.github.io
- Role: scattered module examples and tests for EXSLT-related behavior
- Caveat: not a single authoritative conformance corpus

Use this only if Weaver deliberately adopts EXSLT-related surface.

### EXPath material

- Source: https://github.com/expath/expath-cg
- Role: spec and community-group material for EXPath modules
- Caveat: no centralized conformance suite suitable for drop-in adoption

Treat EXPath as specification/reference material, not as a ready-made test
source.

### XSpec

- Source: https://github.com/expath/xspec
- Role: XSLT testing framework rather than conformance suite
- Caveat: useful as tooling inspiration, not as normative language coverage

## Adoption policy

Do not add a new suite unless all of the following are true:

1. It covers a real blind spot in the current test stack.
2. The feature surface it exercises is actually in roadmap scope.
3. Failures from the suite can be classified without speculative archaeology.
4. The suite has a stable upstream source worth naming in repo docs.

If a suite fails criterion 3, it is not ready to vendor.

## Recommended staged strategy

### Phase 1 — current core

- QT3
- W3C XSLT 3.0 suite

This is the current semantic and transformation baseline.

### Phase 2 — targeted real-world pressure

- targeted libxslt slices when messy XML/XSLT behavior exposes a blind spot
- parser/entity-focused cases promoted from local regressions as needed

This is where "what happens when reality is messy" becomes worth importing.

### Phase 3 — feature-boundary expansion

- W3C xsdtests only when schema-aware behavior exists
- html5lib-tests only when HTML-compat or fragment compatibility exists

These suites should follow the product surface, not lead it.

## Relationship to local tests

Not every regression should become a vendored upstream case.

Prefer local tests when:

- the behavior is tightly tied to Weaver-specific diagnostics or traceability
- a bug is smaller than the cost of integrating another upstream slice
- a feature is still too local or immature for broad conformance pressure

Use upstream suites when the goal is language credibility or external
interoperability pressure.

## Working rule

QT3 asks whether Weaver follows the XPath rules. The W3C XSLT suite asks
whether Weaver behaves like a real XSLT processor. Everything else is pressure
from the cursed edges of reality. Import those edges only when they expose a
real blind spot.
# Comparison Harness — targeted engine parity against external processors

> A development harness for comparing Weaver behavior against external XPath and
> XSLT engines without treating any single engine as an oracle.

This document defines a .NET-based comparison harness intended to run the same
case through Weaver and at least one external processor such as SaxonCS. The
purpose is targeted drift detection and disagreement triage, not replacing the
W3C conformance suites or outsourcing semantic authority to another engine.

It complements [Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md),
[Weaver Product Thesis](../Specifications/Weaver%20Product%20Thesis.md), [Weaver Error Design Document](../Specifications/Weaver%20Error%20Design%20Document.md), and
[NuGet Integration](../Plans/NuGet%20Integration.md).

## Goals

- Run the same XPath or XSLT case through Weaver and one or more external
  engines.
- Capture comparable outputs, diagnostics, error codes, and failure modes.
- Classify differences instead of blindly treating them as Weaver bugs.
- Preserve enough static and dynamic context to compare real behaviors rather
  than toy happy-path inputs.
- Produce durable reports that make drift review faster.

## Non-goals

- Treating SaxonCS or any other engine as unquestionable authority.
- Replacing QT3 or the W3C XSLT suite as the primary conformance denominator.
- Reimplementing XPath or XSLT semantics inside the harness.
- Hiding semantic differences through aggressive normalization.
- Supporting every external engine in the first version.

## Role in the project

The comparison harness is a development tool.

Primary truth sources remain:

- W3C specifications
- QT3 and XSLT conformance suites
- focused local regression tests

The harness is most valuable when:

- a targeted local case is easier to express than finding the right W3C case
- Weaver and QT3 disagree in a way that needs a third viewpoint
- a suspected regression needs quick cross-engine triage
- output or diagnostics differ and the disagreement needs classification

## Initial engine set

### Weaver

The engine under development.

Weaver results should capture at least:

- success or failure status
- principal output
- normalized output when appropriate
- structured diagnostics when available
- primary error code
- message
- source or runtime context when available

### SaxonCS

Primary external comparison engine for the first version.

SaxonCS is valuable because it is mature, broad in feature coverage, and useful
for targeted disagreement review. It is evidence, not authority.

## Future engines

Possible later additions:

- .NET `XslCompiledTransform` for XSLT 1.0-oriented cases
- Java Saxon via process or bridge layer
- other open-source or commercial processors

Additional engines should plug into one result model. Engine-specific special
cases belong in adapters, not in the comparison core.

## Harness boundary

The harness should separate:

- case loading
- engine adapters/runners
- result normalization
- difference classification
- reporting

One viable layout is:

```txt
compare/
  Weaver.CompareHarness/
    Weaver.CompareHarness.csproj
    Program.cs
    Engines/
      IEngineRunner.cs
      WeaverRunner.cs
      SaxonCsRunner.cs
    Cases/
      ComparisonCase.cs
      CaseLoader.cs
    Results/
      EngineResult.cs
      ComparisonResult.cs
      DifferenceClassifier.cs
    Normalization/
      XmlNormalizer.cs
      TextNormalizer.cs
    Reports/
      MarkdownReportWriter.cs

  cases/
    xpath/
    xslt/
```

## Case model

The harness needs a richer case shape than just expression plus input file.
Real engine differences often come from static context, base URI, parameters,
or invocation mode.

One viable shape is:

```json
{
  "name": "focus-position-basic",
  "kind": "xpath",
  "expression": "(1, 2, 3)[position() = 2]",
  "sourceXml": "<root/>",
  "baseUri": "memory:/cases/focus-position-basic.xml",
  "namespaces": {
    "fn": "http://www.w3.org/2005/xpath-functions"
  },
  "variables": {},
  "contextItemSelector": "/",
  "tags": ["focus", "predicate"]
}
```

For XSLT cases:

```json
{
  "name": "invoice-simple",
  "kind": "xslt",
  "stylesheetPath": "cases/xslt/invoice-simple/main.xsl",
  "inputPath": "cases/xslt/invoice-simple/input.xml",
  "baseUri": "memory:/cases/xslt/invoice-simple/main.xsl",
  "parameters": {
    "currency": "USD"
  },
  "initialMode": null,
  "initialTemplate": null,
  "serialization": {
    "method": "xml",
    "omitXmlDeclaration": false
  },
  "tags": ["value-of", "apply-templates"]
}
```

Minimum fields the case system should be able to represent:

- name and tags
- case kind (`xpath` or `xslt`)
- source/input text or file references
- base URI
- namespaces and variables for XPath cases
- parameters, initial mode, and initial template for XSLT cases
- serialization expectations when output comparison matters

## Result model

Each engine should produce one shared result shape:

```csharp
public sealed record EngineResult(
    string EngineName,
    EngineStatus Status,
    string? Output,
    string? NormalizedOutput,
    string? ErrorCode,
    string? Message,
    IReadOnlyList<DiagnosticRecord> Diagnostics
);

public enum EngineStatus
{
    Success,
    Error,
    Unsupported,
    Timeout
}
```

If Weaver exposes structured diagnostics, the harness should preserve them
instead of collapsing them to formatted strings immediately.

## Normalization policy

Normalization must stay conservative.

Allowed examples:

- line ending differences
- XML declaration differences when the case does not care
- whitespace normalization only when the case explicitly opts into it
- attribute ordering only for infoset-style XML comparison where ordering is
  semantically irrelevant

Do not normalize away:

- semantic text differences
- node presence/absence
- runtime failure kind or error-code differences
- serializer-specific expectations in cases that are explicitly testing output

## Difference classification

A mismatch does not automatically mean Weaver is wrong.

Useful initial classifications:

```txt
MATCH
WEAVER_BUG
EXTERNAL_ENGINE_DIFFERS
SPEC_REVIEW_REQUIRED
INTENTIONAL_WEAVER_BEHAVIOR
UNSUPPORTED_BY_ENGINE
NORMALIZATION_ISSUE
HARNESS_ISSUE
```

## Review policy

When engines differ:

1. Check whether the case itself is valid.
2. Check whether the difference is only serialization or formatting.
3. Review the relevant specification section.
4. Compare against existing conformance fixtures when available.
5. Classify the disagreement and record the reason.

The harness should reduce investigation time, not claim epistemic authority it
does not have.

## Weaver runner boundary

The Weaver runner should go through a stable boundary such as:

- a local CLI or test entrypoint
- a JSON diagnostics/output contract
- a process wrapper around the Node-based engine

The harness should not force the core engine to become a .NET library.
Cross-runtime comparison is a tooling concern, not a core-architecture change.

## SaxonCS runner boundary

The SaxonCS runner may run in-process inside the .NET harness. Any SaxonCS
quirks, invocation flags, or setup logic should stay local to that adapter.

## Initial case areas

Start with adversarial cases likely to expose semantic drift:

- focus and predicates
- empty-sequence behavior
- quantified expressions
- comparison families
- function behavior with mixed cardinalities or atomization pressure
- small XSLT cases around template dispatch, `value-of`, and
  `apply-templates`

## Reports

The first version should emit a Markdown summary with:

- overall case counts by classification
- per-case engine results
- top disagreement categories
- links or paths back to the original case material

## Exit criteria for version one

- a .NET 8 command-line harness exists
- at least one Weaver runner and one SaxonCS runner exist
- XPath and XSLT cases can be loaded from disk
- the shared result model is used by both engines
- differences are classified rather than dumped as raw mismatches
- a Markdown report is generated
- a small adversarial starter suite runs end to end

## Working rule

Use the harness to sharpen understanding, not to outsource judgment. QT3 and
the W3C XSLT suite measure coverage; the comparison harness helps explain the
interesting disagreements.

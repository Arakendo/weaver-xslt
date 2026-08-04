# ADR-0001: Engine Representation And Semantic Ownership

- Status: Accepted
- Date: 2026-08-03
- Source decisions: DEC-001 through DEC-006, DEC-008, and DEC-009

## Context

Weaver needs XML parsing, XDM identity, XPath evaluation, reusable intermediate
representations, sequence semantics, regular-expression translation, and
collation behavior without delegating XSLT meaning to an external engine.

## Decision

- Use `@xmldom/xmldom` at the XML parsing boundary.
- Wrap DOM nodes in stable XDM adapters rather than copying trees.
- Own the XPath engine in-tree.
- Use recursive descent with Pratt parsing for expressions.
- Use versioned, source-located, JSON-serializable IR as the contract between
  compiler, interpreter, native execution, emission, and tooling.
- Own lazy sequence semantics.
- Translate XML Schema regular expressions explicitly.
- Use Unicode codepoint collation as the initial supported baseline.

## Consequences

The parser is replaceable infrastructure, but Weaver owns semantic identity and
execution. Backend-specific workarounds must not bypass the shared IR or XDM
contracts. Additional collations require explicit capability and conformance
work rather than accidental host behavior.

## Detailed Specification

See the corresponding DEC sections in the
[Weaver Software Design Document](../Specifications/Weaver%20Software%20Design%20Document.md).


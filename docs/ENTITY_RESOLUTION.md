# Entity Resolution — parse-boundary policy for named entities

> How Weaver handles named entity references before XML or XSLT parsing.

This document exists because named entities are a real integration boundary,
not an evaluator feature. Legacy XML, SGML-derived content, S1000D sources, and
HTML-ish inputs often contain names like `&nbsp;`, `&mdash;`, or ISO 8879
entities that are not predefined by XML. If Weaver decides to support those
inputs, that decision must be explicit, host-controlled, and diagnosable.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md),
[SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md),
[ERRORS.md](./ERRORS.md), [URI_RESOLUTION.md](./URI_RESOLUTION.md), and
[SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md).

## Goals

- Keep strict XML behavior available by default.
- Treat named-entity handling as a parse/input concern, not XPath or XSLT
  runtime semantics.
- Support host-provided compatibility maps for legacy inputs without granting
  the engine ambient filesystem or network access.
- Produce structured diagnostics for undefined, disallowed, or invalid entity
  replacements.
- Preserve enough source mapping to point diagnostics back at the original
  entity reference span.

## Non-goals

- Turning Weaver into a general SGML or HTML parser.
- Silently accepting undeclared XML entities by default.
- Preserving the original entity spelling in the XDM tree or result tree.
- Implementing full DTD validation in the first version.
- Allowing core engine logic to fetch entity sets from disk or network on its
  own.

## Core rule

Entity handling is a parse-boundary concern.

```txt
source text
  -> entity policy / host-provided entity map
  -> XML parser
  -> XDM adapter
  -> XPath / XSLT evaluation
```

Once parsing succeeds, ordinary entity references have already been expanded by
the parser or pre-parse normalization step. XPath and XSLT should see
characters and nodes, not unresolved named entities.

Corollary: undefined named entities are not XPath errors. They are input or
parse failures.

## Input classes

Weaver should distinguish between at least two input classes:

- **XML documents / stylesheets**: strict XML parsing rules apply. Unknown
  named entities are errors unless a declared or explicitly configured
  compatibility mapping provides a replacement before parse.
- **Future fragment or compatibility modes**: if the host later chooses to
  support HTML-ish or non-XML fragments, relaxed preservation or replacement
  policy may exist there. That is a separate input mode, not a weakening of XML
  document parsing.

This distinction matters because an option like "preserve unknown entity" is
not meaningful for ordinary XML document parsing. Preserving `&nbsp;` in an XML
document still leaves invalid XML.

## Policy model

One viable contract shape is:

```ts
export type EntityPolicy =
  | 'xml-only'
  | 'declared-only'
  | 'custom-map'
  | 'html-compat'
  | 'iso8879-compat';

export interface EntityResolutionOptions {
  policy: EntityPolicy;
  customEntities?: ReadonlyMap<string, string>;
  resolver?: EntityResolver;
  maxReplacementLength?: number;
  maxExpansionsPerDocument?: number;
}
```

Suggested meanings:

- `xml-only`: only the five XML predefined entities are valid.
- `declared-only`: allow XML predefined entities plus declarations supplied by
  the document or host-controlled declaration source.
- `custom-map`: allow only host-provided mappings.
- `html-compat`: opt-in compatibility set for common HTML named entities.
- `iso8879-compat`: opt-in compatibility set for ISO 8879 / technical
  documentation entities.

The default for both source XML and stylesheet XML should remain `xml-only`
until the host explicitly asks for more.

## Separate policy for source XML and stylesheet XML

Weaver should allow the host to configure source-document and stylesheet
policies separately. In particular, loosening stylesheet parsing is a higher
risk move than loosening source-document parsing, because it changes how engine
code itself is ingested.

Recommended default:

- stylesheet XML: `xml-only`
- source XML: `xml-only`

If a host needs compatibility behavior, it should opt into it deliberately for
the relevant input class.

## Resolver boundary

Entity lookup should follow the same host-boundary discipline as URI
resolution. The engine may ask for a replacement; the host decides whether that
entity is allowed and what replacement text to provide.

```ts
export interface EntityRequest {
  name: string;
  sourceUri?: string;
  offset: number;
  line: number;
  column: number;
}

export interface EntityResolver {
  resolveEntity(request: EntityRequest): string | undefined | Promise<string | undefined>;
}
```

Rules:

- Core engine logic does not perform ambient filesystem or network lookup for
  entity sets.
- Resolver failures become structured diagnostics.
- Replacement text is host policy, not XPath/XSLT semantics.

## Replacement rules

Replacement happens before XML parsing and must preserve XML well-formedness.

Rules:

- Replacement text must be valid for the XML location where the entity appears.
- Replacement text should usually be a Unicode character or escaped character
  data, not arbitrary markup.
- Replacement text must not recursively expand into unbounded content.
- The normalization layer should preserve enough offset mapping to attribute
  diagnostics back to the original entity reference span.

Examples:

```txt
&nbsp;  -> U+00A0
&mdash; -> U+2014
&commat; -> @
```

## Diagnostics

Undefined or disallowed entities should produce structured diagnostics when
possible rather than opaque parser explosions.

Example message:

```txt
WEAVER_XML_ENTITY_UNDEFINED: unknown entity `nbsp`

  at manual.xml:42:18
       <para>Torque&nbsp;limit</para>
                    ^^^^^^

hint: declare `nbsp`, replace it with `&#160;`, or enable an entity policy that includes it.
```

Suggested local codes:

```txt
WEAVER_XML_ENTITY_UNDEFINED
WEAVER_XML_ENTITY_DISALLOWED
WEAVER_XML_ENTITY_INVALID_REPLACEMENT
WEAVER_XML_ENTITY_RESOLVER_FAILED
```

Suggested diagnostic details:

```ts
[
  { key: 'entityName', value: 'nbsp' },
  { key: 'entityPolicy', value: 'xml-only' },
  { key: 'sourceUri', value: 'manual.xml' },
]
```

If a W3C parser or XML code is available later, it may be included in details,
but the stable Weaver-local boundary code is acceptable because this is host and
parse-boundary behavior.

## Source mapping

Entity expansion changes buffer length, so the normalization layer should keep
an offset map when practical:

```txt
original source offset -> normalized source offset
```

Minimum expectation:

- diagnostics for unknown or disallowed entities point at the original entity
  reference span
- later parser or source-map consumers can recover the original input location
  when expansion changed lengths

Node spans may be approximate in the very first version, but entity-reference
diagnostics should not be.

## Security limits

Compatibility behavior must not recreate classic entity-expansion hazards.

Rules:

- no external entity loading unless the host explicitly provides it
- no recursive custom-entity expansion in the first version
- limit replacement size
- cap total expansions per document
- keep strict XML as the default

Reasonable initial limits:

```ts
maxReplacementLength: 4096
maxExpansionsPerDocument: 100_000
```

## Rollout

### Phase 1 — strict diagnostics

- keep `xml-only` as the default
- detect likely undefined named entities before or during parse
- emit structured diagnostics with source spans

### Phase 2 — custom map support

- allow host-provided entity maps
- expand configured entities before parse
- add focused tests for diagnostics and replacement validity

### Phase 3 — built-in compatibility sets

- add opt-in `html-compat`
- add opt-in `iso8879-compat`
- keep these sets isolated from strict XML defaults

### Phase 4 — offset-map fidelity

- preserve original-to-expanded offset mapping
- use it in parser diagnostics and source maps

## Testing guidance

Add focused coverage for:

- XML predefined entities under strict mode
- unknown named entities under `xml-only`
- host-provided entities under `custom-map`
- opt-in HTML entity expansion under `html-compat`
- opt-in ISO entity expansion under `iso8879-compat`
- invalid replacement text
- structured diagnostic details and original-source spans

## Working rule

Keep entity handling before parse, explicit, opt-in, and diagnostic-rich. Do
not let it become "the parser accepts whatever legacy sludge showed up today."
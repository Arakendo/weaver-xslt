# WeaverPDF Syntax Profile

This note defines how WeaverPDF adopts the existing EzPDF Markdown/YAML
authoring model without copying the full EzPDF syntax literally.

The point of this document is to answer one question clearly:

```txt
What does WeaverPDF keep, normalize, defer, or ban from the EzPDF reference?
```

## Status

This is a profile note, not a full end-user syntax specification.

It exists to keep the initial TypeScript implementation narrow and coherent
while still using the EzPDF reference as the language seed.

## Guiding rule

WeaverPDF adopts the EzPDF authoring model as a source language family.

It does not adopt the entire EzPDF syntax surface as an immediate
implementation contract.

That means:

- keep the good authoring ergonomics
- normalize confusing or internally inconsistent syntax
- defer features that require later layout or multi-pass machinery
- ban forms that create ambiguity or implementation debt

## Adopted

These parts of the EzPDF reference are good fits for WeaverPDF and should be
treated as the intended language foundation.

### Core authoring model

- Markdown-first authoring
- YAML as the configuration/defaults surface
- directives as the advanced-feature escape hatch
- a split between portable/common content and more powerful non-portable
  features

### v1-aligned syntax surface

The first WeaverPDF implementation should directly adopt:

- standard headings
- paragraphs
- emphasis and strong
- strikethrough
- inline code
- fenced code blocks
- blockquotes
- ordered and unordered lists
- links
- local-path images
- thematic breaks
- GFM tables

### Later-but-intended language families

These still fit WeaverPDF conceptually even if not in v1:

- frontmatter-driven document defaults
- simple structural directives such as page and section breaks
- inline styled spans
- admonitions
- anchors and cross-references
- advanced page-composition directives

## Normalized

These areas are adopted in spirit but should be cleaned up for WeaverPDF.

### 1. Directive opening syntax

Keep the simple distinction:

- `::directive-name`
- `::directive[simple-param]`
- `::directive{key=value; ...}`

But normalize the rule to avoid ambiguity:

- no hybrid openings like `::columns[2]{gap=20pt}`
- if a directive needs more than one value, it moves to brace form entirely

Preferred WeaverPDF rule:

```txt
simple single parameter → []
anything more complex   → {}
never both on one opening
```

### 2. Placeholder language

WeaverPDF should keep one placeholder model only.

Normalize on:

- `{{path}}`
- `{{path | filter}}`
- `{{page.current}}`
- `{{ref.anchor.page}}`

Do not preserve mixed legacy placeholder forms in headers, footers, or other
sub-languages.

### 3. Metadata attachment

WeaverPDF should not rely on fuzzy proximity rules like "near the next table".

Normalize metadata directives to a deterministic rule:

- metadata attaches only to the immediately following non-blank block

### 4. Table tiering

Keep the two-tier model, but normalize it more strictly:

- plain GFM tables stay plain
- advanced table behavior belongs to directive tables

Avoid a middle zone where plain Markdown tables silently gain too many advanced
layout semantics.

### 5. Naming conventions

Keep and enforce:

- kebab-case directive names
- kebab-case attribute names
- `-end` suffix for closing container directives

Do not carry forward mixed naming styles for compatibility.

## Deferred

These parts of the EzPDF reference make sense for WeaverPDF, but should wait
until the v1 AST/IR and basic layout engine are proven.

### Syntax and authoring features

- frontmatter semantics beyond metadata capture
- inline styled spans like `{text|color=...}`
- symbols and icon shortcuts
- admonitions
- variables, loops, and filters
- anchors, dynamic placeholders, and cross-references
- TOC generation

### Advanced table features

- directive-table YAML mode
- colspan and rowspan semantics
- advanced column sizing control
- table-local RTL behavior
- multi-row header and footer behavior

### Page-composition features

- page numbering modes
- blank pages
- parity control
- foldouts
- multi-column layout
- advanced headers/footers
- watermarks beyond a later explicit design slice

### FO-adjacent behavior

- anything that pushes WeaverPDF toward being a disguised FO surface
- standards-compatibility concerns that belong in WeaverFO instead

## Banned

These forms should not be carried into WeaverPDF.

### 1. Hybrid directive openings

Disallow:

```markdown
::columns[2]{gap=20pt}
```

Use one canonical form instead.

### 2. Deprecated table metadata syntax

Do not adopt the old `{|...}` table metadata form.

Use explicit directive syntax instead.

### 3. Ambiguous metadata heuristics

Do not adopt rules that depend on loose proximity, fuzzy block counting, or
 parser guesswork to decide what a directive modifies.

### 4. Duplicate placeholder dialects

Do not support one placeholder language in body content and a different one in
headers, footers, or configuration strings.

### 5. Compatibility shims for inconsistent legacy naming

Do not preserve alternate attribute spellings, mixed camelCase/kebab-case, or
multiple syntactic aliases just because they existed in the reference project.

## Implementation profile by phase

### WeaverPDF v1

Adopt:

- Markdown core
- optional frontmatter capture

Normalize:

- parser output into owned AST/IR boundaries

Defer:

- directives
- templating
- advanced tables
- page composition

Ban:

- ambiguous syntax carryovers from the old spec

### Later WeaverPDF phases

Add back in this rough order:

1. frontmatter semantics and minimal document config
2. minimal structural directives
3. inline styled spans and admonitions
4. anchors, references, and TOC
5. advanced/directive tables
6. page-composition features

## Decision summary

WeaverPDF should absolutely adopt the EzPDF Markdown/YAML model as its language
seed.

But it should do so through a TypeScript-native profile:

- adopt the core shape
- normalize the messy parts
- defer the expensive parts
- ban the ambiguous parts

That gives WeaverPDF continuity with the proven EzPDF authoring experience
without inheriting every sharp edge of the old syntax surface.
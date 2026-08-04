# WeaverPDF Architecture

This note defines the intended internal architecture for WeaverPDF.

The core rule is simple:

- Markdown syntax is an input language.
- PDF bytes are an output artifact.
- the product-critical contract lives in the middle.

That middle contract is the owned document AST and layout IR.

## Pipeline

The intended WeaverPDF pipeline is:

```txt
Markdown frontend
  → normalized document AST
  → layout IR
  → pagination/layout engine
  → PDF backend
```

Later, WeaverFO should target the same middle layers:

```txt
WeaverPDF Markdown frontend ┐
                           ├→ document AST → layout IR → layout engine → PDF
WeaverFO frontend          ┘
```

## Design goals

- Keep parser-library ASTs out of the engine contract.
- Preserve enough source provenance for diagnostics and later traceability.
- Separate semantic normalization from page-layout decisions.
- Let future frontends target the same layout system.
- Avoid backend-specific layout hacks by making layout data explicit in the IR.

## Document AST

The document AST is the normalized semantic model produced after parsing the
input syntax.

It should answer questions like:

- what the document contains
- how blocks and inlines nest
- which source span produced a node
- which author-facing options were requested

It should not answer questions like:

- which page a node lands on
- what x/y coordinates it receives
- how line breaks were chosen
- which drawing operations render it

### v1 node families

The v1 node model should stay intentionally small.

Block families:

- document
- heading
- paragraph
- blockquote
- list
- list-item
- code-block
- thematic-break
- image-block
- table
- table-row
- table-cell

Inline families:

- text
- emphasis
- strong
- delete
- inline-code
- link
- image-inline
- line-break

### AST invariants

- every node has a stable `kind`
- every node may carry source provenance
- child ordering is preserved from source order
- authoring syntax details are normalized away once they stop mattering to
  semantics
- third-party parser nodes do not escape into later layers

## Layout IR

The layout IR is the boundary between document semantics and page layout.

It should answer questions like:

- what boxes need to be laid out
- what text runs need measurement
- what images and tables require sizing
- what break opportunities exist
- what page constraints apply

It should not be tied to one input syntax.

### v1 layout responsibilities

- block stacking in one main content flow
- inline text runs inside measured lines
- block spacing and indentation
- list marker placement
- code block boxing
- image sizing constraints
- table column measurement and row layout
- automatic page breaks from overflow

### v1 layout non-goals

- multi-column region flow
- keeps/widows/orphans policy
- float layout
- foldouts
- advanced running headers/footers
- parity-controlled blank-page insertion

## Source provenance

WeaverPDF should preserve source provenance early even if v1 does not yet expose
full visual tracing.

At minimum, both the document AST and layout IR should be able to associate
items with a stable source location shape.

That enables:

- diagnostics on unsupported constructs
- missing-resource errors for images and includes
- later mapping from laid-out boxes back to Markdown/directive source
- future cross-lane traceability if WeaverFO is added later

## Parser dependency policy

WeaverPDF should use a mature Markdown parser, but only as the frontend parser.

That means:

- parser AST in
- normalized WeaverPDF AST out

No renderer or layout phase should depend directly on third-party parser node
types.

## PDF backend role

The PDF backend should be the final drawing/output surface, not the place where
layout policy lives.

Its responsibilities are:

- page creation
- font and image resource registration
- drawing text, lines, fills, borders, and images
- writing final PDF bytes or buffers

Its non-responsibilities are:

- deciding page breaks
- deciding line breaks
- measuring table structure semantics
- interpreting Markdown syntax

## v1 layering rule

If a feature request can only be expressed as:

```txt
special-case this Markdown construct directly in the PDF writer
```

the design is wrong.

The fix should usually be one of:

- normalize the construct properly in the document AST
- make the needed layout fact explicit in the layout IR
- add a focused renderer capability to consume an existing IR fact

## Suggested module shape

The initial source layout can stay minimal:

```txt
src/pdf/
  ast.ts
  layout.ts
  index.ts
```

Likely later expansion:

```txt
src/pdf/
  ast.ts
  layout.ts
  normalize.ts
  measure.ts
  paginate.ts
  render.ts
  diagnostics.ts
  resources.ts
```

## Decision summary

WeaverPDF should own two internal contracts:

- a normalized document AST
- a layout IR

Those contracts are the foundation that lets Markdown-first authoring start
small now and lets WeaverFO target the same renderer later.
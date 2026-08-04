# WeaverPDF

This note defines the naming and architectural boundary for Weaver's future PDF
work.

The short version:

- `WeaverPDF` is the Markdown-first authoring and rendering lane.
- `WeaverFO` is the future XSL-FO-compatible lane.
- Both should target the same engine-owned document and layout layers rather
  than growing into separate renderers.

## Naming

Use these names consistently:

- `WeaverPDF`
  - the product lane for author-friendly PDF authoring
  - the Markdown-first syntax surface
  - the PDF-oriented document and layout pipeline
- `WeaverFO`
  - the future FO/XSL-FO lane
  - a standards-oriented frontend for publishing workflows
  - not the initial implementation target

Historical EzPDF notes under `.workbench/` remain useful reference material,
but new planning language in this repository should use `WeaverPDF` and
`WeaverFO`.

## Product split

The intended long-term split is:

```txt
WeaverPDF:
  humane Markdown/directives authoring path

WeaverFO:
  standards-ish FO compatibility path
```

That should not imply two independent renderers.

The shared architecture should be:

```txt
WeaverPDF Markdown frontend ┐
                           ├→ document AST → layout IR → PDF backend
WeaverFO frontend          ┘
```

## Boundaries

### WeaverPDF owns

- Markdown-first authoring syntax
- Weaver-specific directives and authoring sugar
- author-facing diagnostics for Markdown/directive input
- authoring ergonomics, readability, and debugging experience

### WeaverFO owns

- future FO parsing and validation
- FO-specific diagnostics and compatibility notes
- mapping FO constructs into the shared layout system

### Shared engine owns

- normalized document AST
- layout IR
- pagination, line layout, and block layout
- tables, images, page furniture, and bookmarks
- PDF serialization backend
- trace/debug surfaces that map output back to source structures

## What WeaverPDF is not

To keep the scope honest, `WeaverPDF` should not be treated as:

- a new PDF file format
- a direct clone of QuestPDF
- a direct clone of the existing EzPDF implementation
- an FO compatibility layer

QuestPDF is the UX/layout benchmark. The EzPDF reference is the syntax and
feature seed. WeaverPDF is the TypeScript-native product built from those ideas
with its own engine-owned middle layers.

## Relationship to the EzPDF reference

The EzPDF spec reference under `.workbench/EzPDF Spec Reference/` is the design
seed for WeaverPDF, especially for:

- Markdown-first authoring
- directive syntax patterns
- authoring ergonomics
- templating and reference ideas
- page-composition features to stage later

It should not be copied literally.

The TypeScript implementation should selectively adopt and normalize that spec,
especially where the reference still shows:

- syntax that is being deprecated
- overlapping feature tiers
- author-facing convenience rules that would complicate a clean first
  implementation

The current adoption profile is documented in
[WeaverPDF Syntax Profile](../Specifications/WeaverPDF%20Syntax%20Profile.md).

## First implementation priority

WeaverPDF starts with a bounded Markdown-first slice, not with FO and not with
the full directive language.

The first implementation target is defined in [WeaverPDF v1 Specification](../Specifications/WeaverPDF%20v1%20Specification.md).
The intended internal contracts for that slice are defined in
[WeaverPDF Architecture Specification](../Specifications/WeaverPDF%20Architecture%20Specification.md).

## Decision summary

Use `WeaverPDF` as the Markdown-first PDF lane.

Reserve `WeaverFO` for the future FO-compatible lane.

Build one shared document/layout/PDF engine under both.
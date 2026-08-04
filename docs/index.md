# Weaver

Weaver is a TypeScript-native XSLT compiler that aims to make XSLT readable,
debuggable, and workable in normal TypeScript toolchains.

## Live workbench

The public live-workbench route for `weaverxslt.org` is [Workbench](WORKBENCH.md).

That page is the stable front-page link target for the upcoming MVP+6.5 embed.
It will eventually host the live demo or launch directly into it; until then,
it links to the current host, checklist, and engine-boundary notes.

The engine has two backends:

- an interpreter backend used as the semantic reference implementation
- a codegen backend that emits inspectable TypeScript and is the product target

## What makes it different

Weaver is built around a few explicit priorities:

- diagnostics that point back to the stylesheet, not just opaque runtime failures
- generated TypeScript that can be reviewed and debugged like normal application code
- a shared IR contract between compiler, interpreter, codegen, and future tooling
- host integration that stays explicit instead of hiding engine behavior behind magic

## Current status

The project is pre-stability and has completed the interpreter MVP, the first
codegen backend slice, and the initial typed CLI and extension-function surface.

- the XPath core is in place
- the MVP+3 XSLT interpreter slice runs real transforms
- the MVP+4 codegen backend emits reviewable TypeScript and runs the golden fixtures
- the MVP+5 typed params, typed extension functions, and CLI surface are in place
- the next major milestone is MVP+6: watch mode, source maps, and diagnostics v2

## Start here

- [Product Thesis](Specifications/Weaver%20Product%20Thesis.md) for the product intent
- [Software Design Document](Specifications/Weaver%20Software%20Design%20Document.md) for the current architecture
- [Architecture Decision Records](ADR/README.md) for accepted decisions
- [Architectural Reviews](Architectural%20Reviews/README.md) for open and deferred questions
- [Roadmap](Plans/Weaver%20Roadmap.md) for milestone scope and exit criteria
- [Workbench](WORKBENCH.md) for the stable public live-workbench entry point
- [Workbench Embed](Plans/Workbench%20Embed.md) for the first public `weaverxslt.org` live-workbench surface
- [Workbench Checklist](Evidence/Workbench%20Implementation%20Record.md) for the concrete MVP+6.5 host implementation work order
- [WeaverPDF](Plans/WeaverPDF.md) for the Markdown-first PDF lane and its boundary with WeaverFO
- [WeaverPDF v1](Specifications/WeaverPDF%20v1%20Specification.md) for the first bounded implementation target
- [WeaverPDF Architecture](Specifications/WeaverPDF%20Architecture%20Specification.md) for the owned document AST and layout IR contracts
- [WeaverPDF Syntax Profile](Specifications/WeaverPDF%20Syntax%20Profile.md) for what the EzPDF language seed is adopted, normalized, deferred, or banned
- [Practical Streaming](Plans/Practical%20Streaming.md) for the tracked-later streaming design direction
- [Security Boundaries](Specifications/Weaver%20Security%20Boundary%20Specification.md) for capability ownership and untrusted-content policy
- [XSD Validation Design](Plans/XSD%20Validation.md) for the proposed preflight-validation boundary and placement
- [DevTools Checklist](Evidence/Chrome%20DevTools%20Verification.md) for manual `.xsl` source-map and breakpoint verification
- [Progress Artifacts](Evidence/Progress%20Artifacts.md) for public milestone evidence published on `weaverxslt.org`
- [Errors](Specifications/Weaver%20Error%20Design%20Document.md) for the diagnostic model

## Source of truth

This site is the public guide for the project. The repository remains the source of
truth for implementation and planning details.

- `README.md` is the quick orientation surface.
- `docs/ADR/` records accepted architectural decisions.
- `docs/Specifications/` defines current contracts and design boundaries.
- `docs/Architectural Reviews/` preserves open and deferred architecture evidence.
- `docs/Plans/` tracks non-normative implementation work.
- `docs/Evidence/` records observed implementation results.

See [Project Governance](project-governance.md) for the authority and lifecycle
rules that connect those collections.

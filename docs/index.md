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

- [Differentiators](DIFFERENTIATORS.md) for the product thesis
- [Architecture](ARCHITECTURE.md) for the pinned design decisions
- [Roadmap](ROADMAP.md) for milestone scope and exit criteria
- [Workbench](WORKBENCH.md) for the stable public live-workbench entry point
- [Workbench Embed](WORKBENCH_EMBED.md) for the first public `weaverxslt.org` live-workbench surface
- [Workbench Checklist](WORKBENCH_CHECKLIST.md) for the concrete MVP+6.5 host implementation work order
- [WeaverPDF](WEAVERPDF.md) for the Markdown-first PDF lane and its boundary with WeaverFO
- [WeaverPDF v1](WEAVERPDF_V1.md) for the first bounded implementation target
- [WeaverPDF Architecture](WEAVERPDF_ARCHITECTURE.md) for the owned document AST and layout IR contracts
- [WeaverPDF Syntax Profile](WEAVERPDF_SYNTAX_PROFILE.md) for what the EzPDF language seed is adopted, normalized, deferred, or banned
- [Practical Streaming](STREAMING.md) for the tracked-later streaming design direction
- [Security Boundaries](SECURITY_BOUNDARIES.md) for capability ownership and untrusted-content policy
- [XSD Validation Design](XSD_VALIDATION.md) for the proposed preflight-validation boundary and placement
- [DevTools Checklist](DEVTOOLS_CHECKLIST.md) for manual `.xsl` source-map and breakpoint verification
- [Progress Artifacts](PROGRESS_ARTIFACTS.md) for public milestone evidence published on `weaverxslt.org`
- [Errors](ERRORS.md) for the diagnostic model

## Source of truth

This site is the public guide for the project. The repository remains the source of
truth for implementation and planning details.

- `README.md` is the quick orientation surface
- `docs/ARCHITECTURE.md` is the pinned engine design
- `docs/ROADMAP.md` is the active milestone plan
- `docs/ERRORS.md` defines the error-reporting model
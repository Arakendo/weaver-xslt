# Weaver

Weaver is a TypeScript-native XSLT compiler that aims to make XSLT readable,
debuggable, and workable in normal TypeScript toolchains.

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
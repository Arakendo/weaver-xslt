# Weaver XSLT — Project Briefing

> Auto-generated summary of `@arakendo/weaver-xslt` as of 2026-06-22.  
> Sources: `ARCHITECTURE.md`, `CODEGEN_COMPILE_PERFORMANCE.md`, `CODEGEN_FALLBACK_SIZE.md`, `LESSONS_LEARNED.md`, `ROADMAP.md`.

---

## Architecture

Weaver is a **TypeScript-native XSLT 3.0 engine** with two first-class execution backends (interpreter and native) and the ability to compile `.xsl` stylesheets into inspectable, typed, source-mapped TypeScript modules. It targets debuggability, compile-time diagnostics, and bundler integration as first-class features.

### Four-Layer Pipeline

```
XML + XSLT → Stylesheet IR → [Interpreter | Native Backend] → Result
                              ↕ XPath 3.1 Engine (shared)
```

| Layer           | Location           | Purpose                                                                           |
| --------------- | ------------------ | --------------------------------------------------------------------------------- |
| **XML Parser**  | `src/xml/`         | DOM parse/serialize via `@xmldom/xmldom`                                          |
| **XDM**         | `src/xdm/`         | XPath Data Model (atoms, nodes, lazy sequences, maps, arrays)                     |
| **XPath 3.1**   | `src/xpath/`       | Hand-rolled lexer → recursive-descent + Pratt parser → evaluator + ~fn:\* library |
| **XSLT**        | `src/xslt/`        | Stylesheet compiler → IR, interpreter evaluator, codegen emitter                  |
| **Runtime**     | `src/runtime/`     | Shared helpers for generated code (writer, dispatcher, extension functions)       |
| **Diagnostics** | `src/diagnostics/` | Structured error reports (W3C codes), formatting, "did you mean" suggestions      |

### Key Design Decisions

- **IR is the contract**: `StylesheetIR` is pure, JSON-serializable, exhaustively source-located data. Both backends are pure functions of the IR.
- **Dual backends**: interpreter (reference semantics) and native (direct in-process or TS emission). A feature isn't "done" until both pass conformance.
- **Native emission → readable TypeScript** (`.xsl.ts` + `.d.ts` + `.map`), not bytecode. Enables debugging, code review, and tree-shaking.
- **Diagnostics-first**: every error names file, line, column, template context; compile-time static analysis catches issues before runtime.
- **Extension functions**: typed bindings via `defineXsltFunctions()` with compile-time signature checking.
- **Bundler plugins**: Vite and esbuild wrappers for importing `.xsl` files directly.
- **CLI**: `compile`, `watch`, `run` commands; also exposed as `weaver-xslt` npm binary.

### Pinned Non-goals

Streaming (XSLT 3.0 streamability), schema-aware processing, XQuery 3.1, XSLT 1.0 bug-compat mode, and extension instructions are all out of scope for now.

---

## Current Performance Findings

### Compile Performance (S1000D_main.xslt — ~3,500 templates)

| Phase               | Time (Before Fixes)        | Time (After Fixes) |
| ------------------- | -------------------------- | ------------------ |
| Compose             | 573 ms                     | 497 ms             |
| **IR compile**      | **1,620,367 ms (~27 min)** | **202 ms**         |
| Emit module         | 228 ms                     | 48 ms              |
| Analyze diagnostics | 169 ms                     | 36 ms              |
| Emit declaration    | 232 ms                     | 38 ms              |
| Emit source map     | 97 ms                      | 20 ms              |
| **Total**           | **~31 min**                | **~850 ms**        |

### Root Causes Identified and Fixed

1. **Duplicate template lowering**: Imported match templates from `common.xslt` were pulled into the composed source many times, causing identical templates to be lowered dozens of times. Fix: prune exact-duplicate unnamed `xsl:template` entries during composition (removed 2,965 duplicates).
2. **Repeated source-location rescans**: Location helpers recomputed line-start offsets by scanning the entire stylesheet source on every call. Fix: cache line-start offsets per stylesheet source.

### Fallback IR Size Findings

| Metric               | Historical Baseline                        | Current Post-Fix |
| -------------------- | ------------------------------------------ | ---------------- |
| Generated module     | 34 MB (minified) / 111 MB (pretty-printed) | **6.49 MB**      |
| Template rules       | 3,493                                      | 754              |
| XPath parses         | 31,388                                     | 5,972            |
| Diagnostics produced | 3,053                                      | 199              |

### Byte Attribution (Historical Minified IR)

- Pretty-print whitespace: **65.8%** of original file
- Provenance/location metadata: **64.6%** of minified IR
- **Genuine stylesheet logic (structure only): ~11.6 MB raw → 84 KB brotli**
- The transform logic itself is tiny; provenance duplication is the weight.
- HTTP brotli already compresses the full IR to **0.97 MB** — well under the `<10 MB` delivery target.

---

## Known Falsified Hypotheses

| Hypothesis                                                  | Why It Was Wrong                                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-map generation was the bottleneck                    | Took only 97 ms; IR compilation dominated at 1,620,367 ms                                                                                           |
| A small number of exotic template bodies were the problem   | Pathological templates weren't random; repeated imported match templates from shared imports were being lowered identically many times              |
| Include/import graph expansion was the primary size culprit | Bloat came from pretty-print whitespace (65.8%) and duplicated provenance (64.6%), not include-graph blowup                                         |
| The stylesheet logic itself is large                        | Structure-only payload is only ~11.6 MB raw, compressing to **84 KB brotli**                                                                        |
| Custom IR compression or binary format was needed           | HTTP brotli already handles the payload adequately; no custom format required unless browser parse/memory proves hurtful                            |
| TypeScript object churn explains a 31-minute compile        | If one lowering phase owns nearly all the time, look for repeated work, quadratic scans, or repeated parse/resolve steps before blaming allocations |

---

## Active Roadmap

### Completed (M0–M6.5)

- [x] M0 — Project scaffold + W3C test suites cataloged
- [x] M1 — XPath vertical slice + diagnostic bones
- [x] M2 — XPath core on interpreter (~20% QT3)
- [x] M3 — XSLT MVP on interpreter
- [x] M4 — Codegen backend v1 (IR → readable TypeScript)
- [x] M5 — Typed params, typed extension functions, CLI
- [x] M6 — Watch mode, source maps, static-analysis diagnostics v2, bundler polish
- [x] M6.25 — Native backend direct execution
- [x] M6.5 — Live workbench / playground at `weaverxslt.org`

### In Progress / Next

| Milestone | Status     | Description                                                                                    |
| --------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **M6.75** | 🔵 Next    | XML node trace debugging                                                                       |
| **M7**    | 🟡 Planned | XPath type system (`cast as`, `instance of`), maps/arrays, higher-order functions              |
| **M8**    | 🟡 Planned | XSLT 3.0 feature-complete (non-streaming): accumulators, iterate, merge, packages, modes, keys |
| **M9**    | 🟡 Planned | Conformance push: ≥70% of XSLT 3.0 required tests passing under **both** backends              |
| **M10**   | 🟡 Planned | Practical streaming subset + gated `<ts:eval>` escape hatch                                    |

### Active Optimization Work (Post-M6.5)

- **Browser cold-start measurement** (Phase 1.5 gate): fetch time, `JSON.parse` time, peak heap growth, time-to-first-usable-transform on real S1000D IR payload
- **Web-targeted fallback emit mode**: serve `.xslt.ir.json` as static asset via IIS with compression + digest-keyed caching (async load by contract)
- **Incremental recompile optimization** (Phase 4): cache composed include/import results keyed by file path + content digest for watch-mode scenarios

### Remaining Open Questions

1. Should browser fallback loading be explicitly async by contract?
2. What concrete Phase 1.5 pass/fail thresholds should be adopted for parse latency, heap growth, and first-transform readiness?
3. Should the browser path fetch the IR asset directly, or should the server bootstrap response provide the URL/digest manifest?
4. Are `.workbench` generated artifacts meant to be committed or treated as build output?

---

## Current Architectural Constraints

These constraints drive design decisions and are not negotiable without explicit approval:

- **IR is the canonical representation**: Both interpreter and native backend are pure functions of `StylesheetIR`. A feature isn't "done" until both backends pass.
- **Diagnostics fidelity is a first-class feature**: Every error names file, line, column, template context. No feature ships without adequate diagnostics.
- **Readable TypeScript output is preferred over opaque bytecode**: Generated `.xsl.ts` must be debuggable, reviewable, and tree-shakeable.
- **Performance optimizations must preserve source locations**: Caching or short-circuiting is acceptable; losing provenance data is not.
- **Extension functions use typed bindings**: `defineXsltFunctions()` signatures are checked at compile time against XPath calls.
- **No deep imports from consumers**: Public API surface is intentionally tiny and stable (`XsltProcessor`, `compileStylesheetToTs`, `defineXsltFunctions`).

## Where to Start Reading

### Architecture & Design

| Document             | When to Read                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| `ARCHITECTURE.md`    | Understanding the four-layer pipeline, pinned decisions, and milestone plan |
| `DIFFERENTIATORS.md` | What this project aims to be best at                                        |
| `ROADMAP.md`         | Full MVP/MVP+N execution plan with scope and exit criteria                  |

### Compiler & Codegen

| File                           | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `src/xslt/compile/compiler.ts` | Stylesheet → IR compiler entry point                         |
| `src/xslt/compile/ir.ts`       | `StylesheetIR` type definitions + `STYLESHEET_IR_VERSION`    |
| `src/xslt/compile/analyze.ts`  | Static-analysis passes (purity, streamability, diagnostics)  |
| `src/xslt/codegen/emit.ts`     | IR → TypeScript source emission                              |
| `src/xslt/codegen/plan.ts`     | EmitPlan overlay (symbol naming, hoisting, helper selection) |

### Runtime & Processing

| File                                | Purpose                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `src/processor/XsltProcessor.ts`    | Public orchestration entry point                        |
| `src/processor/compile.ts`          | High-level compile pipeline                             |
| `src/processor/runtimeArtifacts.ts` | Phase timing, digest computation, artifact wiring       |
| `src/runtime/index.ts`              | Runtime helpers for generated code (writer, dispatcher) |

### XPath Engine

| Directory          | Purpose                               |
| ------------------ | ------------------------------------- |
| `src/xpath/lex/`   | XPath 3.1 lexer + token definitions   |
| `src/xpath/parse/` | Recursive-descent + Pratt parser      |
| `src/xpath/eval/`  | Evaluator + evaluation context        |
| `src/xpath/fn/`    | fn:\* function library implementation |

### Performance Investigations

| Document                         | What It Covers                                                  |
| -------------------------------- | --------------------------------------------------------------- |
| `CODEGEN_COMPILE_PERFORMANCE.md` | 31 min → 850 ms compile investigation, phase-by-phase profiling |
| `CODEGEN_FALLBACK_SIZE.md`       | 111 MB → 6.49 MB module reduction, byte attribution analysis    |
| `LESSONS_LEARNED.md`             | Durable debugging memory from engine, CLI, and corpus work      |

### Diagnostics & Errors

| Document                   | What It Covers                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| `ERRORS.md`                | W3C error codes, `XdmError` hierarchy, diagnostic report contract |
| `DIAGNOSTIC_INTRINSICS.md` | Compiler-recognized `wx:*` observability and assertion surface    |

### Workbench & Embedding

| Document             | What It Covers                            |
| -------------------- | ----------------------------------------- |
| `WORKBENCH.md`       | Live workbench / playground design        |
| `WORKBENCH_EMBED.md` | Public host-facing embed API              |
| `WORKBENCH_API.md`   | Engine-facing workbench boundary contract |

---

_This briefing is a living summary. Update it when major architectural or performance milestones shift._

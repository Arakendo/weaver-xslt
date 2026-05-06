# Architecture

> Status: design draft. Decisions here are **pinned** — change with intent, not
> drift. Update this file when a decision changes.
>
> See [DIFFERENTIATORS.md](./DIFFERENTIATORS.md) for the *why*. This file is
> the *how*. See [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md) for
> cross-cutting rules about where meaning boundaries must stay explicit.
> See [IKVM_INTEGRATION.md](./IKVM_INTEGRATION.md) for the later-stage plan
> for .NET/NuGet hosting without creating a second semantic engine.

## 1. Goals & non-goals

### Thesis (one sentence)
Weaver (`@arakendo/weaver-xslt`) is a **TypeScript-native XSLT platform** with
two first-class execution backends: interpreter and native. The native backend
can execute in-process or emit inspectable, typed, debuggable TS/JS transform
modules; emitted TypeScript is the first delivery mode, not the definition of
native execution.

### Goals
- **XSLT 3.0** basic-conformance engine in TypeScript
- **XPath 3.1** engine written from scratch (no external XPath dependency)
- **Two execution backends**: interpreter (reference) and native
  (first-class product execution path), sharing one IR
- **Native delivery modes**: direct in-process execution and emitted
  inspectable TS/JS artifacts from the same native planning pipeline
- **Debuggability first**: every IR + AST node carries source locations;
  every error names the file, line, column, and stylesheet context; the
  native emission produces human-readable TS with source maps
- **Compile-time diagnostics** over runtime surprises wherever possible
- **Typed integration**: typed params, typed extension functions, typed
  result shapes when feasible
- Works in **Node 20+** and modern browsers (no Node-only APIs in core)
- Usable as a library (`@arakendo/weaver-xslt`) and as a build step
  (`npx weaver-xslt compile stylesheet.xsl`)

### Non-goals (for now)
- Streaming (XSLT 3.0 streamability) — design should not *preclude* it, but
  we will not build it in the first milestone. A practical streaming
  *subset* (forward-only, explicit opt-in) is in scope later.
- Schema-aware processing (XSD-typed data)
- XQuery 3.1
- XSLT 1.0 bug-compat mode
- Extension instructions / vendor extensions
- `xsl:evaluate` under the native backend (supported under interpreter only)
- Saxon-compatibility as a marketing promise

## 2. High-level layers

```
 Source XML + Stylesheet XML
           │
           ▼
 ┌─────────────────────┐
 │ 1. XML Parser       │  @xmldom/xmldom  →  DOM
 └─────────────────────┘
           │
           ▼
 ┌─────────────────────┐
 │ 2. Stylesheet       │  DOM → StylesheetIR  (plain data, source-located)
 │    Compiler         │
 └─────────────────────┘
           │
           │  ── XPath lives *inside* instructions ──
           ▼
 ============== IR is the contract ==============
           │                 │
   ┌────────────────────┴────────────────┐
   ▼                                         ▼
 ┌─────────────────────┐                 ┌──────────────────────┐
 │ 3a. Interpreter     │                 │ 3b. Native backend   │
 │     backend         │                 │  IR → RuntimePlan    │
 │   (reference impl)  │                 │  (product execution) │
 └─────────────────────┘                 └──────────────────────┘
     │                                         │
   both call into XPath engine              direct execute or emit
     │                              TS/JS render artifacts
     ▼                                         │
 ┌─────────────────────┐                 ┌──────────────────────┐
 │ XPath 3.1 Engine    │  ◄───────────── │ emitted TS/JS modules │
 │ (lex → parse → eval)│                 │ call shared runtime   │
 └─────────────────────┘                 └──────────────────────┘
           │
           ▼
 ┌─────────────────────┐
 │ 4. Result Builder   │  XDM → DOM / string (shared by both backends)
 │    + Serializer     │
 └─────────────────────┘
           │
           ▼
    Primary + secondary result documents
```

**Conformance tests run against both backends** to guarantee semantic
parity. A feature is not "done" until both pass.

## 3. Pinned decisions

### DEC-001 — XML parser: `@xmldom/xmldom`
W3C-DOM compatible, pure-JS, works in Node & browser. Alternative was
`sax`/`saxes` (streaming) — rejected for M1 since we're not streaming yet.
Wrapped in a thin `parseXml(source): Document` helper so we can swap later.

### DEC-002 — Node model: **wrap DOM, do not copy**
XSLT operates on the XDM (XPath Data Model). XDM is *not* DOM:

- DOM has adjacent text nodes; XDM text nodes are merged
- DOM exposes namespace nodes differently
- XDM has typed values; DOM does not
- Attribute order, namespace axis, id-ness — all differ

We will implement a **`XdmNode` adapter** layer over DOM nodes (lazy,
non-copying). Internal methods in the engine talk to `XdmNode`, never raw
DOM. Conversion happens at the boundary.

Rationale: copying a large input document doubles memory and is slow.
Adapter layer preserves the option to swap in a native tree later.
The adapter is allowed to cache derived views lazily (children, string
value, document-order helpers) so we pay the DOM-to-XDM normalization cost
once per node, not on every XPath step.

Cache constraints:

- caches are per-node, not global
- cached values are immutable after first computation
- the adapter assumes the underlying DOM is immutable once wrapped
- wrappers are canonicalized per underlying DOM node

If callers mutate the DOM after wrapping it in `XdmNode`, behavior is
undefined. The adapter is a semantic view over a stable tree, not a live
DOM observer.

Canonical node identity is required for XPath node identity semantics.
`XdmNode` wrappers should therefore be produced through a single factory /
cache (for example a `WeakMap<Node, XdmNode>`), not via ad hoc `new XdmNode(...)`
calls sprinkled across the engine. If the same DOM node yields two distinct
wrappers, the `is` operator and duplicate-elimination logic will lie.

### DEC-003 — XPath engine: **hand-rolled, owned in-tree**
Rejected: `fontoxpath` (MIT, mature). Chosen: build our own under
`src/xpath/`. Reasons:

Implementation strategy and risk areas are expanded in
[XPATH.md](./XPATH.md).

- Full control over evaluation model (needed for future streaming)
- No runtime dependency on a 2 MB library
- Learning goal of the project

Accepts the cost: ~17–24 focused weeks of XPath work before XSLT layer
benefits. Documented in README as a scope risk.

XPath delivery is intentionally tiered to prevent scope soup:

- M1: navigation + arithmetic + predicates + diagnostic bones
- M2: core expressions + function library + comparison semantics
- M7: type system, maps/arrays, higher-order functions

Do not quietly pull later tiers forward piecemeal because one function or
operator looks easy in isolation. XPath semantics do not reward that habit.
Where practical, tests and feature gates should enforce the current tier so
"just one more function" does not drag M7 semantics back into M2.

### DEC-004 — Parser style: **recursive descent + Pratt for expressions**
- Statement/path structure → recursive descent
- Binary/unary operator precedence → Pratt parser
- Hand-written, no parser generator
- AST nodes are plain, discriminated unions keyed on `kind`

### DEC-005 — Intermediate Representation (the contract)
Stylesheet compilation produces a `StylesheetIR`: a plain-data tree of
**instruction objects** keyed by `kind` (`'literal-result-element'`,
`'apply-templates'`, `'value-of'`, `'choose'`, `'for-each'`, …).

The IR is the contract between the compiler and **all backends**
(interpreter, native execution, native emission, future optimizers,
debugger tooling).
It must be:

1. **Pure, JSON-serializable data.** No DOM refs, no closures, no cycles.
2. **Source-located exhaustively.** Every node carries
  a full source span compatible with [ERRORS.md](./ERRORS.md)
  `SourceSpan` (`uri`, UTF-16 offsets, start/end line + column).
  Non-negotiable — see DEC-013.
3. **Semantically annotated** by a static-analysis pass: `purity`,
   `streamability`, `mayThrow`, `refersToContext`, `referencedNames`.
   Backends query these rather than recomputing them.
4. **Versioned.** Adding a node kind = minor bump. Changing a shape =
  major bump. The root `StylesheetIR` object carries an explicit `version`
  field; external tools should not infer version from package metadata.
  The authoritative constant is `STYLESHEET_IR_VERSION` in
  `src/xslt/compile/ir.ts`; any IR schema change must update that value in
  the same change.
5. **Free of execution caches.** Pre-resolved bindings, dispatch tables,
  memoized analysis artifacts, and runtime helpers live in a separate
  `RuntimePlan` / `EmitPlan` overlay keyed off the IR, not on IR nodes
  themselves.

If the native emitter can't be written as a (mostly) pure function
`IR → string`, the IR is doing too little. Fix the IR, not the backend.

If the interpreter needs richer runtime toys (resolved QNames, compiled
dispatch tables, memoized bindings), build them in the execution plan
layer, not by smuggling `_internalCache` fields onto the IR.

Plan boundary:

- **`RuntimePlan`** owns interpreter-only execution structures:
  dispatch tables, resolved QNames, memoized evaluation helpers,
  rule-matcher indexes, and other "how to run" concerns.
- **`EmitPlan`** owns codegen-only structures:
  symbol naming, import tracking, hoisting decisions, helper selection,
  and other "how to generate code" concerns.

If a structure is needed by both plans, first ask whether it actually
belongs in the IR. If the answer is no, duplicate the derived view rather
than letting `RuntimePlan` and `EmitPlan` slowly merge into one blob.

XPath expressions inside instructions are **pre-parsed once at compile
time** into XPath ASTs and embedded in the IR. No re-parsing per call.

### DEC-006 — Sequences: owned lazy sequence abstraction
Sequences are lazy, but not exposed as naked JS iterables across the engine.
We provide an engine-owned sequence abstraction backed by generators /
iterables internally, with explicit operations for iteration,
materialization, and focus-sensitive behavior.

Rationale:

- `1 to 1_000_000` must not allocate 1M ints
- raw JS iterables are too easy to consume accidentally only once
- XPath needs controlled semantics for `position()`, `last()`, and replay

Sequence guarantees:

- re-iteration is stable unless a sequence is explicitly documented as
  one-shot internally
- document order is preserved unless an operation explicitly changes it
- duplicates are preserved or eliminated according to XPath semantics,
  not according to incidental JS collection behavior
- node identity comparisons (`is`) observe stable wrapped-node identity

Materialization policy:

- materialization is allowed for operations that semantically require it
  (`last()`, counting, explicit sequence construction, duplicate-sensitive
  set operations, indexed access)
- materialization is not the default fallback for convenience
- future streaming or forward-only contexts may forbid materialization
  entirely for specific execution paths

A materialized `Sequence` helper is still provided for cases that need
count or indexed access, but the abstraction boundary is ours, not the JS
iterator protocol's.

### DEC-007 — Error model: `XdmError` with codes *and context*
One error class hierarchy:

```
XdmError (base)
 ├─ XPathError     (XPST*/XPDY*/XPTY* codes)
 ├─ XsltError      (XTSE*/XTDE* codes)
 └─ SerializationError (SE* codes)
```

Every throw sets a W3C error code. Static/parse-time errors include
source location; dynamic errors include XPath location **and** a call
stack of IR nodes (template, instruction) that led to the failure.

The boundary-facing structured diagnostic contract is defined in
[ERRORS.md](./ERRORS.md). `XdmError` is the engine-facing throwable type;
`DiagnosticReport` is the durable boundary shape for formatting, tests,
watch mode, and future editor tooling.

Pinned rules from that contract:

- W3C error codes are the primary diagnostic identity whenever the spec
  defines one; `WEAVER_*` local codes are reserved for boundary/runtime
  failures where no W3C code reasonably fits.
- Boundary translation flows `XdmError -> DiagnosticReport`; core engine
  code does not format user-facing prose ad hoc and no boundary parses
  formatted strings back into structure.
- `DiagnosticReport` is structured, not stringly: `primary`, `related`,
  `frames`, `details`, `suggestions`, and `causes` are first-class data,
  not text fragments stuffed into `message`.
- Boundary diagnostics are treated as immutable contract objects once
  created.
- Cause chains are normalized at the boundary into structured
  `causes[]`, with cycle-safe formatting and a flat enough shape for
  watch mode, tests, and editor consumers.

Validation rule: development builds and tests should reject malformed
diagnostics via a small invariant checker (`assertValidDiagnostic` or
equivalent). At minimum, it validates code shape, classification fields,
span ordering, and required detail fields for the small set of codes
where missing structure would materially weaken the diagnostic.

An error message is not considered acceptable unless it identifies:
- the W3C code
- a human-friendly description
- the stylesheet file, line, and column
- the containing template (and its source location)
- where possible, the caller chain (which `apply-templates` invoked this)
- where possible, a "did you mean" suggestion

See DEC-013, [DIFFERENTIATORS.md](./DIFFERENTIATORS.md) D1, and
[DIAGNOSTIC_INTRINSICS.md](./DIAGNOSTIC_INTRINSICS.md) for the narrow
compiler-recognized observability/intrinsics surface.

### DEC-013 — Diagnostics-first, always
This project's reason to exist is better XSLT ergonomics. Therefore:

1. **Source locations propagate everywhere.** XML parser → stylesheet
   AST → IR → codegen output → runtime errors. Losing locations is a
   bug, not a simplification.
2. **Compile-time > runtime** for diagnostics. Static analysis passes
   catch typos, unreachable templates, priority conflicts, obvious
   type mismatches, unused variables before the user runs anything.
3. **Codegen emits source maps** (`.xsl.map`) so browser debuggers
   step through the user's XSLT, not the generated JS.
4. **No feature is done with poor errors.** A feature that passes its
   happy-path tests but produces `XPTY0004: type mismatch` at runtime
   for simple misuse is incomplete.
5. **Diagnostics are testable artifacts.** Formatter output and
  structured diagnostic shape get fixture or snapshot coverage; they are
  not left to ad hoc manual inspection.
6. **One report contract across surfaces.** Parse errors, static
  analysis, runtime failures, serialization failures, watch-mode output,
  and codegen diagnostics all project to the same `DiagnosticReport`
  shape. Different renderers are allowed; different meanings are not.
  Canonical ordering and shared presentation policy belong at this
  boundary layer (shared diagnostics helpers / boundary adapters), not
  inside individual analysis passes.
7. **Parity is semantic, not cosmetic.** Where interpreter and codegen
  both implement a feature, diagnostics match on code, phase, category,
  severity, primary span when source is available, and relevant details.
  Minor wording drift in formatted text is secondary.

### DEC-014 — Native emission path: TypeScript source, not bytecode
One delivery mode of the native backend emits **plain TypeScript source**
(`.xsl.ts`) plus a `.d.ts`. Rejected alternatives:

- **Bytecode / SEF-style binary** — opaque, unreviewable in PRs, needs
  a VM. Good for Saxon-JS's use case (hide the IR). Bad for ours.
- **`new Function(...)` only** — forfeits bundlers, typing, debugging.
  Will be supported as a secondary mode for dynamic compilation, not
  as the primary output.
- **Emitting via TypeScript Compiler API `ts.factory.*`** — considered
  for phase 2 once the string-templated emitter stabilizes. First
  emitter lowers into a tiny TypeScript output model and then renders to
  strings for simplicity and readability of the output.

Generated code imports from `@arakendo/weaver-xslt/runtime` for shared helpers
(writer, XPath primitives, template dispatcher, XDM operations). The
runtime is a separate subpath export so projects can bundle *only* the
runtime without the compiler. Direct native execution and emitted TS/JS should
share the same semantic plan and helper contracts; emission is a delivery
choice, not a separate semantic engine.

Even before we adopt `ts.factory.*`, emission should not be raw string
concatenation everywhere. A tiny output-node layer is worth it for name
hygiene, string escaping, and source-map stability.

Name hygiene rule: all generated identifiers are collision-free and
deterministic across runs. Symbol creation flows through one allocator,
not ad hoc string formatting at call sites. If the same stylesheet
compiles twice, the generated names should be stable unless the input IR
meaningfully changed.

### DEC-015 — Extension functions: typed bindings
Users register extension functions with TypeScript signatures:

```ts
defineXsltFunctions('app', {
  formatCurrency(amount: number, locale: string): string { … }
});
```

The compiler type-checks XPath calls to `app:formatCurrency(...)` at
compile time. Runtime invocations bypass XDM coercion when static types
match. A `<ts:eval>` escape hatch is planned (DIFFERENTIATORS D4) but
deferred until the core codegen is stable.

### DEC-008 — Regex: **Schema regex translator**
XPath regex is XML-Schema flavor (with XPath extensions). We will
translate to ECMAScript regex at parse time. Module: `src/xpath/regex/`.
Not a user-facing API.

### DEC-009 — Collations: Unicode codepoint only for M1
Default collation is `http://www.w3.org/2005/xpath-functions/collation/codepoint`.
`Intl.Collator`-backed locale collations are a later milestone.

### DEC-010 — Testing strategy (four tiers, two backends)
1. **Unit tests** next to implementation (`foo.test.ts`)
2. **Golden tests** — `test/golden/<name>/{input.xml, stylesheet.xsl, expected.xml}` with one generic runner; **runs each case under both backends** and asserts equal output
3. **Parity tests** — targeted fixtures that run interpreter + codegen,
  then deep-compare **structured diagnostics and behavior**, not just
  final output. This is where evaluation order, laziness, and dynamic
  error semantics get pinned.
4. **Conformance** — git submodules `w3c/xslt30-test` and `w3c/qt3tests`;
   reports pass/fail percentage for each suite under each backend.
   Initially all expected to fail; number should only ever go up.

The rule: a feature is considered landed only when it passes the same
tests under both the interpreter and the codegen backends, and where a
diagnostic is part of the behavior contract, the structured reports must
also match. This keeps the two implementations honest and catches IR gaps,
evaluation-order bugs, and diagnostic drift early.

Diagnostic ordering must also be stable and deterministic. "Same set of
errors in a different order" is still parity drift once tests, watch mode,
or editor tooling consume the report stream.
The north-star rule is: diagnostics are first-class product artifacts,
not incidental log output. Discovery belongs in analyzers and runtimes;
canonical ordering and renderer-shared presentation policy belong in the
diagnostics boundary so every surface exposes the same meaning.
Use [DIAGNOSTIC_INTRINSICS.md](./DIAGNOSTIC_INTRINSICS.md) when the work
crosses from baseline diagnostics into compiler-recognized `wx:*`
observability or assertion surface.

### DEC-011 — Module layout
ESM only. Everything under `src/`:

```
src/
  index.ts                 # public API only
  version.ts

  errors/                  # DEC-007
    XdmError.ts
    XPathError.ts
    XsltError.ts
    SerializationError.ts
    codes.ts               # all W3C codes as consts

  xml/
    parse.ts               # parseXml(source, baseUri?) → Document
    serialize.ts

  xdm/                     # DEC-002, DEC-006
    types.ts               # XdmItem | XdmAtomic | XdmNode | XdmFunction
    atomic/                # xs:string, xs:integer, xs:date, ...
    node/                  # XdmNode adapter over DOM
    sequence.ts            # owned Sequence abstraction over lazy iterators
    map.ts                 # XDM map
    array.ts               # XDM array

  xpath/                   # DEC-003
    lex/
      lexer.ts
      tokens.ts
    parse/                 # DEC-004
      parser.ts
      ast.ts
      pratt.ts
    eval/
      evaluator.ts
      context.ts           # static + dynamic context
      focus.ts
    fn/                    # DEC-005 function library
      string.ts
      numeric.ts
      sequence.ts
      node.ts
      datetime.ts
      map.ts
      array.ts
      higher-order.ts
      registry.ts
    regex/                 # DEC-008
      translate.ts
    types/
      sequence-type.ts
      promote.ts
      cast.ts

  xslt/
    compile/               # DEC-005 stylesheet → IR
      compiler.ts
      ir.ts                # all instruction kinds
      analyze.ts           # static-analysis passes (purity, streamability, diagnostics)
    eval/                  # interpreter backend (DEC-014)
      transform.ts
      plan.ts              # IR -> RuntimePlan overlay (caches, bindings)
      rule-matcher.ts      # template match priority
      modes.ts
    codegen/               # codegen backend (DEC-014)
      plan.ts              # IR -> EmitPlan overlay (names, bindings, helpers)
      ts-ir.ts             # tiny TS output model for hygienic emission
      emit.ts              # IR → TypeScript string
      emit-types.ts        # IR → .d.ts for typed params
      sourcemap.ts
    fn/                    # XSLT-specific fns (current-group, etc.)

  runtime/                 # imported by generated code; also a public subpath
    index.ts               # @arakendo/weaver-xslt/runtime entry
    writer.ts              # output tree writer used by generated code
    dispatcher.ts          # template rule dispatcher
    ext.ts                 # defineXsltFunctions (DEC-015)

  diagnostics/             # DEC-013
    report.ts              # DiagnosticReport types + conversions
    format.ts              # pretty-print error with source snippet + caret
    json.ts                # JSON-safe projection for future boundaries
    suggest.ts             # "did you mean" heuristics

  processor/               # public orchestration
    XsltProcessor.ts       # high-level interpreter entry
    compile.ts             # high-level codegen entry (returns TS source)
    types.ts

  util/
    qname.ts
    uri.ts
```

### DEC-012 — Public API surface
Keep tiny and stable. Two entry points:

The host/application contract for URI resolution and external resource
loading is defined in [URI_RESOLUTION.md](./URI_RESOLUTION.md). `baseUri`
is part of that contract; it does not imply ambient filesystem or network
access from core engine code.

```ts
// Runtime / interpreter usage
import { XsltProcessor } from '@arakendo/weaver-xslt';

const proc = new XsltProcessor(stylesheetXml);
const { output } = proc.transform(sourceXml, { parameters: { foo: 1 } });

// Compile-to-TS usage (programmatic; CLI wraps this)
import { compileStylesheetToTs } from '@arakendo/weaver-xslt/compile';

const { code, declarations, sourceMap, diagnostics } =
  compileStylesheetToTs(stylesheetXml, { path: 'invoice.xsl' });

// Runtime helpers imported by generated code (and by power users)
import { defineXsltFunctions, Writer, Ctx } from '@arakendo/weaver-xslt/runtime';
```

Post-M6.5, a workbench-oriented boundary may sit alongside these surfaces,
but it must follow the same rules:

- accepts in-memory `uri + text` sources rather than assuming filesystem paths
- returns structured artifacts (`diagnostics`, `generatedTs`, source-map data,
  output) instead of forcing consumers to scrape formatted strings
- reuses the same compiler/runtime entry points as CLI and watch mode rather
  than creating a UI-only semantic path
- keeps generated TS read-only in the first workbench slice; editability is a
  separate design problem, not an MVP convenience

See [WORKBENCH_API.md](./WORKBENCH_API.md) for the narrower engine-facing
contract. That document intentionally defines the Weaver boundary only, not the
external product or UI that may consume it.

Everything else is internal. No deep imports from consumers.

## 4. Milestones

Ordering reflects the thesis (DIFFERENTIATORS): interpreter backend
first (fastest path to working code + reference semantics), then
diagnostics polish, then the native backend with readable TS as its first
delivery mode.

| M | Goal | Exit criteria |
|---|------|---------------|
| **M0** | Scaffold (this commit) | Typecheck + smoke tests pass; W3C suites cataloged (14.6k + 31.8k cases discovered) |
| **M1** | XPath vertical slice + diagnostic bones | Parse & evaluate `1 + 2`, `//foo`, `foo/bar[1]`; all AST nodes source-located; errors print file:line:col with source snippet + caret |
| **M2** | XPath core on interpreter | All axes, predicates, value/general/node comparisons, `if/for/let/some/every`, ~40 fn:* functions. Target: 20% of QT3 passing. |
| **M3** | XSLT MVP on interpreter | `xsl:template`, `xsl:apply-templates`, `xsl:value-of`, `xsl:for-each`, `xsl:choose`, `xsl:variable`, `xsl:param`, literal result elements. First golden test green. |
| **M4** | **Native backend (v1 TypeScript emission)** | IR → readable TypeScript for M3 features; golden + parity fixtures compare output and structured diagnostics under both backends; M3 conformance slice passes under native emission; generated output committed to a fixtures folder for review |
| **M5** | Typed params + typed extension functions | `.d.ts` emission; `defineXsltFunctions` with compile-time signature checking; CLI `weaver-xslt compile` |
| **M6** | Watch mode + source maps + diagnostics v2 | `weaver-xslt watch`; Vite/esbuild plugin; `.xsl.map` output; static-analysis pass for unreachable templates, unused vars, priority conflicts, "did you mean" suggestions |
| **M6.5** | Live workbench / playground | four-pane XML + XSLT + generated TS + output loop over in-memory sources; generated TS stays read-only; linked highlighting consumes source-map and diagnostic artifacts rather than screen-scraped text |
| **M7** | XPath type system + maps/arrays + higher-order | `cast as`, `instance of`, SequenceTypes, maps, arrays, function items |
| **M8** | XSLT 3.0 feature-complete (non-streaming) | `xsl:accumulator`, `xsl:iterate`, `xsl:merge`, packages, modes, keys |
| **M9** | Conformance push | ≥70% of XSLT 3.0 required tests passing under **both** backends |
| **M10+** | Practical streaming subset + gated `<ts:eval>` | forward-only opt-in streaming (DIFFERENTIATORS D2e); `<ts:eval>` escape hatch behind `features: { tsEval: true }` (D4 discipline) |

Time estimates intentionally omitted.

## 5. Open questions

- Do we expose the parsed IR as a public API? (Leaning yes for debugger
  tooling; behind `@arakendo/weaver-xslt/ir` subpath with its own version contract.)
- How do we handle `xsl:result-document` in the browser? (Return a map;
  let the caller decide what to do with it.)
- BigInt for `xs:integer`? (Spec says arbitrary precision. Probably yes
  eventually; `number` for M1.)
- Worker-based parallel evaluation? (Deferred indefinitely.)
- Tiny TS output model vs. `ts.factory.*` — first pass is a small
  output-node layer rendered to strings; migrate if/when emission
  complexity demands the full TS compiler API.
- How aggressive can compile-time diagnostics be without a sample input?
  (Without a sample: structural only. With a sample doc or schema:
  element/attribute name validation, basic type inference.)

## 6. References

- XSLT 3.0: https://www.w3.org/TR/xslt-30/
- XPath 3.1: https://www.w3.org/TR/xpath-31/
- XPath/XQuery Functions & Operators 3.1: https://www.w3.org/TR/xpath-functions-31/
- XDM 3.1: https://www.w3.org/TR/xpath-datamodel-31/
- XSLT 3.0 test suite: https://github.com/w3c/xslt30-test
- QT3 test suite: https://github.com/w3c/qt3tests

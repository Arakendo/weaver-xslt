# Roadmap — MVP and increments

> Execution plan, not a spec. See [ARCHITECTURE.md](./ARCHITECTURE.md) for
> pinned design decisions and [DIFFERENTIATORS.md](./DIFFERENTIATORS.md)
> for the product thesis. See [XPATH.md](./XPATH.md) for the XPath-specific
> implementation strategy that informs M1, M2, and M7.
>
> Each increment is **shippable on its own**: it compiles, it tests green,
> it demonstrates _something_ a user could see. Nothing here is "do a lot
> of work then flip a switch."
>
> Every increment is bounded by its **exit criteria**. A box unchecked =
> the increment is not done, regardless of elapsed effort. We do not
> redefine "done" to make dates.

---

## Ground rules (apply to every increment)

1. **Diagnostics-first** (DEC-013). No feature is complete without good
   errors. An increment with passing conformance tests but cryptic errors
   is rejected.
2. **Both backends, same tests** (DEC-010). Once the codegen exists (MVP+4),
   every new feature must pass under interpreter _and_ codegen before the
   increment closes.
3. **IR changes are reviewable diffs.** Generated code fixtures are checked
   into `test/generated-fixtures/` from MVP+4 onward. IR version ticks when
   it changes.
4. **No green tests, no merge.** Typecheck + lint + unit + conformance
   (scoped to the increment) all pass in CI.
5. **No increment bleeds features from the next.** If something feels
   necessary that's scheduled later, write it down as a scope-creep note
   and leave it alone.

---

## MVP (M0–M3): the interpreter walking skeleton

The MVP is **four increments**. At the end, we can run a real, small XSLT
against real XML and get real output with real error messages. No codegen
yet. No CLI yet. Just: the thing works end-to-end in TypeScript.

### MVP+0 — scaffold (done)

**Goal:** repo exists, builds, tests green, W3C suites visible.

**Deliverables (complete):**

- [x] `@arakendo/weaver-xslt` npm scaffold, strict TS, ESM, Node 20+
- [x] Vitest + ESLint 9 + Prettier + CI matrix (Ubuntu/Windows × Node 20/22)
- [x] MIT license, CONTRIBUTING, closed-contributions governance
- [x] Layered `src/` (errors, xml, xdm, xpath/{lex,parse,eval}, xslt/{compile,eval}, processor)
- [x] `@xmldom/xmldom` BOM-stripping parser wrapper
- [x] W3C submodules (`xslt30-test`, `qt3tests`) with VS Code isolation
- [x] Catalog walker discovering 14,600 XSLT cases + 31,821 QT3 cases
- [x] ARCHITECTURE.md + DIFFERENTIATORS.md with pinned DEC-001..015
- [x] Public API stubs throwing "not yet implemented"

**Exit criteria:** `npm run typecheck && npm test` green. ✅

---

### MVP+1 — XPath vertical slice + diagnostic bones (done)

**Goal:** evaluate `1 + 2`, `//foo`, `foo/bar[1]` against a DOM with
source-located AST and caret-formatted errors. This is where the
diagnostics-first culture gets built in; everything after inherits it.

**Scope (in):**

- Hand-written lexer (`src/xpath/lex/lexer.ts`) with **every token carrying
  a full `SourceSpan`** compatible with `docs/ERRORS.md` (`uri`, UTF-16
  offsets, start/end line + column). No exceptions.
- Recursive-descent parser (`src/xpath/parse/parser.ts`) + Pratt operator
  precedence for `+ - * div mod`, `= != < <= > >=`, `and or`, unary `-`
- AST node kinds: `NumberLiteral`, `StringLiteral`, `PathExpr`,
  `StepExpr` (axis + node-test + predicates), `BinaryOp`, `UnaryOp`,
  `ContextItem` (`.`), `VariableRef` (`$x`)
- Node-tests: `name`, `*`, `text()`, `node()`
- Axes: `child`, `descendant`, `descendant-or-self`, `self`, `attribute`
  (+ their abbreviations `/`, `//`, `@`)
- Evaluator over `XdmNode`-wrapped DOM; sequence results use the engine-owned
  `Sequence` abstraction rather than exposing naked JS iterables
- `DiagnosticReport` introduced as the canonical boundary shape, plus
  `XdmError -> DiagnosticReport` conversion and a small invariant checker
  for spans/classification basics
- `src/diagnostics/` module: `formatDiagnostic(report, sourceText)` produces
  the caret format documented in D1
- Error taxonomy: `XPathError extends XdmError` with W3C codes
  (`XPST0003` parse, `XPDY0002` no context, `XPTY0004` type mismatch)

**Scope (out, called out on purpose):**

- String/numeric type coercion rules beyond integer + decimal + string
- Function calls (deferred to MVP+2)
- Namespaces (expanded-QNames) — deferred to MVP+3
- Value-comparison (`eq`/`ne`) — deferred to MVP+2; only general-comparison
  in this slice
- Pulling M7 type-system semantics forward because one function/operator
  looks easy in isolation

**Exit criteria:**

- [x] Unit tests cover every AST kind + every axis + every operator
- [x] One golden error-format test: a known-bad expression produces a
      byte-exact expected diagnostic string
- [x] `DiagnosticReport` snapshots exist for at least one parse failure
      and one runtime type failure; both pass invariant validation
- [x] Evaluating `//book/title[1]/text()` over a fixture doc returns the
      first book's title text
- [x] QT3 conformance runner **filters to the slice** (arithmetic +
      path + predicates only) and reports a real pass rate, not "0 skipped"
- [x] Every XPath-layer failure can be converted into a `DiagnosticReport`
      with a populated primary span

**Completed notes:**

- Focused XPath tests cover the implemented AST, axis, operator, and predicate slice.
- `src/diagnostics/` now provides `DiagnosticReport` conversion, invariant validation,
  and caret formatting.
- A curated QT3 MVP+1 slice executes against vendor cases and currently reports `6/6` passing.

---

### MVP+2 — XPath core on interpreter (done)

**Goal:** pass a meaningful chunk of the QT3 suite. "Meaningful" = the
sequence/atomization rules are right, or everything downstream is cursed
(hazard H2).

**Completed slice:**

- Function-call AST + arity-based dispatch is now seeded in-tree.
- Zero-argument `position()` and `last()` support works inside predicates.
- `count()`, `exists()`, and `empty()` now work over evaluated sequences.
- `boolean()` and `not()` now reuse effective-boolean-value semantics over evaluated sequences.
- `true()`, `false()`, `abs()`, `floor()`, `ceiling()`, and `round()` now work through the shared function dispatch path.
- `string()`, `string-length()`, `number()`, `data()`, and `root()` now work through local string-value and atomization helpers.
- `name()`, `local-name()`, and `node-name()` now work for singleton node arguments.
- `reverse()`, `head()`, `tail()`, and `subsequence()` now work over evaluated sequences.
- `concat()`, `normalize-space()`, `contains()`, `starts-with()`, `ends-with()`, `upper-case()`, and `lower-case()` now work through the shared string-value helpers.
- `substring()` and `string-join()` now work through the same string-value path.
- `sum()`, `min()`, `max()`, and `avg()` now work over atomized numeric sequences.
- `distinct-values()` now works over atomized sequences.
- `matches()`, `replace()`, and `tokenize()` now have an initial regex translator slice with ECMAScript-compatible regexes plus `q` handling, `x` whitespace/comment handling, XML name escapes (`\i`, `\I`, `\c`, `\C`) both outside character classes and in ordinary/negated character classes, an initial character-class subtraction slice, ECMAScript-compatible Unicode property/category escapes such as `\p{Ll}`, `\p{Nd}`, and `\P{Lu}` inside those subtraction forms, and a QT3-backed block-alias table that now covers the current real `\p{Is...}` QT3 block names from the basic multilingual plane through the supplementary private-use areas; the remaining schema-regex translator gaps are outside that current QT3 block-alias surface.
- The `to` operator now has an initial integer-only range-expression slice.
- `()` and comma-separated parenthesized expressions now have an initial sequence-constructor slice.
- `if (...) then ... else ...` now has an initial flow-expression slice.
- `let $x := ... return ...` now has an initial binding-expression slice with sequential local bindings.
- `for $x in ... return ...` now supports multiple bindings in the initial iteration-expression slice.
- `some $x in ... satisfies ...` and `every $x in ... satisfies ...` now support multiple bindings in the initial quantified-expression slice.
- Value comparison operators `eq ne lt le gt ge` are now distinct from general comparison,
  including a first type-error guard for mismatched singleton operands.
- The `parent` axis is now available via both `..` and `parent::`.
- The `ancestor` and `ancestor-or-self` axes are now available through named axis syntax.
- Node comparison operators `is`, `<<`, and `>>` now work for singleton-node identity and order checks.
- The `following-sibling`, `preceding-sibling`, `following`, and `preceding` axes now work, including reverse-axis predicate ordering.
- The `namespace` axis is now available for in-scope namespace declaration traversal.

**Scope (in):**

- Remaining axes: `parent`, `ancestor`, `ancestor-or-self`, `following`,
  `following-sibling`, `preceding`, `preceding-sibling`, `namespace`
- **Value comparison** (`eq ne lt le gt ge`) + **node comparison** (`is`,
  `<<`, `>>`) alongside general comparison
- Atomization rules; sequence-of-one vs singleton semantics
- Flow expressions: `if/then/else`, `for ... return`, `let ... return`,
  `some/every ... satisfies`
- Range expression `1 to 10`, sequence constructor `(a, b, c)`
- ~40 built-in functions (`fn:` namespace):
  `string, number, boolean, not, count, sum, concat, substring,
string-length, normalize-space, contains, starts-with, ends-with,
upper-case, lower-case, position, last, name, local-name,
node-name, exists, empty, distinct-values, min, max, avg, floor,
ceiling, round, abs, true, false, data, root, tokenize, matches,
replace, string-join, reverse, subsequence, head, tail`
- Function-call AST + overload-resolution-by-arity (SequenceType matching
  is MVP+7; for now, arity only)
- Regex translator (schema-regex → ECMAScript regex) for `matches/replace/tokenize`
- Structured diagnostic details for the common XPath failures in this
  increment (`expectedType`, `actualType`, `functionName`, `axis`,
  context/focus failures) so formatter output is backed by stable fields

**Exit criteria:**

- [x] **20% of QT3 "required" tests passing** (baseline real conformance %)
- [x] No comparison operator (`=`, `!=`, `<`, `<=`, `>`, `>=`, `eq`,
      `ne`, `lt`, `le`, `gt`, `ge`, `is`, `<<`, `>>`) lands without:
      at least 3 cross-type tests and at least 1 sequence-based test
- [x] Atomization tests: `1 eq '1'` → type error with clear message,
      not a silent `false`
- [x] `position()` and `last()` inside predicates work correctly against
      nested paths
- [x] Regex translator has its own fixture suite (inputs from W3C regex
      examples, outputs = ECMAScript source strings)
- [x] Error messages show the _subexpression_ that failed, not just the
      whole expression
- [x] Required-detail validation exists for at least the codes the engine
      materially depends on in this slice (`XPTY0004`, `XPST0017`, etc.)

**Completed notes:**

- The curated MVP+2 QT3 slice currently reports `2487/2487` passing under the supported-case gate.
- The broader MVP+2 baseline currently reports `3632/4450` passing (`81.6%`) across 199 included test sets, comfortably clearing the roadmap's 20% bar.
- The tightened support gate intentionally excludes four curated cases that depend on out-of-scope helper/library surface rather than MVP+2 core semantics:
  `ForExpr026` (`for $file (//Folder)[1]/File return $file/FileName`),
  `K-NodeRootFunc-2` (`generate-id()` under `root()`), and
  `K-SubstringFunc-1`/`K-SubstringFunc-2` (`sub-string(...)` typo spellings).
- The QT3 gate now reports structured exclusion reasons, keeps `fn:*` matching case-sensitive to mirror the runtime surface, and exposes optional exclusion snapshots through `QT3_EXCLUSION_DEBUG=1`; see `docs/QT3_GATE.md`.

---

### MVP+3 — XSLT MVP on interpreter (done)

**Goal:** run a real (tiny) invoice stylesheet end-to-end. This is the
first moment `@arakendo/weaver-xslt` does what it says on the tin.

**Scope (in):**

- Stylesheet loader: parse `.xsl` via `@xmldom/xmldom`, emit IR via
  `src/xslt/compile/compiler.ts`
- Priority mini-spec written before template dispatch lands: default
  priority rules, built-in template rules, conflict resolution, and at
  least 3 overlapping-pattern examples captured as executable fixtures
- IR node kinds (plain-data, source-located, versioned — DEC-005):
  `Stylesheet, Template, ApplyTemplates, ValueOf, ForEach, Choose,
When, Otherwise, If, Variable, Param, LiteralResultElement,
LiteralText, Sequence`
- Template dispatch: match-pattern matching, default priority rules,
  built-in template rules (identity-ish default for root + text)
- XPath expressions inside attributes/`select=` are parsed via MVP+2
  engine and source-located back to the stylesheet offset (not just the
  expression offset)
- Output: tree build into a result DOM, then serialized via a basic
  XML serializer (`src/xslt/serialize/xml.ts`) — entities escaped,
  attributes quoted, no pretty-printing required
- Namespace handling (just enough): expanded-QNames for element/attribute
  names; `xmlns` declarations preserved in LREs
- Runtime diagnostic frames and related spans for template, instruction,
  caller chain, and enclosing match/select context
- Golden test harness flips on: `test/golden/hello/` (literal result),
  `test/golden/invoice-simple/` (apply-templates + value-of), others
  expected to grow

**Scope (out):**

- `xsl:mode`, `xsl:key`, `xsl:accumulator`, `xsl:iterate`, `xsl:merge`
- `xsl:import`/`xsl:include` (later — namespace + priority resolution is
  its own project)
- `xsl:number`, `xsl:sort` (deferred to +6 block)
- Output methods other than `xml` (`html`, `text`, `json` deferred)
- Schema-aware anything

**Exit criteria:**

- [x] At least 3 goldens under `test/golden/` pass byte-exact
- [x] Overlapping-pattern and default-priority fixtures exist and are
      named in the priority mini-spec; no "mostly right" dispatch
      behavior ships without those examples going green
- [x] XSLT conformance runner filtered to the supported feature set
      reports a non-trivial pass rate
- [x] A runtime error in an `<xsl:value-of select="...">` prints:
      stylesheet file + line + column, the offending subexpression with
      caret, the enclosing template's match pattern, and a call chain
      back to `apply-templates` (D1 requirement, not a nice-to-have)
- [x] At least one XSLT runtime-failure fixture snapshots the structured
      `DiagnosticReport` including `frames` and `related` spans, not only
      the formatted text
- [x] README has a working "hello world" copy-paste example

**Testing strategy note:**

- MVP+3 XSLT validation should stage in this order: focused smoke/unit tests,
  byte-exact goldens, then a curated `xslt30-test` slice filtered to the
  supported feature set. Do not treat the whole `xslt30-test` catalog as the
  denominator until template dispatch, built-in rules, and the minimal XML
  serializer are stable enough to make the failures interpretable.

**Completed notes:**

- The golden harness now covers `hello`, `value-of-basic`, `invoice-simple`, and the priority fixtures, with the current suite passing `5/5`.
- The priority mini-spec is captured in `docs/TEMPLATE_PRIORITY.md` and names the executable fixtures that anchor the current dispatch behavior.
- The curated XSLT 3.0 MVP+3 conformance slice currently reports `73/73` passing under `test/conformance/xslt30/mvp3.test.ts`.
- Runtime diagnostics now preserve stylesheet frames, related spans, and structured `DiagnosticReport` snapshots for XSLT failures.
- MVP+3 now accepts the minimal `exclude-result-prefixes` behavior needed by the current slice, including namespace suppression on literal result elements.

**This is the MVP.** Everything after this is increments.

---

## MVP+4 — codegen backend v1 (the product) (done)

**Goal:** compile the MVP+3 feature set to readable, debuggable
TypeScript. The interpreter stays; it is no longer the product, it is the
reference. Hazard H3 (codegen exposes every IR mistake) cashes in here —
we should expect to rev the IR whenever codegen exposes a missing semantic.

**Scope (in):**

- `src/xslt/codegen/emit.ts` — pure function `IR → string` (if it needs
  side effects, **fix the IR, not the backend** — mantra)
- Evaluation order, context state, and variable lifetime are treated as
  IR contract problems, not "codegen special cases". If codegen feels
  clever, stop and repair the IR first.
- Generated module shape:
  ```ts
  // invoice.xsl.ts (generated from invoice.xsl)
  import type { TransformContext, XmlWriter } from '@arakendo/weaver-xslt/runtime';
  export const source = { path: 'invoice.xsl', digest: '...' };
  export function transform(input: Document, ctx: TransformContext): string {
    // match="/" (invoice.xsl:1)
    // ...
  }
  ```
- `src/runtime/` — the minimal runtime the generated code imports: XPath
  kernel (re-exported from the interpreter's evaluator core), serializer,
  `TransformContext`. This is what ships alongside generated code.
- Generated runtime helpers reconstruct equivalent structured diagnostics
  rather than collapsing failures to prose-only strings
- JSDoc provenance comments on every dispatch: `/** match="invoice" (invoice.xsl:12) */`
- `test/generated-fixtures/` — generated `.ts` for every golden checked in
  so IR changes surface as PR diffs
- Fixture harness: compiles each golden twice (interpreter, codegen),
  asserts byte-equal output
- Current MVP+4 planner boundary: root-level `xsl:apply-templates` shapes
  may emit native plans, but nested `xsl:apply-templates` inside emitted
  child template bodies currently fall back to the runtime/interpreter path.
  Treat this as an explicit staging boundary until planner context is made
  intentionally recursive.
- Deferred follow-up candidate: recursive native template-dispatch planning.
  If nested `xsl:apply-templates` becomes a meaningful product limitation for
  readability, performance, or debugger fidelity, introduce an explicit
  recursive dispatch-planning increment rather than extending the current
  root-only planner ad hoc.
- CLI stub: `node dist/cli.js compile <file>` writes `<file>.ts`. Not yet
  the shipped CLI, but now real enough to dogfood.

**Exit criteria:**

- [x] Every MVP+3 golden passes under codegen (byte-equal to interpreter)
- [x] Generated fixtures exist and are human-reviewable
- [x] A generated file runs without importing the _compiler_ — only
      `@arakendo/weaver-xslt/runtime`. (Test: delete everything except runtime + generated files in a sandbox, execute, see output.)
- [x] IR version is documented; any IR schema change requires updating
      `src/xslt/compile/ir.ts` version constant
- [x] Diagnostic parity fixtures compare interpreter and codegen
      `DiagnosticReport` values for representative runtime and compile-time
      failures; parity is on structure first, formatter text second
- [x] Sanity check: set a breakpoint in the generated TS in VS Code
      debugger, run `.vscode/launch.json` "Debug Generated Fixture Test",
      breakpoint hits, `ctx` is inspectable

---

## MVP+5 — typed params, typed extension functions, CLI (done)

**Goal:** XSLT becomes a good citizen of the TS ecosystem. The pitch
"call your stylesheet like a typed function" starts working here.

**Scope (in):**

- `.d.ts` emission alongside every `.xsl.ts`. Signatures derived from
  `<xsl:param as="...">` declarations. Mapping:
  `xs:string → string`, `xs:integer → number`, `xs:boolean → boolean`,
  `xs:double → number`, element/document → `Element | Document`, sequences
  → arrays, optional params → optional properties
- Shipped `weaver-xslt` CLI:
  - `weaver-xslt compile <glob>` → writes `.xsl.ts` + `.d.ts` + digest
  - `weaver-xslt run <stylesheet> --input <xml>` → runs via interpreter
  - `weaver-xslt --help` is not garbage
- `defineXsltFunctions('ns', { ... })` — typed extension function
  registration. At compile time, the compiler loads a `functions.ts`
  file (optional, convention-based), reads the TS signatures via the TS
  compiler API, and type-checks calls in the stylesheet against them.
- Mismatched arg types → compile-time diagnostic pointing at the
  stylesheet call site, not the TS file

**Exit criteria:**

- [x] Typed invocation works in a fixture React-ish project (under
      `test/integration/react-app/` — just a tsconfig + one import +
      one call). `tsc` passes on the consumer side.
- [x] Extension-function type-mismatch produces a stylesheet-located
      diagnostic with the `.ts` signature quoted inline
- [x] CLI published as `weaver-xslt` bin entry in `package.json`
- [x] `weaver-xslt compile` is documented in README with a copy-paste
      that works
- [x] Built CLI supports `compile <glob>`, `run <stylesheet> --input
<xml>`, and usable `--help`; end-to-end verification passes
- [x] Packaging dry-run includes `dist/cli.js` as the published bin
      target and the compiled CLI works from `dist/cli.js`

---

## MVP+6 — watch mode + source maps + diagnostics v2 (D5)

**Goal:** the modern-dev-loop pitch becomes real. Without this, D2 and
D3 are theoretical.

Rule of engagement: **watch correctness beats watch speed**. A 500 ms
rebuild that serves stale output or stale diagnostics is a failed increment.

**Scope (in):**

- `weaver-xslt watch <glob>`: chokidar-based, sub-second recompile on
  save, writes outputs atomically, streams diagnostics to stdout in the
  D1 caret format
- Persistent IR cache keyed by `{ path, mtime, digest }` so only changed
  stylesheets recompile
- `.xsl.map` source-map emission so Chrome/VS Code debuggers step through
  the `.xsl`, not the generated `.ts`. Test: breakpoint set on
  `invoice.xsl:42` actually hits
- **Static-analysis pass** (`src/xslt/compile/analyze.ts`), runs on every
  compile, produces diagnostics for:
  - Unreachable templates (another template always matches first)
  - Unused variables / params / templates / modes
  - Priority conflicts (two templates with same priority + overlapping
    patterns)
  - Typos in element/attribute names when a sample document is supplied
    (`prodcut` → `did you mean 'product'?`) — Levenshtein-based
  - Typos in function names against the known `fn:` registry + any
    `defineXsltFunctions` registrations
- Bundler plugins (thin wrappers over the compiler):
  - `@arakendo/weaver-xslt/vite` — `import './invoice.xsl'` works in Vite dev
  - `@arakendo/weaver-xslt/esbuild` — same for esbuild / tsup
- JSON-safe diagnostic projection available for future editor/CLI
  boundaries without inventing a second report contract

**Exit criteria:**

- [x] `weaver-xslt watch` round-trips under 500ms for a 200-line stylesheet
- [x] Watch invalidation fixtures prove that editing a dependency updates
      emitted `.xsl.ts`, `.d.ts`, `.xsl.map`, and diagnostics together;
      no stale-output or stale-diagnostic regressions
- [x] Watch-mode output and any JSON projection originate from the same
      underlying `DiagnosticReport` values; no formatter-specific data loss
- [x] Chrome DevTools shows the `.xsl` in the source tree and stops on
      breakpoints (follow [DEVTOOLS_CHECKLIST.md](./DEVTOOLS_CHECKLIST.md);
      manual verification published via [PROGRESS_ARTIFACTS.md](./PROGRESS_ARTIFACTS.md))
- [x] Each static-analysis rule has a fixture of its own in
      `test/analyze/` with an expected diagnostic
- [x] At least one of the bundler plugins has an integration test

---

## MVP+6.25 — native backend direct execution (done)

**Goal:** make the native backend a first-class in-process render path,
not only the thing that writes `.xsl.ts` files. This is the increment where
"native" becomes an execution strategy in its own right rather than being
defined by emission.

Why here: MVP+4 proved that native planning can emit readable TypeScript, and
MVP+6 hardened diagnostics, watch invalidation, and boundary reporting. The
next useful step is to let the same native plan execute directly in memory so
future workbench and embedding surfaces can choose `interpreter`, `native`, or
`auto` honestly.

**Scope (in):**

- Explicit native execution plan boundary that can be:
  - executed directly in-process, or
  - lowered to emitted TS/JS artifacts
- Resolve the MVP+4 staging limitation where nested `xsl:apply-templates`
  inside emitted child template bodies fall back to the interpreter for the
  current supported slice; recursive native template-dispatch planning becomes
  intentional instead of deferred
- Library-facing compile/run surface for choosing execution strategy on the
  supported slice:
  - `execution: 'interpreter' | 'native' | 'auto'`
  - `auto` is defined as policy, not vibes: native when the requested slice is
    supported, interpreter otherwise, with a structured reason when relevant
  - Opportunity target while this increment is active: surface `auto`
    fallback reasons as first-class warnings/guidance in caller-facing
    tooling so users notice when native was not used and can simplify toward
    the documented supported slice
- Parity fixtures that compare:
  - interpreter execution
  - native direct execution
  - native emitted execution
    on output and structured diagnostics for the MVP+3 through MVP+6 feature set
- Source-map and provenance expectations remain anchored on emitted TS; direct
  native execution does not get to become a second diagnostics dialect or a
  hidden semantic engine

**Scope (out):**

- New XSLT features beyond the existing supported slice
- JIT/bytecode backends, opaque binary plans, or "fast path" semantics that do
  not round-trip through the shared IR/plan model
- Streaming-native execution; that belongs to the separately tracked streaming
  design work, not the active MVP list
- Aggressive auto-selection heuristics for partially supported future features

Scope boundary:
MVP+6.25 closes when representative positional predicate families are covered
across interpreter, native direct, and native emitted paths, and unsupported
native cases are explicit, documented, and actionable. Higher-order nonlinear
apply-templates predicate arithmetic, including cubic or more general multiplied
total-position forms, is deferred to a later native-slice expansion increment.

**Exit criteria:**

- [x] Current goldens for the supported slice pass under interpreter, native
      direct execution, and native emitted execution
- [x] Nested `xsl:apply-templates` on the supported slice no longer depend on
      ad hoc interpreter fallback inside the native path
- [x] Direct native execution and emitted native execution share the same
      semantic plan contracts and produce the same `DiagnosticReport` shape on
      representative failures
- [x] Before closing the increment, run a targeted parity audit for remaining
      interpreter/native direct/native emitted gaps and close or explicitly
      track any representative diagnostic or behavior mismatches that remain
- [x] At least one public API surface exposes explicit execution selection with
      documented `interpreter`, `native`, and `auto` semantics
- [x] A small design note captures what "unsupported under native" means so the
      boundary stays explicit instead of drifting into silent fallback

Working checklist: [NATIVE_EXECUTION_CHECKLIST.md](./NATIVE_EXECUTION_CHECKLIST.md)

Unsupported-native note: [NATIVE_EXECUTION_BOUNDARY.md](./NATIVE_EXECUTION_BOUNDARY.md)

---

## MVP+6.4 — JS renderer artifacts

**Goal:** make the emitted JavaScript renderer a first-class compiler output,
not just something inferred from the generated TypeScript path. This is the
increment where `*.xsl.js` becomes a supported artifact for browser, test, and
host-embedded renderers that want to swap compiled stylesheets by identity.

Why here: MVP+4 proved the codegen backend, MVP+5 gave the CLI surface, and
MVP+6.25 established that emitted TS/JS artifacts are a legitimate execution
target. The next useful step is to separate the compiler's generated TypeScript
renderer from the optional JavaScript renderer artifact and make the latter
explicitly selectable.

**Scope (in):**

- Compile output selection for stylesheet artifacts:
  - `ts` remains the default and continues to write `*.xsl.ts`, `*.d.ts`,
    `*.digest`, and `*.map`
  - `js` emits a transpiled `*.xsl.js` renderer derived from the generated TS
    module
  - `bundle` emits a self-contained `*.xsl.bundle.js` renderer for drop-in use
- Public compile API and CLI support for choosing emit targets without touching
  the built `dist/cli.js` executable directly
- Emission boundary that reuses the already-generated TS module instead of
  recompiling IR a second time
- Parity fixtures that compare interpreter, generated TS, and emitted JS on the
  supported slice, including stable renderer identity and diagnostics
- Host-facing consumption story for loading and swapping multiple compiled JS
  renderers against the same XML input

**Scope (out):**

- New XSLT features or runtime semantics
- Changes to the shared IR/plan contract beyond what the new emit boundary
  requires
- Workbench UI, trace debugging, or debugger protocol work
- Treating the emitted JS artifact as a replacement for the CLI executable

**Exit criteria:**

- [ ] `compile --emit js` writes a `*.xsl.js` artifact next to the stylesheet
      and leaves the default `ts` path unchanged
- [ ] `compile --emit bundle` produces a self-contained renderer artifact that
      can be loaded and run without invoking the CLI or installing the package
- [ ] The emitted JS artifact exposes the same stable renderer contract as the
      generated TS module, including source identity and transform entrypoints
- [ ] Representative parity fixtures cover interpreter, generated TS, and
      emitted JS outputs for the supported slice
- [ ] The architecture and roadmap docs describe the JS emission boundary and
      where it sits in the compile pipeline

Working checklist: [JS_RENDERER_ARTIFACTS.md](./JS_RENDERER_ARTIFACTS.md)

---

## MVP+6.5 — live workbench / playground

**Goal:** make the product thesis visible. A user can edit source XML and
XSLT, inspect the generated TypeScript, and see output + diagnostics update
from the same structured compile/run pipeline.

Entry gate: do not start this increment until MVP+4 through MVP+6.25 have
delivered readable native emission, direct native execution, source maps,
watch correctness, and stable boundary diagnostics. The workbench is a
consumer of those foundations, not an excuse to build them halfway.

**Scope (in):**

- Browser- and in-memory-friendly compile/run boundary that does not require
  filesystem assumptions for the core loop:
  - source documents identified by URI + text
  - compile result returns structured diagnostics and any available
    inspectable artifacts (`generatedTs`, reusable compiled handle,
    source-map handle)
  - transform result returns output plus the same `DiagnosticReport` contract
  - execution selection is consumed from the shared engine surface rather than
    invented inside the UI
  - callers can choose either one-shot `compileAndTransform(...)` or explicit
    compile-once reuse via `compile(...) -> CompiledStylesheet -> transform(...)`
- Minimal four-pane workbench shell:
  - editable source XML pane
  - editable XSLT pane
  - read-only generated TypeScript pane
  - live output + diagnostics pane
  - a small preset selector that can prefill the XML + XSLT panes with
    editable starter examples
- Debounced compile-and-run loop driven by the same engine surfaces used by
  the CLI/watch path; no second compiler, no UI-only diagnostic format
- Linked highlighting v1 for the spans we already own:
  - diagnostic -> XSLT
  - XSLT instruction/expression -> generated TS span when source maps exist
- Plain prototype UI is acceptable; Monaco/editor polish is explicitly not
  the point of this increment

**Scope (out):**

- Editable generated TS
- Step debugger / trace timeline / output-to-source mapping
- Shareable playground URLs, full examples gallery, multi-file workspace UX
- Executing user-generated TS in the main page or with ambient I/O

**Exit criteria:**

- [x] Workbench demo runs entirely from in-memory XML/XSLT sources; no local
      files required for the core loop
- [x] Editing either XML or XSLT updates diagnostics and output from the same
      underlying compile/run surfaces used by non-UI entry points
- [x] The host offers at least a small preset selector that hydrates both XML
      and XSLT panes with editable starter content
- [x] Workbench API supports both one-shot execution and repeated transforms
      through a reusable compiled handle
- [x] Generated TS pane shows the emitted `.xsl.ts` for a successful compile
      and remains read-only
- [x] At least one linked-highlighting fixture proves that selecting an
      XSLT span can reveal the corresponding generated TS span
- [x] Browser execution, if used for generated code, is sandboxed in a worker
      or equivalent isolated boundary; no `eval()` in the main page
- [x] A small public design note or README section demonstrates the four-pane
      loop with a copy-pasteable example

**Completed notes:**

- The engine-side workbench boundary now supports one-shot execution,
  reusable compiled handles, generated TypeScript artifacts, structured source
  maps, and structured notices for embedders.
- The first public worker-backed workbench is live on `weaverxslt.org` at
  [WORKBENCH.md](./WORKBENCH.md), with editable XML/XSLT panes, a read-only
  generated TypeScript pane, visible output/diagnostics, and three starter
  presets.
- Public milestone proof now exists both as the live page and as linked
  supporting media under [PROGRESS_ARTIFACTS.md](./PROGRESS_ARTIFACTS.md).

Design note: [WORKBENCH_API.md](./WORKBENCH_API.md) defines the Weaver-side
engine contract for this increment. The first public host is expected to be an
embed on `weaverxslt.org`; this repo still owns the engine boundary rather
than page-specific UI code.

---

## MVP+6.75 — XML node trace debugging

**Goal:** let a host pause on an actual input XML node and inspect where that
node is being processed in the stylesheet. This is runtime trace/debugger work,
not an extension of source maps.

Entry gate: do not start this increment until MVP+6.25 and MVP+6.5 have landed.
It depends on both a shared native execution boundary and a host/workbench-style
compile/run boundary that can render pause state.

**Scope (in):**

- Stable runtime identity for input XML nodes during a transform session
- Engine-owned trace event model for meaningful node-processing events such as:
  - node becomes current focus
  - node enters a matched template
  - node is selected by an instruction
  - node is read by `xsl:value-of` / string-value extraction
- Host-facing breakpoint predicates over node identity and event kind, so a
  caller can ask to pause on a specific `<para>` or similar node
- Pause payload includes the observed node, current template/instruction
  provenance, and stack-like frames suitable for a workbench host
- Parity coverage across:
  - interpreter execution
  - native direct execution
  - native emitted execution

**Scope (out):**

- Treating XML as executable source in browser or VS Code debuggers
- Full debugger-protocol integration
- Reverse stepping / time-travel debugging
- Full output-to-input lineage for every emitted character
- Arbitrary conditional breakpoint expression languages

**Exit criteria:**

- [x] A fixture host can identify an input node and pause when that node enters
      a matched template or becomes the current focus
- [x] The pause payload includes the node identity plus template/instruction
      provenance anchored on existing span/frame contracts
- [x] The same tracked-node fixture produces equivalent pause semantics under
      interpreter, native direct, and native emitted execution
- [x] At least one public design note documents why XML-node breakpoints are a
      trace/debugging feature rather than a source-map feature
- [x] A small demo or fixture proves the user story: "track this `<para>` node
      through the transform"

Design note: [XML_NODE_DEBUGGING.md](./XML_NODE_DEBUGGING.md) defines the
engine-side contract and placement rationale for this increment.

---

## MVP+7 — XPath type system + maps + arrays + higher-order

**Goal:** close the XPath 3.1 feature gap that the MVP skipped. This is
XPath maturity work; XSLT-visible features are mostly additive.

Entry gate: do not start this increment while MVP+4 through MVP+6 still
have unresolved parity bugs, stale-watch bugs, or diagnostic regressions.
This increment is a brain-burner already; it does not get to coexist with
foundational instability.

**Scope (in):**

- `cast as`, `castable as`, `instance of` with full SequenceType grammar
- Numeric type tower: `xs:integer`, `xs:decimal`, `xs:double`,
  `xs:float`, with the full promotion/subtype rules (and the diagnostics
  that make getting them wrong understandable)
- Maps: `map { 'k': 'v' }`, `map:get`, `map:put`, `map:keys`, etc.
- Arrays: `[1, 2, 3]`, `array:get`, `array:size`, etc.
- Higher-order functions: function items, `function(...) { ... }`
  inline functions, function-reference `fn-name#1`, `fold-left`,
  `fold-right`, `for-each`, `filter`, `sort`
- SequenceType-based overload resolution (upgrades MVP+2's arity-only
  resolution)
- Full `fn:*` library: all ~220 functions defined by XPath/XQuery 3.1 F&O

**Exit criteria:**

- [ ] QT3 pass rate ≥60% on the required tests
- [ ] SequenceType errors produce diagnostics naming the expected and
      actual sequence types with occurrence indicators (`*`, `+`, `?`)
- [ ] Map + array examples work end-to-end in a golden test

---

## MVP+8 — XSLT 3.0 feature-complete (non-streaming)

**Goal:** the engine is actually an XSLT 3.0 engine, not an MVP subset.

**Scope (in):**

- `xsl:mode` (declared modes, on-no-match, visibility)
- `xsl:key` + `fn:key()` — with indexed lookup, not naive scan
- `xsl:accumulator` + `fn:accumulator-before/after`
- `xsl:iterate` + `xsl:next-iteration` + `xsl:break`
- `xsl:merge`
- `xsl:number` (count, from, level, format)
- `xsl:sort` (full collation-aware implementation later, stable sort now)
- `xsl:import` + `xsl:include` with precedence resolution
- `xsl:import-schema` — parse-only, no validation (still non-goal)
- Packages: `xsl:package`, `xsl:use-package`, visibility attributes
- Output methods: `xml`, `html`, `text`, `json`
- Serialization parameters: `indent`, `omit-xml-declaration`, `encoding`,
  `doctype-public/system`, `cdata-section-elements`

**Exit criteria:**

- [ ] All features pass conformance tests **under both backends**
- [ ] IR additions are documented with IR version bump
- [ ] Generated code for `xsl:iterate` is still readable (if not, hazard H3
      is screaming — fix the IR)

---

## MVP+9 — conformance push

**Goal:** credibility. An honest, publicly-reported conformance number.

**Scope (in):**

- Conformance dashboard: per-category pass rate (XPath / XSLT /
  serialization / patterns), published to a GitHub Pages site
- Failure triage: every skipped/failing test tagged with a reason code
  (`unimplemented-feature`, `spec-ambiguity`, `bug`, `harness-issue`)
- Focused bug-fix sweeps driven by the dashboard, not by vibes

**Exit criteria:**

- [ ] ≥70% of XSLT 3.0 required tests passing under **both** backends
- [ ] ≥80% of QT3 required tests passing under both backends
- [ ] Zero "unknown failure" — every failing test has a tagged reason
- [ ] Public dashboard live at `weaverxslt.org` (or equivalent)

---

## MVP+9.75 — WeaverPDF v1

**Goal:** start the Markdown-first PDF lane with a bounded renderer that proves
the owned document/layout architecture without taking on FO or the whole EzPDF
feature surface.

Placement note: this increment is intentionally later than the core XSLT
conformance push and earlier than the streaming execution-model work. If a
small XSD preflight slice lands in the same band, it should land before this
increment.

**Scope (in):**

- Markdown-first input focused on ordinary GitHub-flavored Markdown:
  headings, paragraphs, emphasis/strong/delete, inline code, fenced code
  blocks, blockquotes, ordered/unordered lists, links, images, thematic
  breaks, and GFM tables
- Engine-owned normalization boundary:
  - Markdown parser output normalized into a WeaverPDF document AST rather than
    letting third-party parser nodes become the renderer contract
  - document AST lowered into a layout IR that captures block flow, text runs,
    image sizing constraints, and table measurement facts
- Single-column paged layout v1:
  - one page size per document
  - one margin box per document
  - overflow-driven page breaks
  - readable default theme for body text, headings, links, code blocks,
    blockquotes, images, and tables
- Diagnostics for the bounded slice:
  - unsupported non-v1 constructs surfaced explicitly during normalization
  - missing local image resources reported as diagnostics rather than opaque
    renderer failures

**Scope (out):**

- WeaverFO / XSL-FO input
- full EzPDF syntax parity
- custom block directives and authoring sugar beyond plain Markdown
- variables, loops, anchors, cross-references, and dynamic placeholders
- directive tables / YAML-driven advanced tables
- multi-column layout, foldouts, blank-page parity control, advanced headers
  and footers, and other page-composition features

**Exit criteria:**

- [ ] A normal GitHub-style README fixture renders cleanly to PDF
- [ ] A small technical note with lists, code blocks, images, and a GFM table
      renders predictably across golden fixtures
- [ ] The implementation owns a document AST and layout IR in-tree; no direct
      rendering from third-party parser nodes
- [ ] Unsupported non-v1 constructs produce clear diagnostics rather than ad
      hoc fallback behavior
- [ ] At least one public design note documents the WeaverPDF/WeaverFO split,
      the v1 scope boundary, and the owned AST/IR contracts

Design notes: [WEAVERPDF.md](./WEAVERPDF.md),
[WEAVERPDF_V1.md](./WEAVERPDF_V1.md), and
[WEAVERPDF_ARCHITECTURE.md](./WEAVERPDF_ARCHITECTURE.md) define the naming,
scope, and engine contract for this increment.

---

## Tracked Later — practical streaming subset

Streaming remains a tracked-later design, not a currently committed MVP
increment.

Why it is tracked:

- it is relevant for very large XML workloads
- the engine architecture should not preclude it
- it is a meaningful future differentiator if Weaver can explain streaming
  violations well

Why it is not on the MVP list right now:

- the semantics are execution-model-heavy and deserve focused design work
- the first useful slice is narrower than "full streaming support"
- we do not want to commit to a specific milestone until there is a concrete
  need and room in the roadmap

Current design direction:

- practical forward-only subset
- explicit opt-in
- interpreter-first
- diagnostics-first

Design note: [STREAMING.md](./STREAMING.md) tracks the current direction.

---

## MVP+11 — `<ts:eval>` escape hatch (gated)

**Goal:** D4, finally, with discipline intact.

**Scope (in):**

- `features: { tsEval: true }` required at compile time; default off
- `<ts:eval>` body parsed as TypeScript via `typescript` compiler API,
  type-checked against a generated `ctx` type derived from stylesheet
  params + visible variables + the narrow runtime surface
- Body inlined into generated code with source-map fidelity — breakpoints
  set in the `<ts:eval>` block work in DevTools
- Lint warning when `<ts:eval>` content volume exceeds a configurable
  ratio of total stylesheet content (default 25%)
- Deliberate non-features: no `ctx.applyTemplates`, no
  `ctx.compileXPath`, no template dispatch inside `<ts:eval>`

**Exit criteria:**

- [ ] Type errors inside `<ts:eval>` surface with stylesheet location
- [ ] A golden where `<ts:eval>` calls `Intl.NumberFormat` and round-trips
      under both backends (codegen-native; interpreter invokes via a
      `new Function`-free host shim)
- [ ] Over-use lint has its own fixture
- [ ] README and DIFFERENTIATORS both link the D4 discipline section

---

## MVP+12 — polish, performance, 1.0

**Goal:** earn the right to say `1.0`.

**Scope (in):**

- Performance pass: microbenchmarks for XPath evaluator hot paths,
  codegen output tightening (dead-code elimination, constant folding in
  the IR, predicate-to-index hoisting for `xsl:key`)
- Documentation site: generated from `.md` sources + TypeDoc for the
  runtime API
- Migration guide for Saxon-JS users (side-by-side comparison, call-out
  of differences — _not_ a compat promise)
- `xsl:evaluate` under interpreter backend only, documented as such
- Semantic versioning commitment formalized in `VERSIONING.md`
- `1.0.0` published to npm under the `@arakendo/weaver-xslt` scope

**Exit criteria:**

- [ ] Docs site live
- [ ] Performance regression CI in place (bench results tracked commit-over-commit)
- [ ] Public 1.0 announcement ready (blog post, whatever channel)
- [ ] A real-world stylesheet we did not write compiles cleanly, passes,
      and the user can step through it in DevTools

---

## Review checkpoints

Between each increment, a short retrospective (one doc paragraph is fine):

1. Which hazards (H1–H4) got closer? Which got worse?
2. Did the IR change? If yes, bump version and note why.
3. What got deferred? Add to scope-creep log.
4. Did any diagnostic regress? If yes, stop and fix before the next
   increment starts.
5. Did any semantic boundary weaken? Check against
   [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md): lexical vs
   resolved identity, plain contract objects vs overlays/plans,
   relation-type separation, and interpreter/codegen parity.

The roadmap is updated as we go. An increment's exit criteria are not
edited downward during the increment — only between increments, and only
with a recorded reason.

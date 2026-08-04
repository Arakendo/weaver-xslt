# XPath — implementation strategy

> How we intend to build the XPath 3.1 engine that underpins Weaver.
> This is an implementation strategy document, not a second architecture
> doc and not a substitute for the spec.

This document complements [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md), especially
DEC-003 through DEC-009, [Weaver Roadmap](../Plans/Weaver%20Roadmap.md), especially MVP+1,
MVP+2, and MVP+7, [Weaver Error Design Document](Weaver%20Error%20Design%20Document.md) for the diagnostics
contract, and [Weaver Semantic Boundary Specification](Weaver%20Semantic%20Boundary%20Specification.md) for the
cross-cutting rule that lexical form, resolved identity, focus/context,
and comparison-family meaning must stay explicit.

Why this exists:

- XPath is where most of the semantic risk lives.
- XSLT design choices will drift if the XPath implementation shape is vague.
- Early decisions about sequences, focus, node identity, spans, and
  function dispatch affect interpreter, codegen, diagnostics, and watch
  mode.

## Goals

- Build an owned XPath 3.1 engine under `src/xpath/` with no external
  XPath runtime dependency.
- Establish semantic correctness on the interpreter before leaning on
  codegen.
- Preserve enough structure for good diagnostics, future static analysis,
  and codegen parity.
- Keep the implementation staged so M1, M2, and M7 remain distinct
  delivery tiers rather than one giant "XPath project" blob.

## Non-goals

- Full XPath 3.1 conformance on day one.
- A parser-generator-based frontend.
- An optimizer-first design that sacrifices inspectability.
- Pulling SequenceType-heavy or higher-order semantics forward just
  because an isolated operator looks easy.
- Backend-specific XPath semantics.

## Core stance

We are not "adding a little query language" to XSLT. We are building a
real XPath engine whose semantics must survive two backends and later
streaming constraints.

That implies a few hard rules:

1. Parser and evaluator are owned in-tree.
2. Interpreter establishes meaning first; codegen must match it.
3. Diagnostics are first-class behavior, not error-message cleanup.
4. Sequence behavior is owned by the engine, not inherited accidentally
   from JS arrays or iterables.
5. If codegen or XSLT integration needs special XPath cases, the XPath
   model is probably missing a concept.

## High-level pipeline

For a standalone XPath expression, the intended flow is:

```txt
source text
  -> lexer
  -> parser
  -> XPath AST
  -> semantic preparation pass
  -> evaluator or codegen-facing lowering
```

For XPath inside XSLT, the intended flow is:

```txt
stylesheet parse
  -> XSLT compiler sees select/match/test/etc.
  -> embedded XPath parsed once
  -> XPath AST stored in StylesheetIR
  -> interpreter/codegen consume the same embedded tree
```

Non-negotiable rule: XPath inside stylesheets is parsed once at compile
time. No re-parsing of the same expression during runtime transform
execution.

The semantic-preparation pass is not actually optional. It is where we
centralize the derived facts that both interpreter and codegen need in
the same way: resolved QNames, function lookup metadata, and later type
hints or constant-foldability. If we let each backend rediscover those
facts differently, we are choosing parity bugs on purpose.

## Frontend shape

### Lexer

The lexer is hand-written and context-aware only where XPath genuinely
needs it.

Requirements:

- Every token carries a full `SourceSpan` compatible with [Weaver Error Design Document](Weaver%20Error%20Design%20Document.md).
- Tokenization preserves enough distinction for later semantics.
- Invalid characters and malformed literals fail with W3C-coded,
  span-rich diagnostics.

Important rule: do not collapse semantically different operators into one
generic token family if the downstream evaluator needs the distinction.

Examples:

- `=` is not `eq`
- `is` is not either of those
- `/` and `//` are not interchangeable syntax sugar internally

### Parser

Parser style is fixed by architecture:

- recursive descent for path and statement structure
- Pratt parsing for precedence-heavy expressions
- hand-written AST as discriminated unions

AST design rules:

- every node carries a full `SourceSpan`
- node kinds remain explicit where semantics differ
- syntax that implies different evaluation rules should remain distinct
  in the AST rather than being flattened too early

That last point matters for comparison operators, quantified
expressions, function calls, inline functions later, and path-vs-value
expression boundaries.

## Expression model

The XPath engine needs two related but distinct representations:

1. **Surface AST**: syntax-faithful enough for diagnostics and review.
2. **Derived runtime/codegen views**: analyzed overlays that add
   resolved names, cached function lookup, or other derived facts.

Do not mutate AST nodes into backend-specific bags of state. If the
interpreter or codegen needs extra derived data, attach it in a plan or
overlay structure keyed by AST identity or by the containing IR node.

This mirrors the broader IR rule in [Weaver Software Design Document](Weaver%20Software%20Design%20Document.md):
plain data is the contract; execution helpers live beside it, not inside
it.

### Semantic preparation layer

The minimum intended output of semantic preparation is:

- lexical QName retained for diagnostics
- resolved QName retained for runtime/codegen identity
- function call sites annotated with candidate signature metadata
- constant-foldability or purity hints only when they are obviously safe

This layer is deliberately "semantic preparation," not a grab-bag
optimizer pass. Its job is to make interpreter and codegen start from the
same resolved meaning.

## Context model

XPath correctness depends heavily on distinguishing static context from
dynamic context.

### Static context

At minimum, we should model:

- namespace bindings
- default element namespace
- function registry
- in-scope variable names
- base URI
- default collation

Later tiers add more type information, but the structure should exist
early so we do not need to redesign all call sites when M7 arrives.

### Dynamic context

At minimum, we should model:

- context item
- context position
- context size
- variable bindings
- current date/time and implicit timezone when needed by F&O

Focus rule: operations that change focus must do so explicitly. If an
evaluation path implicitly loses track of item/position/size, bugs will
surface as "almost right" predicate behavior and broken `position()` /
`last()` semantics.

Implementation rule: evaluator entry points and helpers should pass focus
explicitly in their signatures. The intended shape is closer to:

```ts
evaluate(expression, context, focus)
```

than to hidden mutable evaluator state or implicit closure capture. If a
predicate or nested path needs a different focus, that transition should
be visible in code.

## Sequence model

XPath sequences are load-bearing enough that they deserve their own
implementation policy, not just a container type alias.

The engine-owned `Sequence` abstraction should provide:

- stable iteration semantics
- explicit materialization when semantics require it
- helpers for focus-sensitive operations
- document-order-aware node handling
- duplicate preservation or elimination according to XPath rules

Do not use raw JS arrays as the semantic model, and do not expose naked
JS iterables as the public internal boundary. Both are too easy to misuse:

- arrays encourage eager materialization everywhere
- iterables make replay and `last()` behavior too fragile

### Early rule that affects other layers

Anything that consumes XPath results from XSLT should consume `Sequence`,
not assume `XdmItem[]` or `Iterable<XdmItem>`. If that boundary stays weak,
we will re-fight sequence semantics in every layer.

## XDM and node identity

XPath does not operate on raw DOM nodes directly. It operates on XDM
items, and node identity semantics matter.

Rules:

- DOM is wrapped through the XDM adapter boundary.
- Wrapper identity is canonical per underlying DOM node.
- Node comparisons (`is`) and duplicate-sensitive operations depend on
  that canonical identity.
- The adapter may cache derived values lazily, assuming the underlying
  DOM is stable once wrapped.

Mechanism choice: wrapper identity is implemented through one factory /
cache boundary, typically a `WeakMap<Node, XdmNode>` plus a
`getOrCreateWrapper(domNode)`-style helper. Ad hoc wrapper construction in
random evaluator paths is forbidden.

If the same DOM node can yield two different wrappers, the XPath engine
will lie about node identity and document-order-sensitive operations.

## Semantic danger zones

These are the areas most likely to poison everything above them if they
are only "mostly right."

### 1. Focus-sensitive evaluation

This includes:

- `.`
- predicates
- path steps
- `position()`
- `last()`
- quantified expressions later

Rule: focus changes are explicit in evaluator code and test coverage.
Any helper that silently captures or reuses outer focus is suspect.

### 2. Sequences, singletons, and atomization

This is the first real semantic trap.

We need explicit behavior for:

- sequence-of-one vs singleton expectations
- atomization of nodes and arrays/maps later
- effective boolean value
- numeric extraction vs string extraction vs type error

Rule: if the evaluator "just coerces" without a named spec reason, it is
probably wrong.

### 3. Comparison families

XPath has multiple comparison models with overlapping syntax:

- general comparison: `= != < <= > >=`
- value comparison: `eq ne lt le gt ge`
- node comparison: `is << >>`

These should not share one vague implementation path.

Implementation rule: represent comparison family explicitly and test each
operator with cross-type and sequence-based cases before considering it
landed.

Stricter early rule: do not begin with one "smart" `compare(a, b, mode)`
abstraction that handles all three families. Separate evaluator paths are
preferred, even if that duplicates some local mechanics, until the shared
behavior is proven rather than guessed.

### 4. Numeric tower and promotion

Even before full M7 typing, the evaluator needs a coherent story for:

- `xs:integer`
- `xs:decimal`
- `xs:double`
- promotion across them

M1 can be intentionally narrower, but the design should leave room for a
real numeric model rather than hard-coding "everything is JS number"
throughout the engine.

Implementation rule: even before arbitrary precision arrives, numeric
evaluation should flow through a thin engine-owned value model rather than
raw JS numbers everywhere. A minimal early shape like
`{ kind: 'integer' | 'decimal' | 'double', value: number }` is enough to
prevent JS-number assumptions from leaking into every operator.

### 5. Function dispatch

Function calls look simple and are not.

We need a registry that can eventually support:

- QName identity
- arity lookup
- SequenceType-based overload resolution later
- metadata for diagnostics
- metadata for codegen parity

The registry should centralize:

- overload storage grouped by resolved function QName
- dispatch by family, then arity, then later SequenceType
- one failure path for "unknown function" vs "known function, wrong
  arity" vs "known overload set, no compatible signature"
- signature text and structured metadata suitable for diagnostics

Rule: function implementations and function signatures should not be the
same object if that makes static reasoning harder. Signature metadata is
part of the compiler surface.

### 6. QName and namespace resolution

XPath names are not raw strings once namespaces enter.

We should normalize toward an internal QName shape early enough that:

- diagnostics can name the original lexical form
- evaluator lookups can use resolved identity
- codegen does not invent a second name-resolution path

Chosen direction: parse preserves lexical form; semantic preparation
resolves to an internal QName shape once namespace bindings are available.
That keeps the parser simpler while still ensuring that resolution
happens in one central place rather than three drifting ones.

### 7. Regex and collation boundaries

XPath regex and collation semantics are not identical to JS behavior.

Rules already pinned elsewhere still matter here:

- regex goes through a translator layer
- default collation is Unicode codepoint until we intentionally expand it

No feature should silently "just use JS regex" or locale-sensitive string
comparison without passing through these boundaries.

## Recommended module ownership

The current architecture already gives most of the shape:

```txt
src/xpath/
  lex/
  parse/
  eval/
  fn/
  regex/
  types/
```

Recommended responsibilities:

- `lex/`: token kinds, span-carrying tokens, lexical helpers
- `parse/`: AST, Pratt machinery, parse entry points, syntax diagnostics
- `analyze/` or a similar overlay module, when justified: semantic
  preparation, resolved names, call-site metadata, and safe derived facts
- `eval/`: dynamic context, focus, evaluator, expression-step semantics
- `fn/`: function registry, signature metadata, implementation modules by area
- `regex/`: schema-regex translation boundary
- `types/`: SequenceType parsing, casting, promotion, subtype logic

We do not need the `analyze/` folder on day one, but we do need the
concept on day one. Once semantic preparation has more than a handful of
resolved-name and call-site helpers, give it a real module instead of
hiding it inside parser or evaluator utilities.

## Delivery tiers

### M1 — vertical slice

What lands:

- arithmetic
- basic path navigation
- predicates
- context item
- source spans everywhere
- formatter-backed diagnostics

What does not:

- broad coercion rules
- function library
- full comparison semantics
- namespace-heavy behavior
- M7 type-system semantics

Success condition: the slice works end-to-end, QT3 is already in the loop,
and diagnostics look like product behavior rather than thrown strings.

### M2 — core XPath on interpreter

What expands:

- remaining axes
- comparison families
- atomization rules
- core flow expressions
- first meaningful built-in function set
- regex translation boundary

Success condition: QT3 becomes the daily scoreboard and catches semantic
drift faster than feature enthusiasm can create it.

### M7 — type system, maps, arrays, higher-order

This is a distinct effort, not a cleanup pass.

What expands:

- SequenceType grammar
- `cast as`, `castable as`, `instance of`
- full numeric promotion/subtyping story
- maps and arrays
- higher-order functions
- SequenceType-based overload resolution

Rule: do not leak M7 semantics backward into M2 one operator at a time.

## Testing strategy

XPath needs more than unit tests.

### Unit tests

Use them for:

- lexing edge cases
- parser precedence and node-shape assertions
- sequence helpers
- focused function behavior
- diagnostic formatting and invariant checks

### QT3 conformance

QT3 is the daily scoreboard for semantic correctness.

Rules:

- run filtered QT3 slices as soon as features exist
- publish real pass rates, not "skipped for now" optimism
- treat unexpected regressions as blockers, not background noise

### Parity tests

Once codegen exists, representative XPath failures and successes should
be compared across interpreter and generated code. Output parity alone is
not enough; structured diagnostics matter too.

### Targeted semantic tests

Some areas deserve explicit "do not regress" suites even if QT3 also
covers them:

- comparison families
- focus-sensitive predicates
- node identity
- atomization
- function dispatch diagnostics

## Early decisions that should inform the rest of the system

These are the XPath choices most likely to ripple outward.

1. **AST nodes keep full spans.** This informs XSLT compile-time embedding,
   diagnostics, source maps, and editor tooling.
2. **Sequence is a real abstraction.** This informs XSLT runtime helpers,
   function implementations, and future streaming restrictions.
3. **Function signatures are metadata, not just implementation shapes.**
   This informs typed extension functions, compile-time checking, and
   codegen parity.
4. **Canonical node wrappers are mandatory.** This informs the XDM layer,
  deduplication logic, node comparison, and document order. The
  factory/cache mechanism must be centralized early.
5. **Static and dynamic context stay separate.** This informs evaluator
   APIs, compiler embedding, and later type-system work.
6. **Comparison families stay distinct.** This informs AST shape,
   evaluator structure, diagnostics, and test planning.
7. **Semantic preparation is mandatory.** This informs QName resolution,
  function dispatch, parity, and any future optimization work.

## Open design questions worth resolving deliberately

These do not block M1, but they should be answered deliberately rather
than by accident in scattered commits.

1. When do we introduce arbitrary-precision handling for `xs:integer`,
   and how isolated is that boundary from the rest of numeric evaluation?
2. How small can the early function registry be while still having the
   right long-term shape for metadata, signatures, and diagnostics?
3. How much early semantic preparation output do we want to persist in
  snapshots or debug tooling once overlay structures exist?

## Litmus tests

The XPath implementation is on the right track if these stay true:

- adding a function does not require backend-specific semantic branches
- diagnostics can point to the exact offending subexpression
- `position()` and `last()` behavior is explainable from the evaluator,
  not folklore
- codegen can reuse the same semantic decisions rather than reverse-
  engineering the interpreter
- QT3 failures teach us something specific instead of exposing a vague
  "coercion problem"

The XPath implementation is off-track if any of these become common:

- raw JS iterables leaking across subsystem boundaries
- AST nodes losing spans or resolved-name provenance
- one helper quietly handling general, value, and node comparisons alike
- function signatures living only in prose or only inside implementations
- XSLT code needing to know too much about XPath evaluator internals

This doc should evolve when we learn something structural, not every time
we add one operator or function.
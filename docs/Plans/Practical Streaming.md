# Practical Streaming

This note tracks Weaver's intended streaming direction without committing it to
the active MVP list.

The short version:

- streaming matters for very large XML inputs
- the first slice should be a practical forward-only subset, not full XSLT 3.0
  streamability analysis
- the first slice should be interpreter-first
- the real differentiator should be diagnostics that explain why a stylesheet is
  or is not streamable

## Status

Streaming is a tracked-later design, not a currently scheduled MVP increment.

We want to keep the engine architecture compatible with future streaming, but we
do not want the current roadmap to commit to a specific streaming milestone yet.

## Goal

Handle inputs that do not fit comfortably in memory by executing a restricted,
forward-only transform model.

The problem streaming solves is:

```txt
very large XML
  → avoid building the full tree
  → keep memory bounded
```

## Non-goals

The first streaming slice should explicitly avoid:

- full W3C XSLT 3.0 streamability analysis
- full general XPath support in streaming mode
- native/codegen streaming as the first implementation
- silent fallback from invalid streaming stylesheets into non-streaming behavior

## First slice

The first realistic streaming slice should be:

- explicit opt-in
- forward-only
- interpreter-first
- diagnostics-first

### Opt-in model

Do not make streaming implicit.

The caller or stylesheet should have to request it explicitly so unsupported
constructs can produce clear diagnostics instead of surprising behavior changes.

### Interpreter-first

The first slice should live in the interpreter execution model.

Reasoning:

- the hard part is semantics, not emitted code
- the interpreter already owns focus, context, and dynamic execution state
- a native/codegen streaming path would require a much larger state-machine
  design and should wait until the streaming semantics are proven

## Practical restrictions

The initial subset should reject constructs that require backward traversal or
whole-document knowledge.

Representative restrictions:

- no `parent::`
- no `ancestor::`
- no `preceding::` or `preceding-sibling::`
- no `last()`
- no full-document `count(//foo)` style logic
- no patterns or expressions that inherently require revisiting prior nodes

The first version should be intentionally narrow and obvious.

## Diagnostics

Streaming is only interesting in Weaver if it is explainable.

The design target is diagnostics like:

```txt
Streaming violation:
  expression uses preceding-sibling::
  which requires backward traversal

Suggested rewrite:
  accumulate state in xsl:iterate
```

That means the streaming layer should aim to report:

- what construct is illegal in streaming mode
- why it breaks forward-only execution
- where it appears in the stylesheet
- when possible, a practical rewrite direction

## Architecture direction

The streaming path should be treated as a second execution model with shared
semantics, not as a bolt-on optimization.

That suggests a later shape like:

```txt
XML stream
  → event-based input model
  → streaming execution state
  → output writer
```

with the same diagnostics model and shared semantic boundaries used elsewhere in
the engine.

## Later expansion

If the interpreter-first streaming subset proves useful, later work can explore:

- richer streamable expression analysis
- more structured rewrite guidance
- streaming-aware validation interactions
- eventual native/codegen streaming if the semantics justify it

## Decision summary

Streaming remains a tracked-later design.

When Weaver picks it up, the right first move is a practical,
forward-only, interpreter-first subset with strong diagnostics.
# M6.5 Checklist — workbench embed

> Concrete implementation checklist for [Weaver Roadmap](../Plans/Weaver%20Roadmap.md) MVP+6.5.
> This is the host-facing work order for the first public `weaverxslt.org`
> embed. [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md) remains the engine contract,
> and [Workbench Embed](../Plans/Workbench%20Embed.md) remains the public UX note.

## Current status

Current closeout status as of 2026-05-07:

- the in-memory workbench boundary is implemented in code and now supports
  compile, transform, compile-and-transform, reusable compiled stylesheet
  handles, generated TypeScript artifacts, structured source maps, structured
  notices, and linked-highlighting mapping data
- the in-memory workbench compile path is now isolated from the Node-only
  file-based compile helpers, so the workbench surface can be browser-bundled
  without dragging `node:fs` / `node:path` into the default import path
- focused workbench tests now cover compile-time artifacts, compiled-handle
  reuse, native fallback notices, and a source-to-generated round-trip fixture
- the public docs site now documents the first `weaverxslt.org` embed as the
  intended MVP+6.5 host
- the first public preset set is documented and bounded to three editable
  starters: `hello-world`, `parameters-with-defaults`, and
  `apply-templates-flow`
- default startup behavior, responsive layout guidance, and host-owned preset
  behavior are now documented for the embed
- a first worker-backed static-site prototype now exists on the public
  [WORKBENCH.md](../WORKBENCH.md) route, with a host-owned preset manifest,
  debounced edit loop, generated TypeScript pane, output pane, diagnostics,
  notices, and worker-based browser isolation
- the public workbench is now reachable on `weaverxslt.org`
- public milestone proof now exists as both the live page and a supporting GIF
  linked from [Progress Artifacts](Progress%20Artifacts.md)
- the repo-side MVP+6.5 checklist items are now complete; any remaining work is
  optional polish or later-increment scope

## Why this doc exists

M6.5 has two failure modes:

- stop too early at the engine boundary and never ship a visible host
- overbuild the first public embed into a mini-IDE instead of a focused demo

This checklist keeps the increment on the narrow path between those mistakes.

## Increment target

At the end of M6.5, `weaverxslt.org` should host a small public workbench that:

- runs entirely from in-memory XML and XSLT sources
- uses the same engine contract as the CLI, tests, and other entry points
- exposes editable starter presets without turning into a full examples gallery
- shows generated TypeScript as a read-only artifact
- renders output, diagnostics, and notices from the same compile/run loop

## First rule

Do not start by polishing the site shell.

Start by locking one minimal host loop that is visibly correct:

- preset content hydrates both editable panes
- compile/run reacts to edits through the real workbench boundary
- generated TS, output, diagnostics, and notices update together

If that loop is fuzzy, everything after it becomes UI churn over an unstable
behavior model.

## Completed checklist

All items below are now complete and preserved as the implementation record for
MVP+6.5.

### 0. Lock the host-owned preset manifest

- [x] Create a static host manifest with exactly these preset ids:
      - `hello-world`
      - `parameters-with-defaults`
      - `apply-templates-flow`
- [x] Set `hello-world` as the stable default preset
- [x] Store preset content as plain in-memory `uri + text` pairs
- [x] Verify that selecting a preset replaces both editable panes in one step

Outcome:

- the embed never opens on a blank page by accident
- docs, optional screenshots, and default behavior all reference the same
  starting state

### 1. Render the smallest useful public shell

- [x] Render an editable XML pane
- [x] Render an editable XSLT pane
- [x] Render a read-only generated TypeScript pane
- [x] Render an output and diagnostics surface
- [x] Render a small preset selector above or near the editable panes

Outcome:

- the page exposes the complete four-pane loop without pretending to be an IDE

### 2. Wire the live compile-and-run loop

- [x] Hydrate the default preset on initial page load
- [x] Trigger an immediate compile-and-run after preset selection
- [x] Trigger a debounced compile-and-run after XML edits
- [x] Trigger a debounced compile-and-run after XSLT edits
- [x] Update generated TS, output, diagnostics, and notices from the same
      result set

Outcome:

- the visible behavior matches the documented engine boundary
- no UI-only compiler path exists

### 3. Keep generated TS inspection honest

- [x] Make the generated TypeScript pane read-only
- [x] Show successful emitted `.xsl.ts` text directly from the workbench result
- [x] Preserve diagnostics visibility even when no output is available
- [x] Do not allow editing generated TS to flow back into transform semantics

Outcome:

- the generated artifact is inspectable, but the semantic source of truth stays
      with XML + XSLT

### 4. Render diagnostics and notices as first-class host data

- [x] Render `DiagnosticReport` structure rather than scraped formatter text
- [x] Surface native fallback warnings from workbench `notices`
- [x] Keep diagnostics visible when compile succeeds but transform fails
- [x] Keep diagnostics visible when output is empty but not erroneous

Outcome:

- the host demonstrates diagnostics-first design rather than hiding it

### 5. Enforce browser isolation if browser execution is used

- [x] Route browser-side execution through a worker or equivalent isolated
      boundary
- [x] Keep user-generated code out of the main page context
- [x] Avoid ambient filesystem, network, or DOM assumptions inside execution
- [x] Document the chosen isolation boundary near the host implementation

Outcome:

- the public demo stays aligned with the roadmap sandbox requirement

### 6. Land a minimally responsive layout

- [x] Keep XML and XSLT first in the visual order on mobile
- [x] Keep generated TS visibly available on desktop
- [x] Allow generated TS to move later in the stack or behind disclosure on
      smaller screens
- [x] Avoid a cramped fixed grid that makes editing unusable on phones

Outcome:

- the first public host is usable on both desktop and mobile without overdesign

### 7. Publish one piece of public evidence

- [x] Make the live embed publicly reachable on `weaverxslt.org`, or capture at
  least one screenshot / short GIF if the live page is not yet publishable
- [x] Ensure the public proof shows XML, XSLT, generated TS, and output in one
  visible flow, either through the live page itself or supporting media
- [x] Link the live embed or any supporting media from
  [Progress Artifacts](Progress%20Artifacts.md)

Outcome:

- M6.5 has public proof, not just internal intent, and a live hosted demo is
  preferred over derived media when available

## Stop signs

Do not let M6.5 expand into these before the checklist above is green:

- editable generated TypeScript
- large preset libraries
- share URLs or persistence
- multi-file project UX
- trace debugger features
- output-to-source mapping

## Relationship to other docs

- [Weaver Roadmap](../Plans/Weaver%20Roadmap.md): increment scope and exit criteria
- [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md): engine contract and preset content
- [Workbench Embed](../Plans/Workbench%20Embed.md): public host behavior and layout
- [Workbench Evidence Checklist](Workbench%20Evidence%20Checklist.md): live-page or supporting-media capture procedure
- [Progress Artifacts](Progress%20Artifacts.md): public milestone evidence

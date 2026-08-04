# Workbench Embed

> This page describes the first public live-workbench experience planned for
> `weaverxslt.org`. It is about the host UX and public surface, while
> [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md) remains the engine-contract note.

The stable public route intended for the front page is
[WORKBENCH.md](../WORKBENCH.md).

For the concrete M6.5 host work order, see
[Workbench Implementation Record](../Evidence/Workbench%20Implementation%20Record.md).

## Goal

Ship a small public embed that lets users understand Weaver by editing real
XML and XSLT in place, seeing the generated TypeScript artifact, and watching
the output and diagnostics update from the same engine surfaces used by the
CLI and tests.

This is the first public host for MVP+6.5.

## First public shape

The initial embed should stay intentionally small:

- editable XML pane
- editable XSLT pane
- read-only generated TypeScript pane
- output and diagnostics pane
- small preset selector that hydrates both editable panes

The goal is to remove blank-page friction without turning the first embed into
an examples gallery or a full IDE.

## User flow

A user should be able to:

1. land on the page and choose a preset or start from the default preset
2. edit the XML pane and immediately see output and diagnostics update
3. edit the XSLT pane and immediately see output, diagnostics, and generated
   TypeScript update
4. inspect the emitted `.xsl.ts` artifact without editing it
5. switch presets and get a fresh editable starting point

## Preset behavior

Presets are host-owned starter content.
They are not a second compile path and they are not special engine state.

Rules:

- selecting a preset replaces both editable panes
- after hydration, both panes remain fully editable
- presets are static content bundled with the host
- the first public set stays small and obvious

The initial preset set is defined in [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md)
and currently consists of:

- `hello-world`: minimal value extraction and output rendering
- `parameters-with-defaults`: explicit stylesheet configuration with useful
  output even before any extra UI for param editing exists
- `apply-templates-flow`: multi-template rule dispatch and template matching

## Reference host manifest

The embed should be able to ship its starter presets as static host-owned
content. A small manifest shape is enough:

```ts
interface WorkbenchEmbedPreset {
  id: 'hello-world' | 'parameters-with-defaults' | 'apply-templates-flow';
  label: string;
  description: string;
  sourceXml: {
    uri: string;
    text: string;
  };
  stylesheet: {
    uri: string;
    text: string;
  };
}

interface WorkbenchEmbedConfig {
  defaultPresetId: WorkbenchEmbedPreset['id'];
  presets: readonly WorkbenchEmbedPreset[];
}
```

Rules:

- this manifest is bundled with the host and loaded synchronously with the page
- preset content is plain in-memory `uri + text` data, not a special loader
- `defaultPresetId` should be stable so docs and screenshots can reference the
  same first view consistently

## Default startup behavior

The default preset for the first public embed should be `hello-world`.

That means the page should load with:

- the preset selector already set to `hello-world`
- the XML pane already hydrated
- the XSLT pane already hydrated
- generated TypeScript, output, and diagnostics already computed from that
  default content

The page should not open on an empty editor state unless that becomes an
explicit later mode.

## Preset switching behavior

Preset switching should be simple and explicit:

1. selecting a preset replaces both editable panes with that preset's content
2. the workbench reruns compile and transform immediately after hydration
3. generated TypeScript, output, diagnostics, and notices all refresh from the
   new content
4. after that point, the user is editing ordinary in-memory documents again

Unsaved-change prompts or draft preservation are not required for MVP+6.5.

## Responsive layout v1

The first public embed should be usable on both desktop and mobile without
trying to become a full IDE.

Recommended desktop layout:

- XML and XSLT as the primary editable panes
- generated TypeScript visible as a read-only inspection pane
- output and diagnostics visible without leaving the page

Recommended mobile layout:

- stack panes vertically rather than forcing a cramped grid
- keep XML and XSLT first because they are the editable surfaces
- allow generated TypeScript to appear later in the stack or behind a simple
  disclosure control if space is tight

The public demo should optimize for comprehension first, not density.

## Interaction timing

The embed should feel live without compiling on every keystroke boundary.

Recommended behavior:

- edits in XML or XSLT trigger a debounced compile-and-run cycle
- preset selection triggers an immediate compile-and-run cycle
- the generated TypeScript pane updates from the same successful compile result
- diagnostics continue to render even when output is unavailable

The exact debounce interval can still be tuned by the host, but the public
contract should feel responsive rather than batch-oriented.

## Host responsibilities

The embed owns:

- pane layout and responsive behavior
- debounce timing for compile-and-run
- preset UI and pane hydration
- browser worker or equivalent isolation for browser execution
- rendering diagnostics and notices for human consumption

The engine owns:

- compile and transform semantics
- generated TypeScript emission
- source-map-backed linked-highlighting data
- structured diagnostics and notices

## Scope guardrails

Keep the first public embed out of these areas:

- editable generated TypeScript
- save/share URLs
- large preset libraries or examples galleries
- multi-file project UX
- trace debugger or output-to-source mapping
- executing user-generated code in the main page

## Success criteria

The public embed is successful for MVP+6.5 when:

- it runs entirely from in-memory XML and XSLT content
- it demonstrates the same engine contract documented in
  [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md)
- the generated TypeScript pane is visibly useful and inspectable
- at least one preset makes the rule-based XSLT model obvious to a new user
- a user can start from a preset and then freely edit toward their own example
- the live page itself is public enough to serve as milestone evidence without
  requiring a separate GIF, unless supporting media is still useful

## Relationship to other docs

- [Weaver Workbench API Specification](../Specifications/Weaver%20Workbench%20API%20Specification.md): engine boundary and preset content
- [Weaver Roadmap](Weaver%20Roadmap.md): increment scope and exit criteria
- [Workbench Evidence Checklist](../Evidence/Workbench%20Evidence%20Checklist.md): live-page or supporting-media capture procedure
- [XML Node Debugging](XML%20Node%20Debugging.md): later runtime trace work

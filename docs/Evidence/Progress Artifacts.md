# Progress Artifacts

This page is the public index for milestone evidence published on
`weaverxslt.org`.

Use it for small, curated public proof of milestone status or debugging claims.
That proof may be either:

- a live page or embedded demo published on `weaverxslt.org`
- a supporting asset such as a screenshot, GIF, `webm`, or `mp4`

Do not use it as a dumping ground for raw working files.

## Storage convention

Live pages do not need files under `docs/assets/progress/`; they can be linked
directly from this index.

- Put assets under `docs/assets/progress/`
- Prefer `webm` or `mp4` for screen recordings when practical
- Use `gif` only when a simple animated image is enough
- Use stable names like `mvp6-devtools-breakpoint.gif`

Published asset URLs will be under:

```text
https://weaverxslt.org/assets/progress/<file>
```

When the proof is a live page instead of a stored asset, link the page URL
directly from this document.

## Planned evidence

### MVP+6.5 Workbench embed

The public workbench prototype is now live on `weaverxslt.org`, with the GIF
capture retained as supporting media.

Current proof:

- live public page on `weaverxslt.org`
- supporting GIF stored under `docs/assets/progress/`

Live URL:

- [MVP+6.5 Workbench live page](https://weaverxslt.org/WORKBENCH/)

Direct link:

- [MVP+6.5 Workbench verification GIF](../assets/progress/mvp65-workbench-live-page.gif)

Checklist reference:

- [Workbench Evidence Checklist](Workbench%20Evidence%20Checklist.md)

## Current artifacts

### MVP+6.75 XML node trace debugging

MVP+6.75 is currently closed on executable fixture proof rather than GIF or
video media.

Current proof:

- executable workbench fixture coverage for the tracked-node user story in
	`test/workbench.test.ts`
- parity trace coverage across interpreter, native direct, and native emitted
	execution in `test/trace.test.ts`
- public engine-contract note in [XML Node Debugging](../Plans/XML%20Node%20Debugging.md)

The key demonstrated user story is: track a specific input `<para>` node,
pause when that exact node enters a matched template or becomes the current
focus, and surface a structured pause payload with template/instruction
provenance.

### MVP+6.5 Workbench embed

The live public workbench is available here:

- [MVP+6.5 Workbench live page](https://weaverxslt.org/WORKBENCH/)

Supporting media is also stored in-repo for milestone evidence. This GIF shows
the public workbench prototype running with prefilled XML and XSLT, visible
generated TypeScript, and the rendered output pane updating on the same page.

Asset path in repo:

```text
docs/assets/progress/mvp65-workbench-live-page.gif
```

Published URL:

```text
https://weaverxslt.org/assets/progress/mvp65-workbench-live-page.gif
```

Direct link:

- [MVP+6.5 Workbench verification GIF](../assets/progress/mvp65-workbench-live-page.gif)

Preview:

![MVP+6.5 Workbench verification GIF](../assets/progress/mvp65-workbench-live-page.gif)

Checklist reference:

- [Workbench Evidence Checklist](Workbench%20Evidence%20Checklist.md)

### MVP+6 DevTools source-map verification

This GIF shows the full manual acceptance flow from
[Chrome DevTools Verification](Chrome%20DevTools%20Verification.md):

- `demo.xsl` visible in DevTools `Sources`
- breakpoint set on `xsl:value-of`
- render button clicked
- execution pausing on the authored stylesheet line

Asset path in repo:

```text
docs/assets/progress/weaver break point working.gif
```

Published URL:

```text
https://weaverxslt.org/assets/progress/weaver%20break%20point%20working.gif
```

Direct link:

- [MVP+6 DevTools verification GIF](../assets/progress/weaver%20break%20point%20working.gif)

Preview:

![MVP+6 DevTools verification GIF](../assets/progress/weaver%20break%20point%20working.gif)

Checklist reference:

- [Chrome DevTools Verification](Chrome%20DevTools%20Verification.md)
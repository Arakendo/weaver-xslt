# Workbench Evidence Checklist

This is the manual verification and capture procedure for MVP+6.5 public proof.

Use it when either:

- the live workbench page is ready on `weaverxslt.org`, or
- a supporting GIF / screenshot is needed before the live page is published

This checklist complements [Workbench Implementation Record](Workbench%20Implementation%20Record.md),
[Workbench Embed](../Plans/Workbench%20Embed.md), and
[Progress Artifacts](Progress%20Artifacts.md).

## Preferred proof order

Prefer proof in this order:

1. live public page on `weaverxslt.org`
2. short `webm` or `mp4`
3. GIF
4. screenshot only if motion is unnecessary

If the live page is already public and stable, that can satisfy the milestone
evidence requirement by itself. Supporting media is then optional.

## What the proof should show

Whether the proof is a live page or supporting media, it should show one clear
end-to-end flow:

- a visible preset or clearly prefilled starter content
- editable XML
- editable XSLT
- read-only generated TypeScript
- output visible on the same page

If practical, also show diagnostics or notices updating after an edit.

## Recommended default capture flow

Use the `hello-world` preset unless there is a specific reason to demonstrate
another preset.

Recommended sequence:

1. show the workbench page with the default preset loaded
2. show XML and XSLT panes populated
3. show generated TypeScript visible on the page
4. show the output pane with the rendered result
5. make one small XML or XSLT edit and let the page update

That is enough to prove the core MVP+6.5 loop without turning the evidence
into a long product walkthrough.

## Asset naming

If supporting media is captured, store it under `docs/assets/progress/`.

Recommended stable names:

- `mvp65-workbench-live-page.webm`
- `mvp65-workbench-live-page.mp4`
- `mvp65-workbench-live-page.gif`
- `mvp65-workbench-default-preset.png`

## Progress index update

After the live page or supporting media exists:

1. add the live URL or asset link to [Progress Artifacts](Progress%20Artifacts.md)
2. mention whether the proof is the live page itself or supporting media
3. keep the entry short and milestone-scoped

## Pass condition

MVP+6.5 public evidence is sufficient when at least one of the following is true:

- the workbench is publicly reachable on `weaverxslt.org` and visibly shows the
  XML/XSLT/generated-TS/output flow
- a linked supporting asset clearly shows that same flow
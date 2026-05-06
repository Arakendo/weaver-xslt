# Chrome DevTools Checklist

This is the manual verification procedure for the MVP+6 exit criterion:

- Chrome DevTools shows the `.xsl` in the source tree
- breakpoints set in that `.xsl` stop during execution
- public progress evidence includes a short GIF proving the behavior

Use the local fixture in `devtools-fixture/`. Do not improvise a separate app
unless the fixture itself is broken.

## Preconditions

- Run `npm install` at the repo root for the normal repo dependencies.
- The fixture itself uses a pinned `npx vite@7.1.12` invocation, so it does not
  depend on a locally installed `vite` package.
- Use Chrome or Chromium with DevTools source maps enabled.
- Keep the repo checkout on a local filesystem path, not a network share.

## Start the fixture

From the repo root:

```bash
npm run devtools:fixture
```

Expected result:

- Vite serves the fixture at `http://127.0.0.1:4173/`
- the page shows a `Render Transform` button and a rendered `<message>` output

## Verify the source tree

1. Open `http://127.0.0.1:4173/` in Chrome.
2. Open DevTools.
3. Go to `Sources`.
4. In the page source tree, locate `demo.xsl` under the local Vite origin.

Pass condition:

- the original stylesheet file appears as `demo.xsl`, not only generated JS/TS

## Verify breakpoint mapping

1. Open `demo.xsl` in `Sources`.
2. Set a breakpoint on the `<xsl:value-of select="/root/name"/>` line.
3. Return to the page.
4. Click `Render Transform`.

Pass condition:

- execution stops on the breakpoint in `demo.xsl`
- the highlighted paused location is the stylesheet line, not only the emitted JS

## Capture progress evidence

Record a short GIF that shows all of the following in one pass:

1. the `demo.xsl` file visible in Chrome DevTools `Sources`
2. the breakpoint set on the `xsl:value-of` line
3. clicking `Render Transform`
4. DevTools pausing on the `.xsl` breakpoint

Store that GIF under `docs/assets/progress/` and add a link to it from
[PROGRESS_ARTIFACTS.md](./PROGRESS_ARTIFACTS.md). The published asset will then
be available from `weaverxslt.org/assets/progress/...` on the docs site.

## Troubleshooting

- If `demo.xsl` does not appear in `Sources`, confirm the fixture is running via
  `npm run devtools:fixture` rather than a different server.
- If the page fails to load before the server starts, confirm `npx` can fetch
  `vite@7.1.12` from your network environment.
- If the breakpoint never hits, reload the page once after setting it, then
  click `Render Transform` again.
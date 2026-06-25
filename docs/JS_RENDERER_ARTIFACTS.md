# JS Renderer Artifact Emission — Planning Doc

> Status: **proposed**, not yet implemented. This is a planning/design note for
> adding JavaScript artifact emission to the compile pipeline so a compiled
> stylesheet can be delivered as a standalone, swappable renderer.

This doc plans how to add a first-class **JavaScript output mode** to the
compiler and CLI. It is scoped narrowly: it does not add XSLT features, change
runtime semantics, or replace the existing `.xsl.ts` artifact. It adds a new
emission target.

Related design context:

- [ARCHITECTURE.md](./ARCHITECTURE.md) for the public API and emission boundary
- [ROADMAP.md](./ROADMAP.md) for increment placement
- [CODEGEN_FALLBACK_SIZE.md](./CODEGEN_FALLBACK_SIZE.md) for serialized-IR size behavior that affects bundle size
- [NATIVE_EXECUTION_BOUNDARY.md](./NATIVE_EXECUTION_BOUNDARY.md) for what "supported under native" means
- [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md) for host-owned execution policy

## 1. Problem statement

Today the compile pipeline emits a generated **TypeScript** module per
stylesheet (`*.xsl.ts`) plus `*.d.ts`, `*.digest`, and `*.map`. There is no
single JavaScript file that represents a compiled stylesheet and can be handed
to another developer, dropped into a browser, or stored server-side as a
reusable renderer.

What is missing:

- a `*.xsl.js` artifact that is directly loadable/runnable
- optionally, a **self-contained** JS artifact that already includes the runtime
  so it has no install dependency
- a stable invocation contract so a host can hold several of these artifacts and
  **swap renderers on the fly**

The motivating use case: store one compiled JS renderer per stylesheet, and let
users switch which renderer transforms a given XML document so different orgs or
requirements can view the same XML differently.

### What exists today (grounding)

- `compileStylesheetArtifacts(...)` returns `{ module, declaration, digest, sourceMap, diagnostics }`
  where `module` is generated TypeScript ([src/processor/compile.ts](../src/processor/compile.ts#L86)).
- The generated module imports shared helpers from a runtime specifier
  (default `@arakendo/weaver-xslt/runtime`,
  see [src/xslt/codegen/plan.ts](../src/xslt/codegen/plan.ts#L21)).
- The CLI writes the artifact set in `emitCompiledArtifactsFromFile(...)`
  ([src/cli.ts](../src/cli.ts#L536)).
- TypeScript is already a runtime dependency; **esbuild is already a
  devDependency** and is used to bundle the workbench site
  (`build:workbench-site` in [package.json](../package.json)).
- The codegen test helper already proves TS→JS execution works by transpiling
  the generated module with `ts.transpileModule` and injecting the runtime
  through a local `require` shim
  ([test/codegen/compile.support.ts](../test/codegen/compile.support.ts#L90)).

The last point is important: a working transpile-and-run path **already exists
in tests**. This feature productizes that path as a supported output.

## 2. Goals and non-goals

### Goals

- Emit a `*.xsl.js` artifact from the compile/CLI path.
- Offer a **self-contained** bundle flavor for drop-in use with no install.
- Define a stable **renderer contract** so artifacts are swappable at runtime.
- Keep the existing `.xsl.ts` / `.d.ts` / `.digest` / `.map` outputs unchanged.
- Embed the stylesheet `digest` in the JS artifact for identity/versioning.

### Non-goals

- No new XSLT features or runtime semantic changes.
- No change to the shared IR/plan contract.
- No editable round-trip from generated JS back into XSLT.
- The **core engine stays Node-free**; bundling is CLI/tooling-only.
- No ambient `eval`, network, or filesystem access added to the engine; the host
  owns execution sandboxing (see [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md)).

## 3. Artifact flavors

Three candidate output shapes. The first two are in scope for v1; the third is
optional.

| Flavor               | Format                            | Runtime              | Primary use                                                  |
| -------------------- | --------------------------------- | -------------------- | ------------------------------------------------------------ |
| `js`                 | ESM module, runtime kept external | resolved by consumer | bundler/Node consumers that already depend on the package    |
| `js-bundle`          | ESM module, runtime inlined       | self-contained       | drop-in renderer, hand-off to a tester, swappable on the fly |
| `js-iife` (optional) | classic `<script>` global         | self-contained       | plain browser page with no bundler/import map                |

Rationale:

- `js` is the cheapest to produce: transpile the generated TS to JS and keep the
  `import ... from '@arakendo/weaver-xslt/runtime'`. Small file, but the
  consumer must be able to resolve the runtime.
- `js-bundle` is what the **swap-renderers-on-the-fly** use case actually needs:
  one file, no install, identifiable by digest, importable directly.
- `js-iife` is only needed if a host wants `<script src>` with a global and no
  module loader. Defer unless a concrete consumer needs it.

### Size note

The `js-bundle` flavor inlines the runtime and the serialized IR. For large
stylesheets, serialized-IR size dominates (see
[CODEGEN_FALLBACK_SIZE.md](./CODEGEN_FALLBACK_SIZE.md)). Bundles should therefore
be served compressed, and the doc's existing gzip/brotli guidance applies. This
is a delivery concern, not a blocker for emission.

## 4. Where JS emission belongs in the pipeline

JS emission is a **post-codegen transform step**, layered after the existing TS
module is produced. It does not touch IR lowering or codegen.

The emission boundary is the architectural star of this proposal. Everything
above it is compiler logic — shared by all outputs. Everything below it is pure
serialization: different shapes derived from the same already-compiled artifact.

```
parse
   ↓
compose
   ↓
compile IR
   ↓
generate TS module
   ↓
─────────────── emission boundary ───────────────
   ↓                      ↓                  ↓
 .xsl.ts            .xsl.js          .xsl.bundle.js
 (.d.ts / .map)     (runtime         (runtime inlined,
                     external)        self-contained)
```

Because the TS module is already in memory when the CLI writes the artifact set,
JS emission must **not** trigger a second IR compile. It simply reads the
already-produced `module` string and transforms it into additional output files.

Two mechanisms, both using dependencies the repo already has:

1. **`js` flavor** — transpile the generated TS string to JS with the
   TypeScript compiler API (`ts.transpileModule`), the same call already used in
   [test/codegen/compile.support.ts](../test/codegen/compile.support.ts#L90).
   This belongs in a small new module, e.g. `src/processor/emitJs.ts`, so the
   core compiler stays unaware of it.
2. **`js-bundle` flavor** — bundle the transpiled module with esbuild so the
   runtime import is inlined. esbuild is Node/tooling-only and must **not** be
   imported by core engine code. It belongs in a CLI/tooling-scoped module, e.g.
   `src/processor/bundleJs.ts`, invoked only from the CLI and bundler-plugin
   surfaces.

Boundary rules:

- `src/processor/emitJs.ts` may use the TypeScript API (already a dependency).
- `src/processor/bundleJs.ts` may use esbuild but must be imported only from
  CLI/tooling entry points, never from `src/xslt/**` engine code.
- The avoid-fragile-stripping rule: do **not** extend the ad hoc line-based TS
  stripping in [src/vite.ts](../src/vite.ts#L57) for this. Use a real
  transpile so output stays correct as codegen evolves.

## 5. Renderer contract (invocation shape)

Every emitted JS artifact must expose the same stable surface so hosts can treat
artifacts as interchangeable renderers.

Proposed exports for `js` and `js-bundle`:

```ts
// Stable identity for swap/versioning.
export const source: { path: string; digest: string };

// Pure transform entry. xml is text in; result has serialized output + diagnostics.
export function transform(xml: string, ctx?: TransformContext): TransformResult;
```

This matches the existing generated-module shape (`export const source`,
`export function transform`) so the JS artifact is the same contract, just in
JavaScript.

For the **swap-on-the-fly** host model, define a thin descriptor the host can
hold many of:

```ts
interface Renderer {
  id: string; // host-chosen, e.g. org or profile key
  digest: string; // from artifact `source.digest`
  transform(xml: string, ctx?: TransformContext): TransformResult;
}
```

Host pattern:

1. Load N renderer artifacts (static imports, dynamic `import()`, or fetched
   bundles).
2. Keep them in a registry keyed by `id`.
3. On render, pick a renderer by `id` and call `transform(xml)`.
4. Swap by selecting a different `id`; the XML input is unchanged.

The engine does **not** own the registry, selection UI, or persistence. That is
host responsibility, consistent with [WORKBENCH_API.md](./WORKBENCH_API.md).

## 6. CLI surface

Add a single `--emit` option to the `compile` (and `watch`) commands.
`--emit` is the only knob. There is no `--format`, no `--emit-js`, and no
`--js-runtime`. One flag controls output targets; each named target is
unambiguous; defaults are unchanged.

Proposed surface:

```
weaver-xslt compile stylesheet.xsl
  --emit ts            (default — existing behavior, unchanged)
  --emit js            (transpiled ESM, runtime external)
  --emit bundle        (self-contained ESM, runtime inlined)
  --emit ts,js         (emit both alongside each other)
  --emit ts,bundle     (TS for type-checked consumers + self-contained JS)
```

Mapping to artifact flavors (see §3):

| `--emit` value | Writes                                       | Runtime                                    |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| `ts`           | `name.xsl.ts` + `.d.ts` + `.digest` + `.map` | n/a (TS source)                            |
| `js`           | `name.xsl.js` + `.js.map`                    | external (`@arakendo/weaver-xslt/runtime`) |
| `bundle`       | `name.xsl.bundle.js` + `.bundle.js.map`      | inlined by esbuild                         |

Output files are placed next to the stylesheet, matching the current convention
in [src/cli.ts](../src/cli.ts#L536). All names derive from the stylesheet base
name; no flags control naming.

Rules:

- Default behavior is unchanged when `--emit ts` (or no `--emit`) is used.
- JS emission reuses the already-computed artifacts; it must not recompile IR.
- Diagnostics are emitted once, shared across all formats.
- `watch` keeps all selected formats in sync atomically, like the current set.

## 7. Acceptance criteria

### Emission

- [ ] `compile --emit js` writes `name.xsl.js` + `.js.map` next to the stylesheet,
      alongside the existing `.ts` / `.d.ts` / `.digest` / `.map` outputs.
- [ ] `compile --emit bundle` writes `name.xsl.bundle.js` + `.bundle.js.map`.
- [ ] `compile --emit ts,js` writes both artifact sets in one pass.
- [ ] Default `compile` (no `--emit`, or `--emit ts`) output is byte-for-byte
      unchanged from current behavior.
- [ ] `--emit bundle` produces a self-contained file with no remaining
      bare `@arakendo/weaver-xslt/runtime` import.
- [ ] The JS artifact embeds the same `digest` as the `.digest` file.
- [ ] JS emission does not trigger a second IR compile (verified via profile or
      a call-count assertion).

### Invocation / consumption

- [ ] A `js-bundle` artifact can be loaded and run by another developer
      **without invoking the CLI** and **without installing the package**
      (e.g. `import('./name.xsl.js')` then `transform(xml)`).
- [ ] The `js` flavor runs in a project that already has the runtime available,
      and produces output identical to the interpreter and the generated-TS path
      for the supported slice.
- [ ] `transform(xml)` returns the same structured result shape (output +
      diagnostics) as the existing generated module contract.

### Swap-on-the-fly

- [ ] A host can load two different renderer bundles for the **same XML** and
      select between them by `id`, producing two different HTML outputs.
- [ ] Swapping renderers does not require reloading or re-fetching the XML.
- [ ] Each renderer reports a distinct `source.digest` so the host can identify
      and version them.

### Parity and safety

- [ ] Output parity fixtures compare interpreter, generated-TS, and emitted-JS
      for representative supported-slice stylesheets.
- [ ] The core engine modules under `src/xslt/**` do not import esbuild or any
      Node-only bundler API (lint/boundary check).
- [ ] No ambient `eval`, network, or filesystem access is added to engine code;
      execution sandboxing remains host-owned.

## 8. File-change map (planned)

| Area                                            | Change                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/processor/emitJs.ts` (new)                 | transpile generated TS module to JS (`js` flavor) via TypeScript API                                                                   |
| `src/processor/bundleJs.ts` (new, tooling-only) | esbuild-based self-contained bundle (`js-bundle` flavor)                                                                               |
| `src/processor/compile.ts`                      | optional `emit` targets option surfaced through the artifact API                                                                       |
| `src/cli.ts`                                    | parse `--emit <targets>`; write per-target artifact sets in `emitCompiledArtifactsFromFile` and the watch path                         |
| `src/compile.ts` / `src/index.ts`               | re-export any new public option types                                                                                                  |
| `package.json`                                  | promote esbuild from devDependency to a tooling dependency only if the bundle path ships in the published CLI; otherwise keep CLI-only |
| `test/codegen/*`                                | add JS-emission + parity tests; reuse the existing transpile-and-run helper                                                            |
| `README.md`                                     | document the new flag and the renderer hand-off workflow                                                                               |
| `docs/ROADMAP.md`                               | add the increment entry (see below)                                                                                                    |
| `docs/ARCHITECTURE.md`                          | note JS emission as an additional emit target on the existing boundary                                                                 |

## 9. Roadmap and architecture placement

This is an **emission-mode addition**, not a new engine. It sits naturally after
the native direct-execution work (MVP+6.25) because that increment already
established that the native plan can be "executed directly in-process, or lowered
to emitted TS/JS artifacts" ([ROADMAP.md](./ROADMAP.md)). JS emission makes the
"or lowered to emitted ... JS artifacts" half real and user-facing.

Suggested roadmap entry: a small dedicated increment, e.g. **MVP+6.x — JS
renderer artifacts**, with the acceptance criteria in section 7 as exit
criteria. It should be gated behind stable codegen and source maps, which
already exist.

Architecture note to add: the public emit boundary now has three targets
(TS module, declaration, and JS artifact) derived from the same IR/plan, with
the renderer contract in section 5 as the stable consumption surface.

## 10. Open questions

1. **Module format default** — ESM only for v1, or also a CommonJS/IIFE flavor
   for non-module consumers? Recommendation: ESM for `js`/`js-bundle`, defer IIFE.
2. **Runtime versioning** — when the runtime is inlined in `bundle`, how does
   a host detect an artifact built against an incompatible runtime? Likely embed
   a runtime/IR version alongside `digest`.
3. **Bundle size policy** — should `bundle` minify by default, and should it
   emit a sidecar `.bundle.js.map`? Recommendation: readable by default with an opt-in
   `--minify`, keep source maps.
4. **Async vs sync transform for browser** — the engine transform is synchronous
   today; for very large stylesheets the host may want a worker boundary. That is
   host policy and should not change the artifact contract.
5. **Published CLI bundling dependency** — if `bundle` emission ships in the published
   `weaver-xslt` bin, esbuild moves from devDependency to a real dependency.
   Decide whether the bundle flavor is published or local-tooling-only for v1.

## 11. Interim answer (today, before this lands)

Until JS emission exists, the only JavaScript deliverables are:

- the built package itself (`npm run build` -> `dist/*.js`, including
  `dist/cli.js`), and
- a generated `*.xsl.ts` artifact that a consumer must transpile/bundle.

To give a tester something runnable now:

```bash
npm install
npm run build
node dist/cli.js run stylesheet.xsl --input input.xml > output.html
```

A single JS file that **is** the compiled stylesheet does not exist yet. That is
exactly what this plan adds.

# NuGet Integration Plan — ASP.NET / .NET consumer packaging

> Status: **in-progress** — the repo now contains a packable `Weaver.Build`
> project plus local `.NET` validation projects that consume it through
> `PackageReference`. The packed package now carries the built `dist/` CLI and
> a minimal runtime npm dependency set for local validation, but the carrier
> shape is still scaffold-level rather than a reduced production payload.

> Note: the scaffold is intentionally minimal and intended to be iterated on. The plan sections below describe the intended package shape, properties, and acceptance criteria.

This document plans how a .NET application consumes Weaver **without** Weaver
reimplementing XSLT/XPath semantics in C#. The TypeScript engine stays the
single semantic source of truth; the NuGet layer is host packaging and build
integration around the existing compiler/CLI surface.

It focuses on the **near-term, lower-risk** path: build-time compilation of
`.xsl` stylesheets into Weaver artifacts that an ASP.NET app consumes,
delivered through NuGet + MSBuild. Any future in-process .NET host should be
treated as a separate, later exploration rather than a prerequisite for this
plan.

Related design context:

- [ARCHITECTURE.md](./ARCHITECTURE.md) for the emission boundary (`ts` / `js` / `bundle`)
- [JS_RENDERER_ARTIFACTS.md](./JS_RENDERER_ARTIFACTS.md) for the emitted-renderer contract
- [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md) for host-owned execution policy
- [URI_RESOLUTION.md](./URI_RESOLUTION.md) for resolver authority
- [ERRORS.md](./ERRORS.md) for the structured diagnostic contract

> Scope note: the **`dotnet` CLI tool** that consumes this package is explicitly
> deferred. It will be specified in a separate document. This plan covers the
> NuGet package(s), MSBuild integration, the Node dependency strategy, the
> artifact contract, and the runtime-execution options an ASP.NET host can pick.

## 0. Executive recommendation

The recommended near-term product shape is:

1. ship **`Weaver.Build`** first as the supported .NET entry point
2. make **`bundle`** the default emitted artifact for .NET consumers
3. require **Node 20+ at build time** in v1 rather than bundling Node
4. keep request-time execution **out of process** if/when ASP.NET runtime
   rendering is needed
5. defer any in-process CLR/embedded-runtime story to a later design once the
   Node-backed integration is established

That recommendation is intentionally conservative.

- It gets Weaver into .NET projects without waiting for a CLR-native runtime.
- It preserves the current semantic source of truth.
- It fits standard MSBuild and publish pipelines.
- It keeps the main capability edge explicit: a host-controlled Node process.

If a single sentence is needed: **NuGet should first be a build integration
product, not a second runtime implementation.**

## 0.1 Current implementation status

What exists in-tree today:

- `dotnet/Weaver.Build/Weaver.Build.csproj` packs a local `Weaver.Build`
  NuGet package for validation.
- `dotnet/Weaver.Build/build/Weaver.Build.props` and
  `dotnet/Weaver.Build/build/Weaver.Build.targets` provide the current MSBuild
  integration scaffold.
- `dotnet/sample-app` and `dotnet/diagnostics-fail` validate the package through
  `PackageReference`, not direct `Import` of the props/targets files.
- The scaffold honors per-item metadata, stages artifacts into
  `$(WeaverOutputDir)`, participates in build/publish, and maps diagnostics into
  MSBuild-friendly output.
- The packed `Weaver.Build` package carries the repo-built `dist/` CLI plus the
  minimal npm runtime dependency set needed for local package-consumer
  validation.

What is still intentionally unfinished:

- The packaged carrier under `tools/weaver/` is still a scaffold fallback, not
- The packaged carrier shape still reflects the repo's current runtime
  dependency graph and has not yet been reduced into a cleaner production
  carrier boundary.
- The planned `Weaver.Tool` split is still a design target rather than a fully
  implemented package boundary.

## 1. Problem statement

A known consumer is an **ASP.NET application** that wants to use Weaver to
transform XML into HTML (or other output) using compiled stylesheets.

Today the only realistic delivery for that consumer is manual:

1. install Node and the npm package
2. run `weaver-xslt compile ...` by hand or in an ad hoc script
3. wire the emitted artifacts into the .NET build output themselves
4. invoke Node at runtime with their own process plumbing

There is no supported, declarative way for a .NET project to say "compile these
stylesheets as part of my build and give me runnable artifacts in my output."
That gap is what this plan closes.

### What exists today (grounding)

- The CLI exposes three commands
  ([src/cli.ts](../src/cli.ts#L460)):
  - `weaver-xslt compile <glob> [--sample <xml>] [--emit ts|js|bundle|ts,js|ts,bundle|js,bundle]`
  - `weaver-xslt watch <glob> [--sample <xml>] [--emit ...]`
  - `weaver-xslt run <stylesheet> --input <xml> [--execution interpreter|native|auto] [--param name=value ...]`
- `compile --emit bundle` produces a self-contained **Node ESM** renderer
  (`*.xsl.bundle.js` + `.bundle.js.map`) with the Weaver runtime inlined
  ([JS_RENDERER_ARTIFACTS.md](./JS_RENDERER_ARTIFACTS.md)).
- Emitted renderers expose a stable contract:
  `export const source = { path, digest }` and
  `export function transform(sourceXml, ctx?)`.
- The current `bundle` flavor is Node-oriented; some runtime paths (for example
  `document()`) still depend on Node builtins such as `node:fs`. It is **not yet
  a browser-neutral or CLR-native artifact**.

The last point drives the whole design: the .NET integration is a **packaging and
orchestration** problem, not a runtime-reimplementation problem.

## 2. Goals and non-goals

### Goals

- Give .NET/ASP.NET consumers a NuGet package that compiles `.xsl` stylesheets
  during build/publish with near-zero manual scripting.
- Surface Weaver compiler diagnostics as **MSBuild errors/warnings** so build
  failures are first-class.
- Produce a predictable artifact layout in the .NET project output that an
  ASP.NET app can load and run.
- Make the Node dependency explicit and configurable, not magical.
- Keep all transform semantics, diagnostics, and resolver behavior owned by the
  Weaver engine, never reimplemented in C# or MSBuild.
- Define runtime-execution options (build-time only, out-of-process, future
  in-process) as explicit host choices with documented tradeoffs.

### Non-goals

- Porting XPath/XSLT semantics to C# (covered as a non-goal in
  this document's host-boundary direction).
- Shipping an in-process CLR/embedded-runtime host in this increment.
- Specifying the `dotnet` CLI tool surface (separate, later document).
- Promising browser-neutral or CLR-native bundle semantics while the bundle
  still has explicit Node edges.
- Inventing a second diagnostics or URI-resolution model on the .NET side.

## 3. Delivery ladder

Three delivery modes, in priority order. v1 is mode A. Mode B is the natural
extension for request-time rendering. Mode C is a future in-process .NET host
and is out of scope here.

| Mode                      | What it is                                                                   | Runtime dependency          | Primary use                                 | Status                      |
| ------------------------- | ---------------------------------------------------------------------------- | --------------------------- | ------------------------------------------- | --------------------------- |
| A. Build-time compilation | MSBuild compiles `.xsl` to artifacts during build/publish                    | Node at **build** time only | precompiled renderers shipped in app output | **v1 target**               |
| B. Out-of-process runtime | ASP.NET calls a Node worker/sidecar to run emitted renderers at request time | Node at **runtime**         | live transforms per request                 | v2                          |
| C. In-process host        | Embedded JS/CLR runtime runs renderers inside the .NET process               | embedded runtime            | no external process boundary                | deferred future exploration |

Rationale:

- Mode A is the cheapest reliable win and matches normal .NET build/publish flow.
- Mode B is the smallest honest path to request-time rendering and keeps the
  capability boundary explicit (the host owns the process and its authority).
- Mode C is a much larger platform/support investment and should not gate A or B.

## 4. Package shape

Follow the same carrier/façade split described here for the CLI/asset carrier
and the optional .NET-facing runtime façade.

### 4.1 `Weaver.Tool` — toolchain/asset carrier (packaging-only)

- Ships the Weaver CLI assets needed to run `compile`/`watch` during a build.
- Owns version pinning of the Weaver toolchain it carries.
- Contains **no** transform logic and **no** public API beyond build props.
- Two candidate carrying strategies (decided in §6):
  1. **Bring-your-own-Node**: package carries the Weaver npm tarball/JS and
     shells to a host-provided `node`.
  2. **Bundled-Node**: package additionally carries a pinned Node runtime per
     RID so builds do not require a preinstalled Node.

Expected package contents:

- `tools/weaver/` or equivalent carrier directory containing the Weaver CLI
  entrypoint and runtime files
- a small bootstrap script or host shim the MSBuild target can invoke
- version metadata that lets the target log the exact Weaver toolchain version
- optionally, RID-scoped Node payloads if bundled-Node is later enabled

### 4.2 `Weaver.Build` — MSBuild integration (props/targets)

- Ships `build/Weaver.Build.props` and `build/Weaver.Build.targets`.
- Discovers stylesheets, invokes the carrier, maps diagnostics to MSBuild, and
  wires emitted artifacts into the consuming project's output.
- This is the package application developers actually reference for mode A.

Expected package contents:

- `build/Weaver.Build.props`
- `build/Weaver.Build.targets`
- optional shared `.targets` imports for publish-time wiring
- no duplicated engine logic; only MSBuild orchestration and property defaults

### 4.3 `Weaver.AspNet` — optional runtime façade (mode B)

- Only needed when the app runs transforms at request time (mode B).
- Owns the .NET-facing runtime API and the Node worker/sidecar bridge.
- Must preserve the same host-boundary rules described in this plan:
  structured diagnostics, resolver contract, explicit settings, no ambient I/O.
- Depends on artifacts produced by `Weaver.Build`, not on engine internals.

Expected responsibilities:

- load or locate emitted renderer bundles by digest/path
- manage a Node worker lifecycle or sidecar endpoint
- project transform requests/responses into explicit .NET types
- surface structured failures into ASP.NET logging/telemetry
- keep resource access and policy decisions in host-owned callbacks/config

> A consumer doing build-time-only rendering references `Weaver.Build`. A
> consumer doing request-time rendering references `Weaver.Build` **and**
> `Weaver.AspNet`.

### 4.4 Recommended packaging decision

For the first supported release, the recommended package contract is:

- `Weaver.Build` depends on `Weaver.Tool`
- application projects reference `Weaver.Build`
- application projects do **not** directly reference `Weaver.Tool`
- `Weaver.AspNet` is separate and optional

That keeps the normal consuming story small while preserving a place for the
toolchain payload and version pinning.

## 5. MSBuild integration design (mode A core)

The heart of v1. The integration is an item-driven, incremental MSBuild target
that compiles stylesheets and contributes the results to the project.

### 5.1 Item group

Consumers declare stylesheets with a dedicated item type:

```xml
<ItemGroup>
  <WeaverStylesheet Include="Stylesheets/**/*.xsl" />
</ItemGroup>
```

Per-item metadata overrides global properties:

```xml
<ItemGroup>
  <WeaverStylesheet Include="Stylesheets/invoice.xsl"
                    Emit="ts,bundle"
                    Sample="Samples/invoice.sample.xml" />
</ItemGroup>
```

Recommended metadata surface:

| Metadata       | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `Emit`         | Per-item override for `--emit`.                               |
| `Sample`       | Optional XML sample forwarded to `--sample`.                  |
| `BaseUri`      | Optional logical base URI if/when the CLI supports it.        |
| `OutputSubdir` | Optional subfolder under `WeaverOutputDir` for emitted files. |
| `CopyToOutput` | Per-item override for publish/output copying.                 |

### 5.2 Properties (global configuration)

| Property                   | Default                            | Meaning                                                              |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `WeaverEmit`               | `bundle`                           | Default `--emit` target set for stylesheets without per-item `Emit`. |
| `WeaverOutputDir`          | `$(IntermediateOutputPath)weaver/` | Where emitted artifacts are written.                                 |
| `WeaverCopyToOutput`       | `true`                             | Copy emitted artifacts into the app output/publish dir.              |
| `WeaverFailOnDiagnostics`  | `warningsAsErrors:false`           | Diagnostic severity policy (see §8).                                 |
| `WeaverNode`               | autodetect                         | Path to the `node` executable (bring-your-own-Node).                 |
| `WeaverToolVersion`        | pinned                             | Version of the carried Weaver toolchain.                             |
| `WeaverEnabled`            | `true`                             | Master switch to disable the whole integration.                      |
| `WeaverPublishWithProject` | `true`                             | Include Weaver artifacts in `dotnet publish`.                        |
| `WeaverLogVerbosity`       | `normal`                           | Target logging verbosity for tool invocation and summary output.     |

Suggested consumer shape:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <WeaverEmit>bundle</WeaverEmit>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Weaver.Build" Version="0.x.y" />
    <WeaverStylesheet Include="Stylesheets/**/*.xsl" />
  </ItemGroup>
</Project>
```

### 5.3 Target flow

```txt
ResolveWeaverInputs
  → enumerate @(WeaverStylesheet), resolve metadata + properties
  → compute output paths per emit target
CompileWeaverStylesheets   (Inputs/Outputs = incremental)
  → invoke carrier: weaver-xslt compile <item> --emit <targets> [--sample <x>]
  → capture stdout/stderr, parse structured diagnostics
  → map diagnostics to MSBuild errors/warnings (§8)
CollectWeaverArtifacts
  → add emitted files to @(WeaverArtifact)
  → when WeaverCopyToOutput, add to @(Content)/@(None) CopyToOutputDirectory
```

Wiring points:

- `CompileWeaverStylesheets` runs `BeforeTargets="BeforeBuild"` (and participates
  in `Publish`) so artifacts exist before content collection.
- `Inputs`/`Outputs` use the stylesheet (and its `--sample`, and composed
  includes/imports) as inputs and the emitted artifacts as outputs, so unchanged
  stylesheets are skipped. The stylesheet `.digest` is the durable identity key.
- Clean removes the `WeaverOutputDir` artifacts via `@(FileWrites)`.

Additional wiring expectations:

- The target should hook into both `Build` and `Publish`, but avoid recompiling
  twice inside the same invocation when artifacts are already up to date.
- Publish should treat Weaver outputs as generated application content, not as
  source-controlled assets.
- Design-time builds in Visual Studio should avoid running the full toolchain
  unless explicitly enabled; otherwise IntelliSense/background evaluation will
  become noisy and slow.
- The target should emit a short summary line per build, for example number of
  stylesheets compiled, skipped, warned, and failed.

### 5.4 Incrementality and include/import graph

`compile` already composes `xsl:include`/`xsl:import`. MSBuild incrementality
must therefore treat the **composed dependency set** as inputs, not just the
entry stylesheet, or edits to an imported module would not retrigger a rebuild.
Options, in order of preference:

1. Have the build emit a sidecar dependency list (for example `*.xsl.deps`)
   during compile that MSBuild reads as additional `Inputs`.
2. Fall back to a coarse "any `.xsl` under the include roots" input glob.

This mirrors the existing watch-mode dependency handling and should reuse the
same composition logic rather than re-deriving it in MSBuild.

Recommendation: prefer the dependency sidecar. The coarse glob fallback is
acceptable only as a temporary compatibility path because it makes incremental
builds less trustworthy on larger repos.

## 6. Node dependency strategy

The single biggest adoption decision. Two supported postures:

### 6.1 Bring-your-own-Node (default for v1)

- The build requires `node` on PATH (or `WeaverNode` set explicitly).
- Smallest package, no per-RID runtime payload.
- Best for teams with controlled build agents.
- The target fails fast with an actionable diagnostic if Node is missing or
  below the supported major version (Node 20+).

### 6.2 Bundled-Node (opt-in)

- `Weaver.Tool` carries a pinned Node per RID and the build uses it.
- Larger package, but zero-setup builds on clean agents.
- Selected via a property such as `WeaverUseBundledNode=true`.

Guidance: ship 6.1 first, add 6.2 as an opt-in once the MSBuild flow is stable.
Document the supported Node major version in one place and validate it in the
target so failures are explained, not cryptic.

## 7. Artifact contract and consumption

### 7.1 Output layout

For `--emit bundle` on `invoice.xsl`, mode A produces, under `WeaverOutputDir`:

- `invoice.xsl.bundle.js`
- `invoice.xsl.bundle.js.map`

For `--emit ts,bundle`, the `ts` artifact set (`.ts`, `.d.ts`, `.digest`,
`.map`) is also produced. The TS set is useful for inspection/debugging and
for consumers that bundle separately; the `bundle` set is the runnable renderer.

### 7.2 Identity

Each artifact embeds `source.digest`, matching the `.digest` file when `ts` is
also emitted. The host uses the digest as the stable renderer identity for
caching, versioning, and swap-on-the-fly registries
([JS_RENDERER_ARTIFACTS.md](./JS_RENDERER_ARTIFACTS.md)).

### 7.3 Consumption (mode A)

In mode A the .NET app treats artifacts as build output. How they are then used
depends on the runtime story:

- precompiled/static rendering at build or deploy time, or
- handed to a Node worker at runtime (mode B).

This document does not assume a specific HTTP/MVC integration; that belongs to
`Weaver.AspNet` (mode B) and the deferred CLI/runtime docs.

### 7.4 Output-path recommendation

The recommended v1 layout is:

- emit into `$(IntermediateOutputPath)weaver/` during compile
- copy selected runtime artifacts into a stable application-relative folder at
  publish/output time, for example `weaver/`
- keep `.map` files in publish output only when a debug-oriented property is on

That split keeps intermediate build state separate from deployable content.

### 7.5 Recommended default artifact

For .NET consumers, the default should stay `bundle`, not `ts` or `js`.

- `ts` is inspectable but not directly runnable by an ASP.NET host.
- `js` still depends on an external Weaver runtime package boundary.
- `bundle` is the most portable artifact that matches the current engine.

`ts,bundle` is the recommended opt-in for teams that want both reviewable output
and a runnable renderer.

## 8. Diagnostics → MSBuild

Compiler diagnostics must not be flattened into opaque strings. The build
target consumes Weaver's structured diagnostics and projects them:

- map each `DiagnosticReport` to an MSBuild error or warning with:
  - code (for example `XTSE0010`)
  - file path + line/column from the primary span
  - message text
- severity policy via `WeaverFailOnDiagnostics`:
  - `true` / `error`: any diagnostic at warning+ fails the build
  - `false` (default): errors fail, warnings warn
  - `off`: never fail (not recommended)

To make this robust, the build should consume a **machine-readable** diagnostic
stream from the CLI (for example a `--format json` / `--diagnostics json` output
mode) rather than scraping human-formatted text. If that output mode does not
exist yet, adding it is a prerequisite for clean MSBuild mapping and is the
cleanest seam between the engine and the .NET layer.

Recommended JSON payload fields:

- `code`
- `severity`
- `message`
- `phase`
- `file`
- `line`
- `column`
- `endLine`
- `endColumn`
- `related`
- `suggestions`

The build does not need every human-facing formatting detail; it needs stable,
lossless location and severity information.

### 8.1 Exit-code contract

The carrier/CLI boundary should be explicit:

- `0` = success, no build-stopping diagnostics
- non-zero = invocation failure or error diagnostics under the active fail
  policy

MSBuild should not need to infer failure purely from log text.

## 9. Security and authority boundary

The ASP.NET host must follow [SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md):

- authored stylesheets/XML request capabilities; they do not grant them
- filesystem/network/document-loading authority is host-owned and explicit
- the current `bundle` still has Node capability edges (for example `document()`
  via `node:fs`); the host owns and restricts that, it is not ambient
- mode B (runtime worker) must route resource access through a host-owned
  resolver bridge, consistent with [URI_RESOLUTION.md](./URI_RESOLUTION.md) and
  the same resource-bridge pattern described for host integration in this plan

Build-time mode A is materially lower risk than request-time mode B because no
untrusted runtime input is processed during the build; the inputs are the
developer's own stylesheets.

### 9.1 Runtime-worker policy for mode B

If mode B is pursued later, the default hosting posture should be:

- one long-lived Node worker process per application instance
- a narrow request/response protocol over stdio, named pipes, or loopback HTTP
- explicit startup health checks and version handshake
- explicit worker shutdown on application stop

Avoid spawning a fresh `node` process per request. That would be simpler to
explain but operationally poor for latency, throughput, and logging cohesion.

## 10. Versioning

- The `Weaver.Tool` package version pins the toolchain that produces artifacts.
- Generated artifacts carry `source.digest` for content identity.
- A runtime/IR version should be embedded alongside the digest so a host can
  detect an artifact built against an incompatible runtime (this is open
  question 2 in [JS_RENDERER_ARTIFACTS.md](./JS_RENDERER_ARTIFACTS.md); the NuGet
  story strengthens the case for resolving it).
- NuGet package versions should track the Weaver release they carry, so a .NET
  consumer pins behavior by pinning the package.

Recommended rule: the `Weaver.Build` package version should align 1:1 with the
Weaver engine release it embeds or depends on. Silent floating between engine
and NuGet wrapper versions would make diagnostics and artifact provenance hard
to reason about.

## 11. Failure modes to handle explicitly

- Node missing/old → actionable MSBuild error naming the required version and
  `WeaverNode`/`WeaverUseBundledNode` remedies.
- Compile diagnostics → mapped per §8, never a raw stack trace.
- Partial emit failure in a multi-stylesheet build → fail the build but report
  every failing stylesheet, not just the first.
- Stale artifacts after a stylesheet delete → Clean and incremental `Outputs`
  remove orphaned artifacts (mirror watch-mode cleanup behavior).
- Cross-platform path handling → targets must work on Windows build agents
  (path separators, glob semantics, executable resolution).
- Design-time build churn → avoid expensive tool invocation during IDE-only
  evaluation unless explicitly enabled.
- Publish/runtime mismatch → runtime host detects bundle/runtime incompatibility
  early via version metadata rather than failing during a request.

## 12. Acceptance criteria

### Packaging

- [ ] `Weaver.Build` package reference adds stylesheet compilation to a .NET
      project with no manual scripts.
- [ ] `@(WeaverStylesheet)` items compile during build and publish.
- [ ] Per-item `Emit`/`Sample` metadata overrides global properties.

### Build behavior

- [ ] Unchanged stylesheets are skipped via MSBuild incrementality.
- [ ] Editing an included/imported module retriggers recompilation.
- [ ] Deleting a stylesheet removes its emitted artifacts on Clean/rebuild.
- [ ] Emitted artifacts land in `WeaverOutputDir` and, when enabled, in the
      app output/publish directory.

### Diagnostics

- [ ] Compiler diagnostics surface as MSBuild errors/warnings with code, file,
      and line/column.
- [ ] `WeaverFailOnDiagnostics` governs whether warnings fail the build.
- [ ] Diagnostics are consumed from a machine-readable stream, not scraped text.

### Node strategy

- [ ] Bring-your-own-Node works with `node` on PATH or `WeaverNode` set.
- [ ] Missing/old Node fails with an actionable message.
- [ ] Bundled-Node opt-in produces a clean build on an agent without Node.

### Boundary

- [ ] No XSLT/XPath semantics are reimplemented in C#/MSBuild.
- [ ] No second diagnostics or URI-resolution model is introduced on the .NET
      side.

### Operations

- [ ] `dotnet build` and `dotnet publish` do not re-run Weaver unnecessarily
      when inputs are unchanged.
- [ ] Build logs provide a concise per-run summary and actionable failures.
- [ ] Design-time/IDE evaluation does not invoke the full compiler by default.

## 13. Open questions

1. **Machine-readable diagnostics** — does the CLI need a dedicated
   `--diagnostics json` mode for MSBuild, and what exact schema? (Strong yes;
   this is the cleanest engine/host seam.)
2. **Dependency sidecar** — should `compile` emit a `*.xsl.deps` list to drive
   MSBuild incrementality for include/import graphs?
3. **Bundled-Node scope** — which RIDs are supported in v1 if bundled Node ships
   (win-x64, linux-x64, osx-arm64 first)?
4. **Runtime story ownership** — does mode B ship as `Weaver.AspNet`, or as a
   more generic `Weaver.Runtime` reusable beyond ASP.NET?
5. **Browser-neutral bundle** — does the .NET runtime story wait for a
   browser/CLR-neutral bundle, or is Node-oriented bundle acceptable for v1
   runtime (mode B)?
6. **Design-time build policy** — should Visual Studio design-time builds skip
   Weaver entirely, or run a reduced validation-only pass?
7. **Publish-path convention** — should published assets land under a fixed
   `weaver/` folder, or remain next to original content-relative paths?

## 14. Milestone guidance

Reasonable sequencing:

1. Add a machine-readable diagnostics output mode to the CLI (engine seam).
2. Build `Weaver.Tool` (bring-your-own-Node carrier) + `Weaver.Build`
   (MSBuild props/targets) for mode A.
3. Prove mode A end to end in a sample ASP.NET project: compile on build,
   diagnostics as MSBuild errors, artifacts in publish output.
4. Add bundled-Node opt-in.
5. Specify and build the `dotnet` CLI consumer (separate document).
6. Only then evaluate mode B (`Weaver.AspNet` runtime worker) and, much later,
   mode C (a future in-process .NET host).

Recommended v1 cutoff:

- stop after a credible `Weaver.Build` package exists, mode A works end to end,
  diagnostics are machine-readable, and a sample ASP.NET project proves publish
  output correctness
- do not let runtime-worker work or bundled-Node support delay that first slice

## 15. Repository/change map (planned)

| Area                              | Change                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| CLI (`src/cli.ts`)                | add machine-readable diagnostics output mode for MSBuild consumption    |
| CLI/compile                       | optionally emit a dependency sidecar for include/import incrementality  |
| New `Weaver.Tool` (.NET)          | toolchain/asset carrier, version pinning, optional bundled Node         |
| New `Weaver.Build` (.NET)         | MSBuild props/targets, item group, diagnostics mapping, artifact wiring |
| New `Weaver.AspNet` (.NET, later) | runtime worker bridge for mode B                                        |
| Docs                              | this plan; later a dedicated `dotnet` CLI consumer doc                  |

## 16. Recommended first implementation slice

If work started tomorrow, the smallest defensible slice would be:

1. add machine-readable diagnostics to the CLI
2. create `Weaver.Tool` with bring-your-own-Node only
3. create `Weaver.Build` with `@(WeaverStylesheet)`, `WeaverEmit=bundle`, and
   incremental build/publish wiring
4. prove it in one ASP.NET sample app checked into the repo or a companion
   validation repo

That slice is useful on its own, keeps scope under control, and sets up later
runtime-host work without backtracking on packaging decisions.

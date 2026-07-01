# Weaver Platform — Studio, tools, and SDK

> Status: **proposed**. This is a product-shape note for a `.NET` suite that
> competes with the practical XML workflow space covered by Altova-class tools,
> while keeping Weaver's product boundaries centered on how customers actually
> work rather than on internal subsystems.

This document does **not** propose cloning a single Altova desktop product.
It proposes a `.NET`-first transformation suite that starts from XML and XSLT
today, but is described in terms of user workflows and deployable tooling
rather than SKU-shaped architecture boxes.

It complements [DIFFERENTIATORS.md](./DIFFERENTIATORS.md),
[ARCHITECTURE.md](./ARCHITECTURE.md), [NUGET_INTEGRATION.md](./NUGET_INTEGRATION.md),
[WORKBENCH.md](./WORKBENCH.md), [WORKBENCH_API.md](./WORKBENCH_API.md), and
[XML_COVERAGE_DIAGNOSTICS.md](./XML_COVERAGE_DIAGNOSTICS.md).

Customers think in workflows, not in subsystem diagrams.

**Weaver is the authoritative semantic source for XML transformation systems.**
Everything else, Studio, tools, SDK, language servers, and AI agents, is
simply another consumer of that semantic model.

Architectural rule: every public interface, CLI, SDK, language server, and
semantic server, must derive its answers from the same semantic model rather
than maintaining separate implementations.

## 1. Executive thesis

If Altova is the reference point, the right Weaver-adjacent answer is **not**
"invent four separate products because four subsystems exist internally." The
better move is:

1. keep **Weaver** as the compiler/runtime platform
2. expose one primary interactive surface and two automation/integration
   surfaces that match real customer workflows
3. compete on **automation, diagnostics, inspectability, deployable artifacts,
   and build integration**, not on a pile of pseudo-products nobody naturally
   thinks about

The simplest honest explanation is:

- **Weaver** is the platform/compiler.
- **Weaver Studio** is the interactive workbench.
- **Weaver Tools** are automation and command-line workflows.
- **Weaver SDK** is `.NET` integration: NuGet, MSBuild, runtime loading, and
  deployable renderer consumption.

Everything else is a feature set inside one of those boundaries, not a separate
customer-facing product.

The strategic center of gravity is therefore not the editor shell. It is the
compiler-backed semantic layer that every shell, tool, editor, and agent can
ask.

## 2. The competitive frame

Altova's practical value comes from solving a family of XML problems in one
commercial toolchain:

- authoring and inspecting XML and schemas
- running XSLT and XPath
- mapping/transforming data between shapes
- validating XML against XSD and related constraints
- comparing files and directories
- producing business-ready output artifacts
- integrating XML work into enterprise developer workflows

A `.NET` suite that wants to compete does not need identical SKU boundaries.
It needs to cover the same buyer questions and let a customer retell the answer
in one sentence.

The buyer questions are really these workflows:

- "How do I inspect and debug this XML problem?"
- "How do I build and debug transforms?"
- "How do I automate processing at scale?"
- "How do I package this into our build pipeline and deploy it safely?"

That last question is where Weaver can be materially better than legacy XML
suites because the engine is compiler-backed, diagnostics-first, and capable of
emitting inspectable TypeScript/JavaScript artifacts.

The repeatable explanation should therefore be:

"Use Weaver Studio to investigate and debug. Use Weaver Tools in CI and batch
workflows. Install the Weaver SDK in your application or build pipeline."

If a product family cannot be explained that simply, the boundaries are too
clever.

## 3. Product boundaries

The suite should be described as one platform and three customer-facing entry
points.

### 3.1 Weaver

Weaver is the platform/compiler.

It owns:

- XSLT/XPath semantics
- compilation
- diagnostics
- runtime execution
- emitted TS/JS/bundle artifacts
- provenance, traceability, and coverage-warning payloads

It is not a separate GUI or line-of-business app. It is the core technology the
other surfaces expose.

### 3.2 Weaver Studio

This is the main interactive product.

Think: Visual Studio meets XMLSpy, but powered by Weaver's compiler/runtime
core.

Core capabilities:

- open XML, XSD, XSLT, and related assets
- tree/text dual views
- XPath scratchpad and result inspection
- XSLT authoring
- schema validation and diagnostics
- transform preview
- compare and validation views
- node trace / template trace / coverage-warning views
- project explorer
- deployment and artifact configuration

Possible hosts:

- **v1 likely host:** VS Code plus a Weaver extension
- a browser-hosted workbench backed by a local service
- a dedicated desktop shell later if some XML-native workflows prove too
  awkward inside editor hosts

The important distinction is that Studio does not have to begin life as
`WeaverStudio.exe`.

The likely modern architecture for the Studio host path is:

```text
VS Code / Visual Studio / other host
               |
        Weaver extension
               |
       Weaver language server
               |
            Compiler
               |
             Runtime
```

That is strategically stronger than starting with a standalone IDE because it
lets Weaver compete first on compiler infrastructure and tooling quality, not
on rebuilding an editor shell from scratch.

Tools and SDK should reach the same compiler/runtime core directly. The Studio
host stack is just one consumer path, not the platform's defining shape.

Where Weaver fits:

- stylesheet compile + diagnostics
- transform execution
- emitted-renderer preview
- trace and coverage-warning payloads
- future source-to-generated-artifact debugging surfaces

Where Weaver does **not** fit by itself:

- text editor UX
- schema designers
- visual tree controls
- file compare UI

Studio should absorb the interactive capabilities previously split across
"Studio," "Build," and parts of "Delivery." A user should not need to guess
which application to launch for inspection versus preview versus deployment
configuration.

### 3.3 Weaver Tools

This is automation and command-line tooling.

It is where "Ops" naturally belongs, but as commands, not as a separately
branded application. Most users will say they are "using Weaver" rather than
"using the CLI," so the tools matter more than the command-line label.

Core capabilities:

- compile, validate, compare, transform, audit, and coverage-report workflows
- folder or corpus processing
- suspicious-output detection and evidence capture
- CI-friendly machine-readable output
- batch renderer execution and diagnostics export

Where Weaver fits:

- directly; this is the most honest automation surface for the engine

Typical commands should look like:

```text
weaver validate
weaver compare
weaver audit
weaver transform
weaver coverage
```

This is the surface enterprises use in CI, scheduled jobs, and corpus analysis.

Within the platform tree, it is reasonable to think of this as **command-line
tools**, not as a standalone brand that must be marketed separately.

### 3.4 Weaver SDK

This is developer integration and deployment infrastructure.

It is not primarily a branded desktop app. It is the set of components people
install into builds, services, and applications.

Core capabilities:

- `Weaver.Build`
- NuGet packages
- MSBuild integration
- runtime contracts for loading compiled renderers
- deployment tooling
- ASP.NET/service consumption patterns
- compiler/runtime access from `.NET` hosts

Where Weaver fits:

- directly; this is the packaging and integration boundary around the engine

Important distinction:

- `Weaver.Build` is a package/component of the SDK.
- `Weaver.Runtime` is a package/component of the SDK.
- deployment is a capability of the SDK and CLI.
- none of those need to be sold or explained as separate standalone apps.

### 3.5 Semantic interfaces

There is one more boundary that matters strategically, even if it is not a
separately marketed product boundary: Weaver should expose its semantic
knowledge through structured interfaces, not only through files and terminal
output.

Two interfaces matter most:

- a **Weaver language server** for editors and IDE hosts
- a **Weaver Semantic Server** exposed through an MCP-style protocol for AI
  assistants and automation agents

These should not be treated as unrelated side projects. They are alternative
interfaces to the same compiler authority.

That means Weaver is not just "the thing that runs XSLT." It becomes the
authoritative semantic source for questions such as:

- which template matches this node
- which templates call or depend on this template
- what diagnostics apply here
- what coverage gaps were found
- how a sample input renders
- which emitted artifact came from which source span

That is a much stronger moat than simply owning an editor shell.

The semantic model is effectively:

```text
XML / XSLT
    ↓
  Compiler
    ↓
    IR
    ↓
Diagnostics
Navigation
Traceability
Coverage
Source Maps
Call Graphs
Generated Artifacts
```

Studio, Tools, SDK, the language server, and the semantic server are all
different ways of querying or presenting that same model.

Possible semantic interface queries include:

```text
weaver.getDiagnostics
weaver.findTemplate
weaver.findCallers
weaver.findCallees
weaver.explainXPath
weaver.getCoverageReport
weaver.getIR
weaver.traceTemplateSelection
weaver.mapSourceToArtifact
weaver.mapArtifactToSource
```

Those are intentionally semantic and introspection-oriented. Full workflow
operations such as compile, validate, transform, and compare remain the natural
domain of Studio, Tools, and SDK.

The important product rule is:

- humans may use Studio
- build systems may use Tools and SDK
- editors may use the language server
- AI agents may use the semantic server

But all of them should be talking to the same semantic core rather than trying
to reconstruct meaning from raw source text.

## 4. Why this boundary is more natural

The four real workflows are:

1. investigate XML
2. build and debug transforms
3. automate processing
4. deploy compiled renderers

Those collapse naturally into:

- Studio for interactive work
- Tools for automation
- SDK for integration and deployment

That is easier to explain than asking a customer to distinguish among
"Build," "Ops," and "Delivery" as if they were separate applications.

It also leaves room for a second axis that is increasingly important:

- Studio is the human interactive surface.
- Tools and SDK are the automation/integration surfaces.
- language-server and agent interfaces are the semantic surfaces.

That split matches how modern developer platforms succeed: one compiler core,
many consumers.

## 5. Mapping against Altova-like expectations

The point is not literal product parity. The point is buyer-value parity with a
clearer technical story.

| Problem area           | Altova-class expectation              | Proposed Weaver answer       | Weaver role                  |
| ---------------------- | ------------------------------------- | ---------------------------- | ---------------------------- |
| XML/XSD inspection     | interactive inspection and validation | Weaver Studio                | primary engine under the GUI |
| XSLT/XPath execution   | run and debug transforms              | Weaver Studio + Tools + SDK  | primary engine               |
| compare/audit          | find meaningful differences           | Studio views + tool commands | supporting signal source     |
| enterprise integration | usable in CI/.NET pipelines           | Tools + SDK                  | primary engine               |
| transform deployment   | production use beyond editor preview  | SDK + Tools                  | primary engine               |
| visual mapping/design  | drag-drop mapping/modeling            | separate module or deferred  | not a Weaver-native fit      |

## 6. XML today, transformation platform tomorrow

This document should not over-bind the entire product family to XML in the
naming model.

XML is clearly the center of gravity today, but the broader idea is a platform
for **structured document transformation pipelines**.

If Weaver later grows support around adjacent structured formats or mixed
document workflows, the product story should still hold:

- Weaver remains the platform/compiler
- Studio remains the interactive workbench
- Tools remain automation
- SDK remains integration and deployment

That makes the ecosystem more durable than naming every layer as an XML-only
product forever.

## 7. Where Weaver makes the most sense

Weaver is a strong fit where the suite needs:

- **real compiler diagnostics** rather than generic processor failures
- a semantic authority that editors and agents can query directly
- emitted, inspectable artifacts that can be reviewed and deployed
- traceability from stylesheet to runtime behavior
- batch automation over XML corpora
- `.NET` build integration that treats transforms as versioned assets
- coverage-style warnings for likely missing stylesheet handling

Concrete user stories where Weaver is a good core:

- "Compile our XSLT during `dotnet build`, package the renderer, and run it in
  our ASP.NET app."
- "Show which source XML tags looked uncovered during a transform run."
- "Let a support engineer reproduce a customer render using the exact compiled
  bundle that shipped."
- "Run a nightly validation/transform audit over thousands of XML files and
  produce machine-readable evidence."
- "Debug the generated transform artifact instead of reverse-engineering a black
  box processor state."
- "Let an AI assistant ask which template produces a node instead of grepping
  the repository and guessing."

## 8. Where Weaver is not the whole answer

If the suite wants to compete seriously, some capabilities need sibling modules
or deferred features rather than being forced into Weaver itself.

Not a direct Weaver fit:

- WYSIWYG XML or report designers
- drag-and-drop data mapping canvases
- schema diagram designers/editors
- generic file/directory diff UX
- PDF layout tooling outside the transform/runtime boundary

The architectural rule should stay strict:

- Weaver owns XSLT/XPath semantics, diagnostics, compilation, runtime, emitted
  artifacts, and transform observability.
- The surrounding suite owns editors, shells, validation orchestration, compare
  UX, storage, licensing, and workflow integration.

## 9. Recommended ecosystem packaging

The family should be explained as one platform with product surfaces and
interfaces, not as a flat list of peers:

```text
                    Weaver Platform

                   Compiler / Runtime

      ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
      │              │              │              │              │
    Studio         Tools           SDK      Language Server  Semantic Server
```

Interpretation:

- **Weaver Studio** is the interactive surface users open.
- **Weaver Tools** are what CI, ops, and batch workflows call.
- **Weaver SDK** is what developers install into `.NET` applications and builds.
- **Weaver.Build** and **Weaver Runtime** are components of the SDK, not
  separately explained products.
- **Weaver Language Server** is an interface consumed by editor hosts.
- **Weaver Semantic Server** is an interface consumed by AI agents and other
  semantic clients.

That distinction matters: Studio, Tools, and SDK are the customer-facing
surfaces. The language server and semantic server are strategic interfaces to
the same compiler authority, not parallel product lines.

If Studio begins as a VS Code extension plus language server, that still fits
this model. The host is VS Code; the product surface is still Weaver Studio.

Likewise, if agents consume Weaver through an MCP-style semantic server, the
product is still Weaver Platform. The server is an interface, not a different
semantic engine.

## 10. Phased implementation plan

This plan keeps the suite honest. It starts with the part where Weaver is
already strategically strong, then exposes that core through Studio, Tools, and
SDK instead of inventing extra product boundaries customers would have to learn.

Each phase is described by its goal, deliverables, requirements, dependencies,
and exit criteria. Phases are ordered so that every later surface consumes a
core that is already stable, rather than forcing the core to chase surface
decisions.

### Phase 0 — Core contract hardening

- **Goal:** make the compiler/runtime core a dependable dependency before any
  new surface is built on top of it.
- **Deliverables:**
  - a documented, versioned emitted-artifact contract (module shape, exports,
    runtime entry points)
  - a stable IR-derived diagnostics payload shape (locations, codes, severity)
  - a stable coverage-warning payload shape consistent across interpreter and
    native-direct paths
- **Requirements:**
  - interpreter and codegen backends stay at semantic parity for the covered
    surface
  - no external XPath/XSLT engine dependencies are introduced
  - payload shapes are additive-friendly so later consumers do not force
    breaking changes
- **Dependencies:** none; this is the foundation.
- **Exit criteria:**
  - emitted-artifact and diagnostics contracts are documented and covered by
    tests
  - coverage-warning parity is verified through generated modules, not only the
    processor path

### Phase 1 — `.NET` build and package path (SDK core)

- **Goal:** let a `.NET` team compile stylesheets during `dotnet build` and load
  the emitted renderer as a versioned asset.
- **Deliverables:**
  - `Weaver.Build` MSBuild integration inside the SDK
  - NuGet packaging for `Weaver.Build` and `Weaver.Runtime`
  - runtime contracts for loading compiled renderers from `.NET` hosts
- **Requirements:**
  - build integration produces deterministic, inspectable artifacts
  - runtime loading contract is documented and versioned
  - ASP.NET/service consumption pattern is demonstrated end to end
- **Dependencies:** Phase 0 emitted-artifact and runtime contracts.
- **Exit criteria:**
  - a sample app compiles a stylesheet at build time, packages it, and runs it
    at runtime
  - the renderer artifact can be reproduced from source for support scenarios

### Phase 2 — Runtime diagnostics surfaces

- **Goal:** turn diagnostics-first design into visible, capturable runtime
  signal.
- **Deliverables:**
  - trace output (node trace, template trace)
  - coverage-warning reporting wired through both interpreter and native-direct
    execution
  - provenance/traceability from stylesheet source to runtime behavior
- **Requirements:**
  - diagnostics use the shared diagnostics boundary and canonical ordering
  - warnings are opt-in and machine-readable
  - source locations are preserved end to end
- **Dependencies:** Phase 0 payload shapes; Phase 1 runtime loading.
- **Exit criteria:**
  - trace, coverage, and provenance data are exposed through documented
    result surfaces
  - the same signal is available whether a stylesheet runs interpreted or
    native-direct

### Phase 3 — Language server and Studio-quality editing

- **Goal:** expose the core to editor hosts so Studio can begin as VS Code plus
  a Weaver extension.
- **Deliverables:**
  - a Weaver language server backed by the compiler core
  - editor features: diagnostics, navigation, completion, template/XPath
    inspection
  - a VS Code extension host that consumes the language server
- **Requirements:**
  - the language server exposes semantics rather than reimplementing them
  - the extension does not fork compiler logic
  - editor responsiveness targets are met for typical stylesheet sizes
- **Dependencies:** Phase 0 diagnostics contract; Phase 2 diagnostics surfaces.
- **Exit criteria:**
  - a developer can author and inspect XSLT in VS Code with Weaver-backed
    diagnostics and navigation
  - the extension is a thin consumer of the language server, not a second engine

### Phase 4 — Semantic server as infrastructure

- **Goal:** turn Weaver from a compiler consumed mainly by humans into semantic
  infrastructure that AI assistants and automation agents can query directly.
- **Deliverables:**
  - a Weaver Semantic Server over an MCP-style protocol
  - semantic/introspection operations (find template, callers/callees, explain
    XPath, coverage report, source/artifact mapping)
  - a documented contract showing how agent-facing answers map back to the same
    compiler and IR authority used by other public surfaces
- **Requirements:**
  - the server exposes the same semantic model the language server uses
  - agent-facing answers come from the shared semantic model rather than ad hoc
    repository search or duplicated logic
  - operations stay semantic and introspection-oriented, not a remote wrapper
    over full workflows
  - transport is treated as an interface detail, not a new engine
- **Dependencies:** Phase 3 semantic query surface; Phase 2 diagnostics.
- **Exit criteria:**
  - an agent can ask which template produces a node and get an authoritative
    answer without grepping source
  - language server and semantic server share one semantic implementation
  - the server is demonstrably an infrastructure surface, not a second
    inference layer that can drift from compiler truth

### Phase 5 — Enterprise automation tooling

- **Goal:** make Tools the honest automation surface for CI, batch, and corpus
  workflows.
- **Deliverables:**
  - `weaver validate`, `compare`, `audit`, `transform`, and `coverage` commands
  - folder/corpus processing with machine-readable output
  - suspicious-output detection and evidence capture
- **Requirements:**
  - commands are CI-friendly and produce stable machine-readable output
  - tooling guards cleanly when large corpora are absent
  - automation reuses the same core, diagnostics, and coverage payloads
- **Dependencies:** Phase 1 packaging; Phase 2 diagnostics surfaces.
- **Exit criteria:**
  - a nightly validation/transform audit over many XML files produces
    machine-readable evidence
  - enterprise pipelines consume Weaver without bespoke glue per project

This sequence exposes the core through Studio, Tools, and SDK, and through the
language-server and semantic-server interfaces, without inventing extra product
boundaries customers would have to learn.

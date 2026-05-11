# Security Boundaries — capability ownership and untrusted-content policy

> How Weaver separates authored XML/XSLT intent from host authority, and how
> security-sensitive capabilities stay explicit across parser, compiler,
> runtime, generated artifacts, and host integrations.

This document exists because XML and XSLT tooling eventually attracts all the
usual parser, resolver, and runtime attack surfaces: XXE, external document
loads, stylesheet includes/imports, extension functions, generated artifact
trust, and resource-exhaustion behavior.

The sharp boundary for Weaver is simple:

- authored inputs may request capabilities
- authored inputs may not grant themselves capabilities
- the host owns trust and authority

It complements [ARCHITECTURE.md](./ARCHITECTURE.md),
[SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md),
[URI_RESOLUTION.md](./URI_RESOLUTION.md),
[ENTITY_RESOLUTION.md](./ENTITY_RESOLUTION.md), and [ERRORS.md](./ERRORS.md).

## Goals

- Define the trust boundary between authored inputs and the embedding host.
- Keep filesystem, network, extension-function, and artifact-execution
  authority explicit rather than ambient.
- Make browser, CLI, CI, server, and future IDE hosts differ by policy, not by
  hidden engine behavior.
- Give future security-sensitive features one shared design rule instead of
  one-off hardening patches.
- Preserve diagnostics-first behavior when security policy blocks a request.

## Non-goals

- Designing every future public API in this document.
- Re-specifying all W3C security considerations in prose.
- Promising a full sandbox in core engine code.
- Treating static-site demos and hosted/server execution as the same threat
  model.

## Core rule

Authored inputs are declarative requests, not authority sources.

That means:

- XML input does not grant itself entity, filesystem, or network access.
- XSLT input does not grant itself `document()`, `xsl:include`,
  `xsl:import`, extension-function, or output-publication authority.
- Generated TS/JS artifacts do not get ambient authority just because they were
  emitted by Weaver.
- The embedding host decides what capabilities exist, which URIs are allowed,
  and what operations are denied.

If content can upgrade its own privileges by naming a URI, declaring an entity,
or asking for a host function, this boundary has already failed.

## Layering model

Weaver should preserve an explicit authority ladder:

```txt
Layer 0: XML / stylesheet source
  data and transform intent only

Layer 1: parser / compiler / evaluator
  semantics and diagnostics, but no ambient authority

Layer 2: host capability layer
  URI policy, entity policy, extension catalog, output policy

Layer 3: operating environment
  browser sandbox, local filesystem, server process, network, secrets
```

Rule:

```txt
lower-trust layers may request capabilities upward
lower-trust layers may not authorize themselves downward
```

This is the same practical protection used to avoid liar-paradox-style trust
mistakes: the document that wants authority does not get to define the rules
that grant it.

## Default posture

The default posture should be boring and safe.

Recommended default assumptions:

- no ambient filesystem reads
- no ambient network reads
- no ambient writes for `xsl:result-document`
- no external entity loading
- no parameter-entity or DTD-based external fetch behavior by default
- no unapproved extension functions
- no `eval`, `new Function`, or arbitrary imports in emitted artifacts
- bounded recursion, expansion, and output where practical

The host may opt into more capability, but the opt-in should be explicit and
diagnosable.

## Threat surfaces

### 1. XML parse boundary

Relevant risks:

- XXE / external entity loading
- local-file disclosure
- SSRF / network probing
- entity-expansion bombs
- excessive nesting or expansion behavior

Boundary rule:

- the parser does not perform ambient filesystem or network loads
- entity expansion policy is host-controlled
- blocked or undefined entity behavior surfaces as diagnostics, not silent
  fallback

The detailed policy lives in [ENTITY_RESOLUTION.md](./ENTITY_RESOLUTION.md).

### 2. Stylesheet resource boundary

Relevant risks:

- `xsl:include`
- `xsl:import`
- later package-like module loading
- untrusted stylesheet graphs pulling in local or remote content

Boundary rule:

- stylesheet references resolve through host policy
- the engine does not silently read local files or URLs from core logic
- cycle detection and identity use canonical URIs returned through the resolver
  boundary

The detailed resolver contract lives in [URI_RESOLUTION.md](./URI_RESOLUTION.md).

### 3. Runtime document/text boundary

Relevant risks:

- `doc()` / `document()` access to local or remote resources
- later `collection()` or `unparsed-text()` access
- environment-specific silent widening of authority

Boundary rule:

- resource access happens only through host-provided resolution/loading policy
- `resolve-uri()` is pure URI math, not implicit I/O
- identical stylesheet logic should not gain more authority just because it is
  running on a server instead of in a browser

### 4. Extension-function boundary

Relevant risks:

- host functions touching filesystem, network, process state, or secrets
- arbitrary capability exposure under a harmless-looking XPath call

Boundary rule:

- extension functions are explicitly registered by the host
- untrusted or public-hosted scenarios should default to no extension functions
- diagnostics should identify blocked or missing extension capabilities clearly

### 5. Generated artifact boundary

Relevant risks:

- generated TS/JS modification before execution
- emitted code gaining process or network access through ambient APIs
- string-concatenated code generation that turns stylesheet content into raw JS

Boundary rule:

- emitted artifacts should compile to closed Weaver runtime helper calls,
  not arbitrary scripting
- no `eval`, `new Function`, or open-ended import behavior in generated code
- host environments own artifact integrity, sandboxing, and execution policy

Corollary: preventing local file modification is primarily a host or OS problem,
not something core Weaver can solve by itself.

### 6. Resource-exhaustion boundary

Relevant risks:

- recursive templates
- huge intermediate sequences
- giant result trees
- pathological XPath expressions
- parse-time expansion bombs

Boundary rule:

- limits belong in explicit host or runtime policy, not hidden heuristics
- blocked-limit cases should surface as structured diagnostics when possible

## Environment-specific threat model

Not every host has the same risk profile.

### Static-site workbench

For a flat-file or static-site workbench, the main risks are local-to-user:

- browser hangs
- memory blowups
- pathological recursion or output size
- unsafe parsing defaults if the browser-facing parser boundary is loosened

This is materially lower risk than a server host because there is no privileged
server filesystem, process environment, or internal network to attack.

### Hosted or server execution

For ASP.NET, Node, CI, Electron, or other privileged hosts, the threat surface
is much sharper:

- local-file disclosure
- SSRF and internal service access
- secret or config leakage
- extension-function abuse
- artifact execution with ambient process authority

This is why sensitive capabilities must stay explicit across all hosts, even if
today's static workbench happens to be relatively safe.

## No silent privilege widening by environment

Weaver should not silently change security behavior by runtime environment.

Bad:

```txt
browser: document() denied
server: document() now reads local disk automatically
```

Good:

```txt
all sensitive capabilities require host policy
```

When a capability is denied, the engine should surface that denial clearly.

Example:

```txt
Security policy blocked document() access to file:///secrets.xml
```

That keeps browser, CLI, and server behavior legible and testable.

## Recommended host-controlled surfaces

The exact API names can evolve, but these capability classes should remain
host-owned:

- URI resolution and resource loading
- entity resolution
- extension-function registration
- secondary-output publication
- artifact execution sandboxing or integrity checks
- resource and recursion limits

One reasonable mental model is:

```ts
interface WeaverSecurityPolicy {
  allowDocumentFunction?: boolean;
  allowFileAccess?: boolean;
  allowNetworkAccess?: boolean;
  allowIncludeImport?: 'none' | 'local' | 'resolver-only';
  allowExtensionFunctions?: boolean;
  maxRecursionDepth?: number;
  maxOutputSizeBytes?: number;
}
```

This document does not freeze that exact public API. It freezes the ownership
rule: the host owns the policy.

## Diagnostics expectations

Security decisions should be visible in diagnostics rather than hidden behind
parser crashes or silent omission.

Good examples:

- blocked external entity resolution
- denied `document()` read
- denied stylesheet import/include
- unavailable extension function due to policy
- resource limit exceeded

When possible, diagnostics should preserve:

- the original request (`href`, entity name, function name)
- the relevant source span or location
- the host policy reason or category of denial

## Relationship to other docs

- [ENTITY_RESOLUTION.md](./ENTITY_RESOLUTION.md) defines parse-boundary entity
  policy under this broader security rule.
- [URI_RESOLUTION.md](./URI_RESOLUTION.md) defines resolution and resource
  loading without granting ambient I/O.
- [SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md) defines the broader rule
  that engine contracts should not collapse distinct concerns into vague helper
  surfaces.

## Bottom line

Weaver should treat XML, XSLT, and emitted artifacts as authored inputs making
requests across a host-owned capability boundary.

That keeps the static workbench safe by default, gives future hosted runtimes a
credible security story, and prevents authored content from quietly becoming an
authority source.
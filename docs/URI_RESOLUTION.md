# URI Resolution — host contract and resource loading

> How Weaver resolves URIs, what the engine owns, and what the calling
> application must provide.

This document exists because URI handling is not an implementation detail.
It is part of the contract between `@arakendo/weaver-xslt` and the host
application embedding it.

It complements [ARCHITECTURE.md](./ARCHITECTURE.md), especially the core
"no Node-specific APIs in the engine" rule, [XPATH.md](./XPATH.md) for
XPath static-context `baseUri`, and [ERRORS.md](./ERRORS.md) for how
resolution failures surface diagnostically, plus
[SEMANTIC_BOUNDARIES.md](./SEMANTIC_BOUNDARIES.md) for the broader rule
that lexical references, resolved identity, and host-policy boundaries
must not be collapsed into one vague helper, and
[SECURITY_BOUNDARIES.md](./SECURITY_BOUNDARIES.md) for the higher-level rule
that authored content requests capability but does not grant itself authority.

## Goals

- Define who owns URI resolution semantics versus actual I/O.
- Make compile-time and runtime resolution behavior explicit.
- Pin what `baseUri` means, and what it does **not** mean.
- Prevent the core engine or generated runtime from quietly depending on
  Node filesystem APIs, ambient `fetch`, or other host-specific behavior.
- Give future features like `xsl:include`, `xsl:import`, `doc()`,
  `unparsed-text()`, and `xsl:result-document` a shared contract.

## Non-goals

- Designing a final public TypeScript API in this doc.
- Re-specifying all W3C URI rules in prose.
- Mandating one storage backend or transport (`file:`, `https:`, in-memory,
  bundler virtual modules, database blobs, etc.).
- Granting the engine implicit permission to read from disk or network.

## Core rule

The engine owns **resolution semantics**.
The host application owns **resource access**.

That means:

- Weaver decides how relative URIs resolve against base URIs.
- Weaver decides when a feature needs only URI resolution versus actual
  bytes/text/XML loading.
- The host decides which URIs are allowed, how they are canonicalized,
  and how content is retrieved or persisted.

If the engine directly calls `fs.readFile`, ambient `fetch`, or browser
storage APIs in core logic, this contract has already been broken.

Corollary: the resolver boundary itself must preserve this split.
`resolve(...)` is for URI math and identity. Loading and publishing are
separate operations.

## Terms

Use these terms consistently:

- **`href`**: the lexical URI reference as it appeared in source, such as
  `../common.xsl` or `docs/invoice.xml`
- **base URI**: the URI used to resolve a relative `href`
- **resolved URI**: the absolute URI produced by URI resolution rules
- **canonical URI**: the stable URI string the host wants us to treat as
  identity for caches, cycle detection, and deduplication
- **source identity**: the URI attached to diagnostics/source maps for the
  user-facing origin of a resource

The engine should usually preserve both the lexical `href` and the
resolved/canonical URI. One is for diagnostics; the other is for identity.

## What `baseUri` means

`baseUri` is an input to URI resolution.
It is **not** permission to perform I/O.

Examples:

- `resolve-uri('child.xml', 'file:///app/input.xml')` can return
  `file:///app/child.xml` without opening that file.
- `doc('child.xml')` needs both resolution **and** resource acquisition.
- a stylesheet parsed with `baseUri = 'file:///styles/invoice.xsl'` can
  resolve `xsl:include href="../shared/common.xsl"` correctly, but the
  actual included stylesheet still has to come from a host resolver.

This distinction matters because some operations are pure and some are not.

## Resolution surfaces

### 1. Parse and diagnostics surfaces

These need source identity, not I/O:

- stylesheet parse spans
- XML parse spans
- source maps
- error reporting

At this boundary, the host should be able to tell Weaver what URI to use
for a parsed source buffer even if that buffer came from memory.

Examples:

- a bundler plugin may provide `virtual:invoice.xsl`
- an editor integration may provide `untitled:invoice.xsl`
- tests may provide `memory:/fixtures/main.xsl`

The engine must not assume every URI is a filesystem path.

### 2. Compile-time stylesheet resolution

These features resolve and load stylesheet-like resources:

- entry stylesheet identity
- `xsl:include`
- `xsl:import`
- later, packages and related module-like constructs

Contract:

- the host provides the entry stylesheet text plus its source identity
- Weaver resolves relative references against that stylesheet's base URI
- the host resolver returns the referenced stylesheet bytes/text
- Weaver parses, diagnoses, and tracks include/import relationships using
  canonical URIs for cycle detection and deduplication

Why canonical URIs matter:

- the same stylesheet may be reachable through different relative paths
- cycle detection should not depend on lexical path spelling
- incremental builds and watch mode need stable cache keys

### 3. Runtime document/text resolution

These features resolve and load runtime resources:

- `doc()`
- `document()`
- `collection()` later
- `unparsed-text()` and related functions later

Contract:

- Weaver resolves the lexical URI reference against the relevant runtime
  base URI
- the host resolver performs the actual load
- the resolver returns XML/text/collection content in a form the engine
  can consume
- failures are surfaced as structured diagnostics with both lexical
  request context and resolved/canonical identity when available

Important distinction:

- `fn:resolve-uri()` is pure URI computation
- `doc()` and friends are resource-access operations

They must not be conflated into one "URI helper" that sometimes does I/O.

### 4. Output-target resolution

These features resolve output destinations:

- `xsl:result-document`
- future APIs that materialize secondary outputs by URI

Contract:

- Weaver resolves the target URI according to XSLT/base-URI rules
- Weaver does **not** silently write files or network resources from core
  logic
- the host decides whether result documents are captured in-memory,
  persisted, rejected, or mapped to application-defined destinations

This matters especially in browsers and serverless environments where a
resolved URI is not the same thing as a writable location.

## Host responsibilities

The calling application should own these decisions:

1. Which URI schemes are allowed.
2. How URI strings are canonicalized for identity.
3. How resources are loaded: filesystem, fetch, in-memory registry,
   archive, custom store, etc.
4. Whether writes are allowed for secondary outputs.
5. Whether relative resolution against a given base is even permitted.

Examples of host policy:

- allow `file:` only inside a workspace root
- allow `https:` reads but deny `http:`
- deny all external I/O and require preloaded in-memory resources
- capture `xsl:result-document` outputs in a map instead of writing anywhere

These are host policy decisions, not XPath/XSLT semantics.

## Engine responsibilities

Weaver should own these decisions:

1. Which base URI is relevant for a given operation.
2. How relative references resolve against that base.
3. Which features require only resolution versus actual loading.
4. How source identity propagates into diagnostics and source maps.
5. How canonical URIs are used for caches, deduplication, and cycle checks
   once the host returns them.

The engine should not contain policy like "read from the local filesystem
if the URI starts with `file:`" unless that behavior is explicitly
injected by the host through a resolver boundary.

## Recommended contract shape

The exact public API can evolve, but the contract should separate:

- URI resolution intent
- resource loading
- output publication

One viable shape is:

```ts
export type UriPurpose =
  | 'stylesheet'
  | 'include'
  | 'import'
  | 'doc'
  | 'document'
  | 'collection'
  | 'unparsed-text'
  | 'result-document'
  | 'diagnostic';

export interface UriRequest {
  href: string;
  baseUri?: string;
  purpose: UriPurpose;
}

export interface ResolvedUri {
  href: string;
  resolvedUri: string;
  canonicalUri?: string;
}

export interface ResourceResolver {
  resolve(request: UriRequest): ResolvedUri | Promise<ResolvedUri>;
  loadText?(uri: ResolvedUri): string | Promise<string>;
  loadXml?(uri: ResolvedUri): string | Promise<string>;
  publishResult?(uri: ResolvedUri, content: string): void | Promise<void>;
}
```

Resolver invariants that should be treated as contract, not convention:

- `resolve()` must not perform resource access
- `resolve()` should be side-effect free for a fixed host policy
- identical inputs under the same host policy should produce the same
  resolved identity
- `resolve()` is allowed to reject by policy, but not to quietly load and
  inspect resources to decide the answer

The important part is not this exact interface. The important part is the
split:

- resolution first
- loading second
- publishing/writing third

That keeps pure URI logic testable and host policy injectable.

The split also needs to survive future surface growth. XML/text-specific
loaders are acceptable as an early shape, but if JSON, binary, or richer
collection resources arrive, prefer converging on a resource envelope or
kinded `load(...)` contract rather than accumulating `loadWhatever()`
methods until the interface becomes a kitchen sink.

`UriPurpose` is also a policy input, not just a string enum for scattered
switch statements. Purpose handling should be centralized so that include,
import, document access, and result publication do not each invent their
own mini-policy layer.

## Base URI sources

Different operations may derive their base URI from different places.

Likely sources include:

- the caller-provided stylesheet URI
- the caller-provided source document URI
- the static context base URI for XPath evaluation
- later, `xml:base`-affected node/document base URIs where the spec requires it

Rule: the engine should make the chosen base URI for each operation
explicit in code and, when helpful, in structured diagnostic details.

Implicit "whatever URI is lying around" behavior is how resolution bugs
become folklore.

## Canonicalization and identity

The host may know things the engine does not:

- path case normalization rules
- symlink or virtual-module identity
- archive/member identity
- workspace aliases

Therefore:

- the host may return a `canonicalUri`
- the engine should prefer `canonicalUri` over raw `resolvedUri` for cache
  keys, cycle detection, and deduplication
- diagnostics should usually preserve the user-facing source identity,
  not only the canonical one
- `canonicalUri` is expected to be stable for the same underlying
  resource under the same host policy

Example:

```txt
href: ../shared/common.xsl
resolvedUri: file:///repo/styles/../shared/common.xsl
canonicalUri: file:///repo/shared/common.xsl
```

The user probably wants to see the lexical include site in diagnostics.
The cache wants the canonical URI.

Host trust is necessary here, but not blind faith. If the engine sees the
same logical resource resolve to shifting canonical identities during one
compile/watch session, it should treat that as suspicious: invalidate the
relevant cache entries and, where practical, surface a diagnostic or debug
warning rather than pretending cache/cycle behavior is still trustworthy.

## Failure model

URI-related failures should become structured diagnostics, not ad hoc
thrown strings.

Relevant failure categories include:

- invalid lexical URI syntax
- no base URI available where one is required
- resolution denied by host policy
- resource not found
- resource type mismatch (expected XML, got text or vice versa)
- include/import cycles
- unsupported URI scheme

Diagnostic expectations:

- preserve the lexical `href`
- preserve the requesting operation (`include`, `doc`, `result-document`, etc.)
- include the relevant base URI when it exists
- include resolved/canonical URI when resolution got that far
- point to the calling XPath/XSLT instruction span when possible

Implementation rule: resolver and URI-loading paths should project
failures through one small diagnostics helper or factory rather than
throwing ad hoc `Error` values. A tired `throw new Error('file not found')`
should not be able to bypass the structured diagnostic contract by
accident.

This is where [ERRORS.md](./ERRORS.md) matters: URI failures are part of
the same structured diagnostic contract as parse/type/runtime failures.

## Security and policy

The default engine stance should be conservative:

- no ambient filesystem reads
- no ambient network reads
- no ambient writes

If a host wants those behaviors, it should provide them explicitly.

This protects:

- browser hosts
- test environments
- locked-down server environments
- generated-code consumers who should not discover hidden I/O behavior at runtime

## Codegen rule

Generated TypeScript must obey the same URI contract as the interpreter.

That means:

- generated code does not bypass the resolver boundary
- generated code does not invent its own URI normalization rules
- generated code calls the same runtime resolver surface the interpreter
  relies on, rather than inlining or re-deriving resolution behavior
- interpreter and codegen should agree on base-URI choice, resolved URI,
  and failure shape for the same operation

If interpreter and generated code resolve the same `doc()` call
differently, that is semantic drift, not an implementation detail.

## Examples

### Example 1: in-memory compile with includes

Host provides:

- stylesheet text for `memory:/main.xsl`
- resolver that maps `memory:/shared/common.xsl` to text

Weaver does:

- resolve `href="shared/common.xsl"` against `memory:/main.xsl`
- ask host for the referenced content
- report diagnostics against `memory:/main.xsl` and the include site if loading fails

### Example 2: browser app with no external I/O

Host provides:

- `baseUri`
- no external resolver, or a resolver that denies all unknown URIs

Weaver does:

- allow pure `resolve-uri()` behavior
- fail `doc()` with a structured diagnostic explaining that resource
  access is unavailable under current host policy

### Example 3: `xsl:result-document` in a web app

Host provides:

- a `publishResult` hook that captures outputs in memory

Weaver does:

- resolve the target URI
- pass resolved identity plus content to the host
- not write files itself

## Early decisions this doc should force

1. `baseUri` must remain distinct from I/O permissions.
2. Core logic must use an injected resolver boundary, not ambient host APIs.
3. Compile-time stylesheet loading and runtime document loading should
   share concepts but not collapse into one vague helper.
4. Canonical URI identity should be available for caches and cycle checks.
5. Result-document targets should resolve through the same contract,
   even if the current API still returns outputs in memory.
6. Resolver purity and structured URI diagnostics must be enforced, not
  assumed.

## Open questions

1. Do we want separate resolver capabilities for XML, text, and binary,
   or a more generic resource envelope?
2. Should caller-facing APIs expose resolved/canonical URIs on
   `TransformResult` for secondary outputs, not just lexical `href`?
3. How aggressively do we want to model `xml:base` in early milestones
   versus deferring full fidelity to later XSLT work?

This document should evolve when we learn something structural about the
host contract, not every time we add one new URI-using function.
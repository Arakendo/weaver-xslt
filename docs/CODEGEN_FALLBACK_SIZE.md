# Fallback File Size Findings

This page records what we learned while investigating why a small entry
stylesheet such as `S1000D_main.xslt` could produce an enormous fallback
artifact, and what those findings imply for browser delivery.

The short version is:

- The scary `111 MB` generated module was mostly **pretty-print whitespace**.
- The remaining `32.8 MB` minified IR was mostly **provenance**, not transform logic.
- The actual stylesheet logic is compact.
- On the wire, the full IR already compresses to **2.28 MB gzip** or **0.97 MB brotli**.
- That makes this primarily a **browser parse / memory** question, not a network question.

These findings changed the design conversation from "How do we force this under
1 MB?" to "What problem are we actually solving?"

## 1. Problem

Stylesheets that fall outside the native codegen slice are emitted through the
**serialized-IR fallback** path. That module embeds the entire `StylesheetIR` as
one huge pretty-printed object literal and then executes it through the
interpreter.

Before Phase 0, fallback IR emission in [src/xslt/codegen/plan.ts](../src/xslt/codegen/plan.ts#L24)
used pretty-printed JSON:

```ts
serializedIr: JSON.stringify(ir, null, 2),
```

The current compiler now emits minified fallback IR instead:

```ts
serializedIr: JSON.stringify(ir),
```

consumed by [src/xslt/codegen/emit.ts](../src/xslt/codegen/emit.ts#L194):

```ts
`const stylesheet = ${plan.serializedIr} satisfies StylesheetIR;`,
// ...
'  return transformCompiledStylesheet(stylesheet, sourceXml, ctx);',
```

For the real Vision `S1000D_main.xslt`, this produced a **111 MB / 3.1M-line**
generated module before Phase 0 minification. That is unreasonable to ship as
JavaScript, even if it is only sent once.

## 2. Executive Summary

The investigation answered three separate questions.

### What made the original fallback artifact so large?

Two things:

1. Pretty-print whitespace accounted for **65.8%** of the original `111 MB` file.
2. After removing whitespace, about **64.6%** of the remaining minified IR was
   still position/provenance metadata.

It was **not** primarily include/import graph expansion.

### How big is the actual stylesheet logic?

When `location` and `span` metadata are stripped, the structure-only payload is:

- **11.61 MB raw**
- **509 KB gzip**
- **84 KB brotli**

That means the transform logic itself is relatively small. Provenance is the weight.

### What matters operationally?

For IIS + browser clients, the transfer problem is already mostly solved by
ordinary HTTP compression:

- **full IR**: `32.79 MB raw -> 2.28 MB gzip / 0.97 MB brotli`

So the next engineering question is not wire size. It is whether browser
**fetch + parse + heap growth + first transform latency** are acceptable on the
real payload.

## 3. What matters for the web deployment

The clarified deployment model is:

- IIS serves the artifact to browser clients.
- The stylesheet can be fetched **once at session start** or once per version.
- The client can keep it in session memory, Cache Storage, IndexedDB, or similar
  local persistence.
- A few thousand users may fetch it, so the solution should lean on normal HTTP
  caching and compression rather than per-user bespoke server work.

That changes the optimization target:

- **Wire size** matters more than raw source size.
- **Cacheability** matters more than squeezing out the last megabyte.
- **Startup simplicity** matters more than making the payload maximally tiny.
- **Diagnostics fidelity** still matters; we should not throw away locations just
  to save bytes unless that is proven necessary.

For this use case, getting the payload under **10 MB compressed over HTTP** is
already good enough.

## 4. Where the bytes go (measured)

Profiling the current emitted artifact:

| Metric | Value |
|---|---|
| Total chars | 116.7 M |
| Leading-indent whitespace | 76.9 M (65.8%) |
| `"location"` objects | 82,465 |
| `"source"` string repeats | 84,413 |
| line/column/endLine/endColumn fields | 233,590 each |
| `"kind"` fields | 212,969 |

Two facts dominate:

1. Pretty-print whitespace is most of the current file.
2. The IR is highly repetitive, so it compresses extremely well.

### Byte attribution of the minified IR (32.8 MB)

Counts hide cost; the question is where the *bytes* go. Partitioning every byte
of the minified IR to its owning field name (exact partition, sums to 32.79 MB):

| Field | MB | % | Count |
|---|---|---|---|
| `kind` | 3.37 | 10.3% | 212,969 |
| `endColumn` | 3.07 | 9.4% | 233,590 |
| `endLine` | 2.79 | 8.5% | 233,590 |
| `column` | 2.33 | 7.1% | 233,590 |
| `source` | 2.17 | 6.6% | 84,413 |
| `line` | 2.12 | 6.5% | 233,590 |
| `span` | 1.99 | 6.1% | 149,177 |
| `endOffset` | 1.51 | 4.6% | 84,413 |
| `location` | 1.49 | 4.6% | 82,462 |
| `start` | 1.33 | 4.0% | 149,177 |
| `offset` | 1.27 | 3.9% | 84,413 |
| `name` | 1.21 | 3.7% | 73,913 |
| `end` | 1.11 | 3.4% | 149,177 |
| `body` | 0.63 | 1.9% | 37,716 |
| `axis` | 0.57 | 1.7% | 33,880 |

### The 14 KB -> 32.8 MB expansion is provenance, not include-graph blowup

Aggregating the position-bearing subtrees:

| Position metadata | MB | % of minified IR |
|---|---|---|
| whole `location` subtrees | 10.48 | 31.9% |
| whole `span` subtrees | 10.71 | 32.7% |
| **position metadata total** | **21.19** | **64.6%** |

So ~65% of the "real" structure after whitespace removal is **source position
data**, and the genuine structural payload (`kind`, `name`, `body`, `axis`,
`predicates`, `nodeTest`, `steps`, ...) is only ~11 MB. This answers the
architectural question directly: the 2300x post-whitespace expansion is
**duplicated provenance attached to every node**, not a fully-expanded
import/include graph.

Two concrete smells fall out of the report:

1. **Every node carries *two* overlapping position records** — a `location`
   (10.48 MB) **and** a `span` (10.71 MB), each holding line/column/offset data.
   That redundancy is worth questioning on its own, independent of file size.
2. **The `source` filename is stored 84,413 times** (2.17 MB) when one interned
   string-table entry would do.

Important: this does **not** change the deployment recommendation. All of this
duplicated provenance is exactly what compressors collapse, which is precisely
why brotli takes the full IR to 0.97 MB. The byte report matters for one thing
only: **if** browser cold-start parse/memory turns out to hurt, it tells us the
high-leverage fixes are boring and obvious (intern `source`, collapse the dual
`location`/`span` representation, optionally externalize positions) rather than
an exotic IR-compression project.

### How compact is the stylesheet logic actually? (structure only)

Stripping the position metadata and re-measuring isolates the genuine logic:

| Variant | Raw | gzip | brotli |
|---|---|---|---|
| full IR | 32.79 MB | 2330 KB | 989 KB |
| no `location` | 22.32 MB | 859 KB | **110 KB** |
| no `span` | 22.08 MB | 1876 KB | 957 KB |
| **structure only (no both)** | **11.61 MB** | 509 KB | **84 KB** |

Two takeaways:

1. **The real stylesheet logic is tiny** — ~11.6 MB raw, and only **84 KB**
   brotli. The transform itself is compact; provenance is the weight.
2. **The position entropy lives almost entirely in `location`, not `span`.**
   Dropping `location` alone takes brotli 989 KB -> 110 KB; dropping `span`
   alone barely moves it (957 KB). `span` coordinates already compress to
   near-nothing (regular/derivable), while `location` carries the real entropy
   because it holds the repeated `source` string and the offset fields.

So if Phase 1.5 ever justifies attacking provenance, the order is determined by
this table: **`location` first (and interning `source` within it); `span` is
essentially free post-compression.** And on the wire none of it is urgent — even
the full IR is 0.99 MB brotli, well under the `<10 MB` budget. This only changes
parse/memory math: ~11.6 MB to parse and allocate instead of ~32.8 MB.

### Encoding experiments (same IR)

| Encoding | Raw size | Transfer shape |
|---|---|---|
| Current pretty JSON | 111 MB | not acceptable |
| Minified JSON | 32.8 MB | acceptable only if HTTP-compressed |
| Minified, locations stripped | 22.3 MB | unnecessary for current target |
| gzip of full IR | 2.28 MB | comfortably within target |
| brotli of full IR | 0.97 MB | far within target |

## 5. Main conclusion

We do **not** need an aggressive IR redesign to meet the web-delivery goal.

The practical answer is:

1. Stop embedding pretty-printed IR in a `.ts` module.
2. Emit the fallback stylesheet as a **minified serialized IR asset**.
3. Let IIS serve it with **gzip or brotli compression**.
4. Fetch it once, cache it by **digest/version**, and reuse it for the rest of
   the session or across sessions.

On the measured corpus, the full IR already compresses to **2.28 MB with gzip**
and **0.97 MB with brotli** without removing diagnostics data. That is already a
good fit for an IIS-backed web client on the network side.

The remaining unknown is **cold-start client cost**:

- download time,
- decompression time,
- JSON parse time,
- peak memory while materializing the IR object graph.

That cost should be measured on the real S1000D payload before committing to any
deeper IR redesign.

## 6. Recommended response

The measured findings suggest a simple response order.

1. **Minify the fallback IR** so the `.ts` artifact stops exploding on disk.
2. **Emit a web-targeted IR asset** instead of embedding a giant fallback object
   literal in browser-facing JavaScript.
3. **Serve it with ordinary IIS compression and cache headers.**
4. **Measure browser cost** on the real payload before changing IR structure.
5. Only if Phase 1.5 shows a real cold-start problem, attack the high-entropy
   provenance structures.

This is intentionally boring. Boring is good here.

## 7. Recommended architecture

### Preferred transport model

For web clients, the fallback artifact should be treated as a **static data
asset**, not as a giant JavaScript source file.

Recommended shape:

- Emit `S1000D_main.xslt.ir.json` as **minified JSON**.
- Optionally also emit a small loader module that knows the stylesheet `digest`,
  URL, and how to turn the fetched JSON into a `StylesheetIR`.
- Let IIS apply or serve precompressed `gzip` / `br` responses.
- Cache the asset on the client keyed by digest.

Recommended contract:

- **Browser fallback loading should be explicitly async.** A browser host should
   `await` stylesheet availability before first transform rather than pretending
   the fallback artifact is synchronously available at module import time.
- **Node/CLI can keep the current synchronous path** if that remains convenient;
   this plan is specifically about making the web delivery path reasonable.
- The async boundary should live at stylesheet acquisition, not deep inside the
   interpreter, so the runtime surface stays predictable.

This keeps the browser path simple:

- No custom decompression format is required.
- No Node-only runtime dependency leaks into the browser.
- Standard browser `fetch()` plus automatic HTTP decompression is enough.
- IIS and browser caches do most of the work.

### Client caching model

The client should avoid re-fetching the stylesheet on every transform.

Recommended order:

1. Use a **content digest** already available from codegen output.
2. Cache the fetched payload in **Cache Storage** or **IndexedDB**.
3. Keep the parsed stylesheet in memory for the active session.
4. On next startup, reuse the cached artifact if the digest matches.

Notes:

- `localStorage` is usually the wrong place for something this large.
- Cache Storage is simplest if the app already behaves like a web app with fetch.
- IndexedDB is a better fit if the artifact is managed directly as application data.

### Server delivery model for IIS

IIS should serve the IR asset as a versioned static file.

Recommended server behavior:

- Enable **static compression** for `application/json` and related asset types.
- Prefer **brotli** when available; fall back to gzip.
- Set long-lived cache headers for digest-addressed assets, for example:
  - `Cache-Control: public, max-age=31536000, immutable`
- Use the digest in the filename or URL so new stylesheet versions do not require
  cache invalidation tricks.
- Let normal HTTP caching and CDN/proxy layers absorb repeated demand from a few
  thousand users.

This is operationally much simpler than inventing an application-specific binary
transport.

## 8. Implementation phases

### Phase 0 — Immediate relief

Change the serializer from pretty JSON to minified JSON.

```ts
JSON.stringify(ir)
```

Effect:

- 111 MB raw module becomes ~32.8 MB raw serialized IR.
- Removes the worst-case file explosion immediately.
- Still not good as inline JavaScript, but good enough as the source for a static
  compressed asset.

This phase is now reflected in the compiler source:

```ts
JSON.stringify(ir)
```

### Phase 1 — Web-first fallback asset

Add a new fallback emit mode for web delivery.

Recommended output:

- `*.xslt.ir.json` containing minified IR.
- A small JS/TS loader module that exports metadata and loads the IR by URL.

Recommendation on output shape:

- Treat this as a **separate web-targeted fallback emit mode first**, not an
   immediate universal replacement for every fallback consumer.
- Once the browser path is proven and any host assumptions are flushed out, it
   can become the default fallback form for web-facing outputs.
- This keeps the first rollout narrow and avoids forcing CLI/test/tooling hosts
   to absorb an async fetch contract before the browser case is validated.

Conceptually:

```ts
export const source = { path, digest };

export async function loadStylesheet(): Promise<StylesheetIR> {
  const response = await fetch(stylesheetUrl, { cache: "force-cache" });
  return response.json();
}
```

This is the phase that aligns best with IIS + browser clients.

### Phase 1.5 — Measure the real browser cost

Before redesigning the IR further, run a proof-of-concept with the real S1000D
artifact served the way production would serve it.

Measure at minimum:

- transfer time,
- decompressed payload size,
- `JSON.parse` time,
- peak memory / heap growth during parse,
- time to first usable transform after stylesheet load.

Suggested approach:

- Emit `*.xslt.ir.json` for the real corpus.
- Serve it from IIS or an equivalent static host with compression enabled.
- In a browser harness, use `performance.now()` around fetch and parse.
- Repeat for cold cache and warm cache.

Decision gate:

- If parse and memory are acceptable, stop here and keep the simple JSON asset path.
- If parse cost is too high, then move to Phase 2 and consider IR restructuring.

Acceptance thresholds for this gate should be explicit. For the first pass,
approve the simple JSON asset path if a representative client shows roughly:

- cold-cache transfer and decode comfortably under normal session-start latency,
- `JSON.parse` in the low hundreds of milliseconds rather than multi-second,
- heap growth that stays well below the point where a few concurrent open
   documents would pressure the tab or renderer process,
- time-to-first-usable-transform that is acceptable for a one-time session
   bootstrap.

The exact numbers should be filled in from the target browser/hardware mix, but
the important part is that Phase 1.5 should end with **pass/fail thresholds**,
not a vague "seems fine" judgment.

### Phase 2 — Shared caching helper

Provide a small client/runtime helper that:

- looks up a stylesheet by digest,
- loads it from Cache Storage or IndexedDB if present,
- fetches and stores it if absent,
- keeps the parsed `StylesheetIR` in memory for the current session.

This prevents repeated parse/fetch work and centralizes the policy instead of
making each host implement it independently.

### Phase 3 — Optional further shrink work (target the measured 64.6%)

Only do this if Phase 1.5 shows cold-start parse/memory is actually too heavy.
If it is, the byte report says exactly where to aim, in increasing effort:

1. **Intern `source`** — replace 84,413 repeats of the filename with one
   string-table entry. Trivial, ~2.17 MB off the parsed graph.
2. **Collapse the dual `location` + `span` representation** — every node carries
   two overlapping position records (~21 MB / 64.6% combined). Keeping one, or
   deriving one from the other, is the single biggest lever and also removes a
   genuine architecture redundancy. Attack `location` first: it carries nearly
   all the position entropy (brotli 989 KB -> 110 KB when removed), whereas
   `span` already compresses to almost nothing.
3. **Externalize positions** — move location/span into a demand-loaded sidemap
   keyed by node id, so the hot IR graph holds little or no provenance.
4. **Expand native codegen coverage** so this corpus stops using fallback at all.

These are valid future optimizations, but they are **not required** to satisfy
the current IIS/web delivery goal, and they should be justified by Phase 1.5
numbers rather than by the raw file size looking scary.

## 9. What not to optimize yet

Given the updated requirement, we should avoid premature complexity.

Not recommended as the first move:

- Building a custom brotli blob loader into the browser runtime.
- Splitting diagnostics into a separate location map before measuring real need.
- Designing for a 1 MB ceiling that the deployment does not require.
- Treating raw generated `.ts` size as the primary success metric.
- Redesigning the IR before we have cold-start parse and memory numbers.

Those ideas are useful only if the simpler HTTP-compressed asset path proves
insufficient.

## 10. Recommended path

1. Change fallback serialization to **minified JSON**.
2. Add a **web-targeted fallback emit mode** that stops shipping giant inline
   fallback modules to the browser.
3. Emit a **static IR asset** plus a small loader surface.
4. Measure real browser fetch, parse, and memory cost on the S1000D corpus.
5. If Phase 1.5 passes, standardize that web-targeted path and consider whether
   it should become the default fallback form for browser-facing outputs.
6. Serve it from IIS with normal **gzip/brotli compression** and long-lived cache
   headers.
7. Cache it on the client by digest and keep it in memory for the active session.

This should already put the real transferred size in roughly the **1 to 3 MB**
range for the measured S1000D artifact, which is well below the updated
`<10 MB` requirement and reasonable for a one-time session bootstrap, subject to
acceptable parse and memory measurements.

## 11. Implementation checklist

- [x] Switch fallback serialization from pretty JSON to minified JSON in
      [src/xslt/codegen/plan.ts](../src/xslt/codegen/plan.ts#L24).
- [ ] Implement the web path as a separate fallback emit mode first, then decide
   after Phase 1.5 whether it should become the default browser-facing form.
- [ ] Update fallback emission in [src/xslt/codegen/emit.ts](../src/xslt/codegen/emit.ts#L194)
      so browser-facing artifacts can point at a static IR asset rather than embed
      the full literal.
- [x] Build a small browser proof-of-concept that measures fetch time, parse time,
  and heap growth for the real S1000D IR payload.
- [ ] Write down explicit Phase 1.5 pass/fail thresholds for representative
   client hardware and browser targets before calling the POC successful.
- [ ] Add a small loader/cache helper for digest-keyed client reuse.
- [ ] Verify IIS compression and cache headers for the emitted asset type.
- [ ] Refresh any golden fixtures affected by the serializer change.

## 12. Risks and open questions

Risks:

- Moving from inline JS to fetched JSON changes host expectations; some tooling or
  tests may assume the stylesheet is immediately present at module import time.
- Parsing a 30+ MB minified JSON asset may still be a meaningful cold-start CPU
  and memory cost, even if network transfer is small; this is the main thing to
  measure before declaring the design good enough.
- Browser storage quotas vary; Cache Storage / IndexedDB are better candidates
  than `localStorage`.

Open questions:

1. Should the browser path fetch the IR asset directly, or should the server
   bootstrap response provide the URL/digest manifest?
2. Are there any browser-facing consumers that truly require synchronous
   stylesheet availability, or can browser fallback loading be made async by
   contract?
3. What concrete Phase 1.5 pass/fail thresholds should the team adopt for parse
   latency, heap growth, and first-transform readiness?
4. Are `.workbench` generated artifacts meant to be committed, or should they be
   treated strictly as build output?

## 13. Tooling Note

Large stylesheet compile and IR-asset generation runs can stay CPU-bound for a
long time without producing visible terminal output. That makes it difficult to
tell the difference between "still compiling" and "stuck" from the CLI alone.

We may want to add explicit **progress reporting** to the CLI for long-running
operations such as:

- stylesheet composition,
- stylesheet compile to IR,
- module emission,
- IR asset serialization,
- artifact write-out.

Even coarse progress messages or periodic heartbeat output would make large
corpus work much easier to operate and debug.

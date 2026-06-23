# Compile Performance Plan

This page proposes a plan for making large stylesheet compiles fast enough to be
usable. It is the companion to the size investigation in
[Fallback File Size Findings](CODEGEN_FALLBACK_SIZE.md): that page is about how
_big_ the output is, this page is about how _long_ it takes to produce.

## 1. Baseline

A full file-based compile of the real Vision entry stylesheet
`.workbench/vision xslts/S1000D/S1000D_main.xslt` was measured end to end through
[compileStylesheetArtifactsFromFile](../src/processor/compile.ts#L92):

| Metric               | Value                      |
| -------------------- | -------------------------- |
| Wall-clock           | **1,882,883 ms (~31m23s)** |
| Generated module     | 34,386,683 bytes (~34 MB)  |
| Diagnostics produced | 3,053                      |

That is the single observed data point on this machine, single-threaded, cold.
Roughly 31 minutes to compile one stylesheet is not viable for the workbench,
the watch-mode CLI, or CI, so this is treated as a correctness-of-experience
defect, not just an optimization nicety.

For planning purposes, `~30 minutes` is only the baseline we measured, not the
bar we are willing to ship. The product target for a cold compile of this
stylesheet should be **5 minutes or less**, with anything above that treated as
an interim state to optimize through rather than an acceptable end state.

## 2. Why a plan instead of a fix

We do **not** yet know which phase dominates the 31 minutes. The pipeline already
emits coarse phase messages through the `onProgress` hook
([runtimeArtifacts.ts](../src/processor/runtimeArtifacts.ts#L29)), but those are
labels, not timings. Guessing at the hotspot before measuring it risks optimizing
the wrong phase.

So step one is always instrumentation. Everything after that is hypothesis-driven
and should be re-validated against real per-phase numbers and memory behavior.

## 3. Pipeline phases

A single file compile runs these phases in order:

1. **Compose** — read the entry file plus every `xsl:include` / `xsl:import`,
   serialize and splice their top-level children into one source string
   ([composeStylesheetSourceFromFile](../src/processor/compile.ts#L116)).
2. **IR compile** — parse the composed XML and lower it to `StylesheetIR`,
   including XPath parsing for every expression
   ([compileStylesheet](../src/xslt/compile/compiler.js)).
3. **Emit module** — render the generated TypeScript. For stylesheets outside the
   native slice this embeds the entire IR as serialized JSON, which is what makes
   the module ~34 MB ([emitStylesheetModule](../src/xslt/codegen/emit.js)).
4. **Append source-map URL** — one slice over the full ~34 MB module string
   ([appendSourceMappingUrl](../src/processor/runtimeArtifacts.ts#L97)).
5. **Analyze + sort diagnostics** — run analyzers over the IR and order the
   results ([analyzeStylesheet](../src/xslt/compile/analyze.js),
   [sortDiagnostics](../src/diagnostics/index.js)).
6. **Emit declaration + source map** — emit the `.d.ts` and build a line-by-line
   source map by splitting the ~34 MB module into ~3M lines
   ([createStylesheetSourceMap](../src/processor/runtimeArtifacts.ts#L106)).

## 4. Suspected hotspots

These are hypotheses to confirm with the instrumentation in Phase 1, listed
roughly in order of suspicion. None of these are confirmed as the dominant cost
yet.

- **Source-map generation over a 34 MB / ~3M-line module.**
  `createStylesheetSourceMap` splits the whole module into an array of lines and
  walks every generated line. At ~3M lines this is the most obviously
  size-coupled phase, and it runs on output that, for the fallback path, nobody
  steps through line-by-line anyway.
- **Diagnostics analysis and ordering.** 3,053 diagnostics came out the other
  end. If any analyzer pass or the sort comparator is super-linear in template
  count or diagnostic count, it compounds badly on a stylesheet this large.
- **Fallback IR serialization.** The fallback path serializes the entire
  `StylesheetIR` to JSON. The IR carries full provenance/location metadata
  (see [Fallback File Size Findings](CODEGEN_FALLBACK_SIZE.md)), so the object
  being stringified is very large.
- **Memory pressure masquerading as CPU time.** A phase that allocates enough
  temporary strings, arrays, or IR objects to trigger repeated GC can look like
  a slow compiler when the real problem is heap churn. Phase timings without at
  least coarse memory snapshots risk misidentifying the bottleneck.
- **IR compile / XPath parsing.** Thousands of XPath expressions are parsed during
  lowering. Per-expression work is fine; the risk is repeated work (re-parsing,
  re-resolving QNames, or re-walking shared subtrees).
- **Composition serialization.** `serializeToString` per top-level node plus a
  final `join('')` is linear, but worth confirming it is not re-serializing shared
  subtrees across many includes.

## 5. Measured breakdown

The first benchmark run against `S1000D_main.xslt` gives us the answer we were
missing when this plan started:

| Phase               |         Time |
| ------------------- | -----------: |
| Compose             |       573 ms |
| IR compile          | 1,620,367 ms |
| Emit module         |       228 ms |
| Analyze diagnostics |       169 ms |
| Emit declaration    |       232 ms |
| Emit source map     |        97 ms |
| Total               | 1,621,688 ms |

The conclusion is unambiguous: the compile is not source-map bound. It is almost
entirely dominated by `compileIr`, which means the next step is to instrument
inside the IR compiler and its XPath parsing/lowering path, not to spend the next
cycle on source-map removal.

The first IR counters from that same run are also informative:

| Counter                      |  Value |
| ---------------------------- | -----: |
| XPath parses                 | 31,388 |
| Unique XPath strings         |  2,199 |
| Match-pattern parses         |  3,458 |
| Unique match-pattern strings |    681 |
| QName resolutions            | 33,391 |
| Template rules               |  3,493 |
| Global bindings              |    144 |

The instruction mix is broad, but not mysterious:

| Instruction kind |  Count |
| ---------------- | -----: |
| literalText      | 16,282 |
| literalResult    | 13,364 |
| valueOf          |  6,441 |
| if               |  6,753 |
| applyTemplates   |  4,229 |
| callTemplate     |  5,435 |
| attribute        |  3,508 |
| choose           |  2,023 |
| variable         |  1,698 |
| number           |    121 |
| forEach          |     27 |
| copyOf           |      2 |
| comment          |     20 |
| literalElement   |      8 |
| globalParam      |    140 |
| globalVariable   |      4 |

Those counts point to repeated expression parsing and QName resolution rather
than a single exotic instruction kind. The next profiler pass should therefore
measure the cost of the repeated XPath and match-pattern strings themselves,
along with QName normalization hot spots, rather than only counting IR nodes.

The benchmark output now includes per-expression timing summaries for XPath
parsing, match-pattern parsing, and QName normalization. The next large run can
use those summaries to decide whether a small number of repeated sites dominate
the 27-minute compile or whether the cost is spread more evenly across many
distinct expressions.

## 6. Next profiler pass

The next benchmark should split `compileIr` into smaller timed slices instead of
timing the whole lowering step as one opaque block. That split is already in
flight: `compileIr` now reports phase timings for parsing, static-context
collection, validation passes, and the top-level lowering loop, and the lowering
loop itself is being subdivided by declaration kind. The next pass should answer
which of these buckets owns the 1,620-second wall-clock:

- XML parse / stylesheet DOM walk
- include/import handling during composition-to-IR lowering
- instruction lowering by node kind
- XPath parse count and time
- match-pattern parse count and time
- QName resolution
- location/span construction
- template and rule registration
- any repeated traversal over the same subtree or expression text

The most useful follow-up counters are the ones that can be tied back to actual
compiler work:

- number of XPath expressions parsed
- number of unique XPath expression strings
- number of match patterns parsed
- number of IR nodes produced
- number of location/span objects constructed
- time spent per instruction kind
- top slowest XPath or match-pattern strings
- include/import-expanded node count
- coarse GC / heap usage deltas during lowering
- time spent parsing individual XPath strings and match patterns, sorted by the
  slowest expressions

If this pass shows one or two expression or pattern strings dominating, then the
next optimization target is likely repeated parsing or resolution. If instead the
time is spread broadly across instruction lowering, the problem is more likely an
accidental quadratic walk or repeated subtree traversal.

Given the current counts, the first follow-up should likely be a per-expression
timing breakdown for XPath and match-pattern parsing, plus a separate counter for
QName normalization call sites inside the compiler helpers.

The concrete suspects this pass should rule in or out are:

- parsing the same XPath many times
- parsing the same match pattern many times
- resolving QNames by rescanning namespace state on every node
- walking all templates or rules for each new template or rule
- constructing source locations repeatedly via line/column lookup
- building provenance data too eagerly for nodes that never need it later
- a pathological loop that re-traverses the composed tree instead of lowering it once

The latest benchmark run confirms the next split target. Inside
`lowerTopLevelDeclarations`, `xsl:template` lowering dominates the runtime, with
individual template declarations taking hundreds to thousands of milliseconds
each. By contrast, `xsl:param` and `xsl:variable` lowering are small enough to
be noise in this profile. With 3,493 template rules and about 1,491,210 ms in
template-heavy lowering, the average cost is roughly 427 ms per template, which
is far more consistent with an algorithmic problem than with generic TypeScript
or V8 overhead.

That changes the suspect list substantially. The broad earlier suspects
(`XPath`, QName resolution, source maps, diagnostics) now mostly have alibis.
The next useful profiler pass should focus on template lowering itself and
distinguish between two shapes of failure:

- all templates are uniformly expensive, which points to a bad core lowering
  algorithm or an accidental `O(n^2)` scan
- a small number of templates are pathological, which points to specific
  recursive revisits, repeated lookups, or unusually expensive bodies

The next measurement should therefore report the slowest templates rather than
more generic parser counters. The minimum useful fields are:

- template name or match text
- total lowering time
- instruction count
- XPath count
- child node count

That report should make it obvious whether the problem is spread evenly across
the corpus or concentrated in a handful of pathological templates.

That result is now in hand, and it points strongly toward pathological
templates rather than uniformly expensive lowering. The latest Vision benchmark
reported:

- `lowerTemplateDeclarations`: about 1,509,846 ms across 3,493 invocations
- `lowerGlobalVariableDeclarations`: about 168 ms across 4 invocations
- `lowerGlobalParamDeclarations`: about 16 ms across 1 invocation

The top slow templates were not random small templates hovering around the
same average. Instead, a small set of templates rose far above the rest:

- `match="internalRef"`: about 8.2 s, 353 instructions, 236 XPath parses, 11 child nodes
- `name="addBoldTitle1"`: about 4.8 s, 241 instructions, 48 XPath parses, 5 child nodes
- `match="catalogSeqNumber/itemSequenceNumber | catalogSeqNumber/itemSeqNumber"`:
  about 3.6 s, 194 instructions, 73 XPath parses, 5 child nodes
- repeated `match="/dmodule/identAndStatusSection"` entries: about 3.3-3.4 s,
  208 instructions, 25 XPath parses, 7 child nodes

That is a more useful shape than the earlier average of roughly 427 ms per
template. The average still says there is a serious algorithmic problem, but
the slowest-template table says the next inspection should start with a handful
of clearly pathological templates and the logic they trigger, not with a theory
that every template is equally bad.

The next useful profiler pass should therefore enrich the per-template report
with why those specific templates are expensive, for example:

- nested instruction count by kind inside the template
- call-template count and target names
- apply-templates count and mode usage
- repeated lowering of the same named template or same match text
- whether expensive templates correlate with large choose/call-template trees

That enriched pass is now in hand. It shows that the pathological templates are
not merely large; they have distinctive internal shapes:

- `match="internalRef"`: about 8.8 s, 229 instructions, 236 XPath parses,
  37 `call-template`, 19 `apply-templates`, 28 `choose`, 11 variables, and 77
  literal-result nodes
- `name="addBoldTitle1"`: about 5.0 s, 193 instructions, 48 `call-template`,
  all targeting `language_lookup`
- repeated `match="/dmodule/identAndStatusSection"` entries: about 3.5-4.1 s,
  with 17 `call-template`, 16 `apply-templates`, and repeated calls to
  `decode_security_class` and `language_lookup`

That aggregate view is now in hand, and it changes the optimization target
again. The worst single template instances are still useful, but the larger
story is that a small set of repeated template keys dominates total lowering
time:

- `match="/dmodule/identAndStatusSection"`: 21 invocations, about 76.5 s total,
  about 3.64 s average, about 4.27 s max
- `match="warning"`: 42 invocations, about 69.4 s total, about 1.65 s average
- `match="caution"`: 42 invocations, about 59.9 s total, about 1.43 s average
- `match="dataRestrictions/restrictionInstructions"`: 21 invocations, about
  34.0 s total, about 1.62 s average
- `match="reqCondGroup"`: 42 invocations, about 32.4 s total, about 771 ms average

That is the clearest evidence so far that the compile is paying repeatedly for
the same expensive lowering shapes, not merely suffering from a long tail of
unrelated templates. The next useful profiler pass is therefore narrower than
another broad template summary: it should explain why these repeated keys are
expensive when lowered many times.

The leading hypotheses from this run are:

- repeated `call-template` targets such as `language_lookup`,
  `decode_security_class`, and `applic_add_data_attribute`
- repeated `apply-templates` mode sets such as `div_mode`, `dmstatus`,
  `internalRef`, `numberOnly`, and the `*_irtt95` modes
- repeated validation or lookup work tied to the same template body shape

The next code change should therefore instrument repeated call-template target
usage and repeated apply-template mode usage at the instruction compiler layer,
so the next benchmark can say whether the total time is explained by a few
specific callee or mode patterns inside those aggregate hotspots.

That turned out not to be the highest-leverage next fix. The faster aggregate
view exposed a more fundamental issue: the composed Vision stylesheet was
pulling the same imported match templates into the final source many times over,
so the compiler was repeatedly lowering identical templates from `common.xslt`
and other shared imports. The first fix therefore moved one layer earlier than
instruction-level profiling:

- exact duplicate unnamed `xsl:template` entries are now pruned during
  composition, not only duplicate named templates / params / variables
- the benchmark script can now emit a composition summary showing how many
  top-level entries were dropped before IR lowering

On the full `S1000D_main.xslt` graph, that composition-level dedupe removed
2,965 duplicate top-level entries. Representative collapses from the summary:

- `template:warning`: 42 occurrences before prune, 2 after
- `template:caution`: 42 before, 2 after
- `template:reqCondGroup`: 42 before, 2 after
- `template:simplePara`: 63 before, 3 after

That single change cut the full benchmark from roughly 31 minutes to roughly
72.5 seconds:

| Phase               |                     Time |
| ------------------- | -----------------------: |
| Compose             |                   659 ms |
| IR compile          |                71,709 ms |
| Emit module         |                    48 ms |
| Analyze diagnostics |                    40 ms |
| Emit declaration    |                    40 ms |
| Emit source map     |                    18 ms |
| Total               | **72,523 ms (~1m12.5s)** |

The remaining hotspot was then no longer template-specific business logic. A
smaller-slice rerun on `common.xslt` showed another root-level issue: the
source-location helpers were recomputing line-start offsets for the entire
stylesheet source on every call to `getNodeSourceLocation`,
`getAttributeValueSourceLocation`, and `getElementNameSourceLocation`. Those
helpers sit directly on the template lowering hot path.

Caching line-start offsets per stylesheet source cut the `common.xslt` slice
from about 3.1 seconds to about 156 ms, and the full `S1000D_main.xslt`
benchmark from about 72.5 seconds to about 850 ms:

| Phase               |                Time |
| ------------------- | ------------------: |
| Compose             |              497 ms |
| IR compile          |              202 ms |
| Emit module         |               48 ms |
| Analyze diagnostics |               36 ms |
| Emit declaration    |               38 ms |
| Emit source map     |               20 ms |
| Total               | **850 ms (~0.85s)** |

The corresponding IR/compiler counters after both fixes make the change in work
visible:

| Counter              | Before fixes | After both fixes |
| -------------------- | -----------: | ---------------: |
| Template rules       |        3,493 |              754 |
| Global bindings      |          144 |               44 |
| XPath parses         |       31,388 |            5,972 |
| Match-pattern parses |        3,458 |              719 |
| QName resolutions    |       33,391 |            6,145 |
| Diagnostics produced |        3,053 |              199 |
| Generated module     |       ~34 MB |          ~6.8 MB |

The practical conclusion is different now than it was earlier in this document:
the dominant problem was not an intrinsically expensive handful of template
bodies. It was two forms of repeated work at shared infrastructure boundaries:

- repeated lowering of identical imported match templates during composition
- repeated full-source rescans while materializing source locations

The cold compile target of five minutes is no longer the relevant bar for this
workload. The current measured result is comfortably below one second on this
machine. The next optimization work, if any, should be driven by new real-world
regressions rather than by the earlier 31-minute baseline.

For future recurrence checks, the benchmark script now has a faster human loop:

```text
npx tsx scripts/benchmark-compile.ts --compose-summary --summary \
  --fail-if-total-ms 2000 \
  --fail-if-compile-ir-ms 500 \
  --fail-if-lower-template-ms 250 \
  --fail-if-template-rules-over 1000 \
  --fail-if-xpath-parses-over 10000 \
  ".workbench/vision xslts/S1000D/S1000D_main.xslt"
```

That command gives a compact report with the dominant phase, template-rule and
XPath parse counts, the hottest template key, and the top duplicate-composition
summary. It also exits non-zero if the compile regresses past the specified
budget, which makes it suitable for local guardrails and later CI wiring.

## 7. Plan

The plan below is ordered by expected leverage against the **5-minute cold
compile target**. That 5-minute number is the product bar, not an assumption
about where the time will go. Phase 1 may show that the engine itself is much
faster than the headline number suggests and that one engine subphase is
consuming most of the budget.

The first priority is not to make the compiler theoretically faster; it is to
remove the most expensive work from the default path that users actually hit.

### Phase 1 — Make the cost visible

Goal: turn the existing coarse progress labels into real per-phase timings so we
attack the right phase.

- Wrap each phase in [runtimeArtifacts.ts](../src/processor/runtimeArtifacts.ts#L29)
  with a high-resolution timer and report elapsed milliseconds per phase through
  the same `onProgress` channel (opt-in, off by default).
- Capture coarse memory snapshots alongside phase timings so we can tell whether
  a slow phase is compute-bound or spending most of its wall-clock in GC.
- Add a small throwaway benchmark script under `scripts/` that compiles a target
  stylesheet and prints the per-phase breakdown plus totals, so re-measuring is a
  one-liner instead of an ad-hoc inline script.
- Re-run against `S1000D_main.xslt` and record the per-phase split in this doc.

Implementation checklist:

- Add a lightweight timing accumulator in
  [src/processor/runtimeArtifacts.ts](../src/processor/runtimeArtifacts.ts#L29)
  that can wrap:
  `compileStylesheet`, `emitStylesheetModule`, `analyzeStylesheet`,
  `emitStylesheetDeclarationModule`, and `createStylesheetSourceMap`.
- Record `process.memoryUsage()` snapshots before and after each measured phase
  in the benchmark path, and at minimum capture `heapUsed` and `rss` deltas so
  the phase table shows whether time and memory move together.
- Extend the compile options in
  [src/processor/runtimeArtifacts.ts](../src/processor/runtimeArtifacts.ts#L6)
  and [src/processor/compile.ts](../src/processor/compile.ts#L24) so callers can
  opt into a structured timing report without changing existing behavior.
- Time composition separately inside
  [src/processor/compile.ts](../src/processor/compile.ts#L92) and
  [src/processor/compile.ts](../src/processor/compile.ts#L116), since that work
  happens before `compileStylesheetRuntimeArtifacts` starts.
- Add a reusable benchmark entrypoint under `scripts/` that accepts a stylesheet
  path, prints total wall-clock plus per-phase timings, and can be reused in CI
  or local profiling runs.
- Record one baseline run for `S1000D_main.xslt` in this document once the
  timings are available, then use that table as the acceptance gate for Phase 2.

Exit criteria: we can state, with numbers, which phase owns most of the 31 minutes.

That criterion is now met. The next move is to break `compileIr` into smaller
timed subphases so we can distinguish parser, XPath lowering, QName resolution,
and any repeated subtree work from one another.

### Phase 2 — Cut work that is not needed for the result

Goal: stop paying for artifacts a given caller never consumes.

- **Make source-map generation optional / lazy.** The benchmark says this is not
  the current hotspot, so this becomes a secondary optimization unless later
  evidence shows a regression here. It is still worth keeping on the list because
  the fallback path currently pays for it by default.
- **Make declaration (`.d.ts`) emission optional.** Same reasoning: only emit it
  when the caller actually writes a declaration file.
- **Short-circuit diagnostics work for callers that ignore diagnostics** where the
  API allows it, without weakening the diagnostics-first contract for callers that
  do consume them.

Exit criteria: the default workbench/preview path no longer pays for source maps
or declarations it discards.

### Phase 3 — Fix the algorithms

Goal: remove super-linear behavior in whichever phase Phase 1 fingerprinted.

- If source-map generation stays required, replace the full split-and-walk with a
  streaming or offset-based mapping that does not materialize ~3M line strings.
- If diagnostics analysis is the cost, profile the offending analyzer pass and the
  sort comparator; ensure ordering is `O(n log n)` and that passes do not rescan
  the whole template set per node.
- If IR compile is the cost, cache parsed/resolved XPath and QName results so
  repeated expressions are not re-parsed, and avoid re-walking shared subtrees.
- If the hotspot is repeated XPath or match-pattern parsing, add a parse cache
  keyed by expression text plus the relevant static context.
- If the hotspot is location/span construction, delay or memoize source-location
  materialization so it does not happen more than once per IR node.
- If the hotspot is template or rule registration, check for repeated scans of
  the full table and replace them with indexed lookups where possible.

Exit criteria: the dominant phase scales close to linearly in stylesheet size.

### Phase 4 — Structural wins for repeated compiles

Goal: make the _second_ compile cheap, which is what watch-mode and the workbench
actually do.

- Cache composed include/import results keyed by file path + content digest so an
  edit to the entry file does not re-read and re-serialize every unchanged import.
- Reuse the existing content digest
  ([createStylesheetDigest](../src/processor/runtimeArtifacts.ts#L81)) to skip
  recompiling when neither the composed source nor the extension catalog changed.
- Consider a persisted on-disk artifact cache for CI, keyed by the same digest.

Exit criteria: an incremental recompile after a one-line edit is dramatically
cheaper than a cold compile.

## 8. Targets

These targets are intentionally concrete. Phase 1 may change which work gets us
there, but it should not relax the bar without a better replacement plan.

- Cold compile of `S1000D_main.xslt`: **5 minutes or less**.
- Interim checkpoint after Phase 2: **under 10 minutes** on the same machine and input.
- Incremental recompile (watch mode, single-file edit): seconds.
- No phase scaling worse than `O(n log n)` in stylesheet size.

If the benchmark later shifts and shows artifact work taking over, then the
default fallback compile path should treat skipping those artifacts as the first
line of defense. For now, the data says the IR compiler itself is the problem.

## 9. Non-goals

- Reducing the 34 MB module size — that is owned by
  [Fallback File Size Findings](CODEGEN_FALLBACK_SIZE.md). Size and speed
  interact, but the size strategy is tracked separately.
- Changing semantics or weakening the diagnostics-first contract. Performance work
  here must preserve identical IR, identical diagnostics, and identical output.

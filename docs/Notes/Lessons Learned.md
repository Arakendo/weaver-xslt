# Lessons Learned

This page collects durable implementation lessons from the engine, CLI, workbench,
and corpus work.

## Vision S1000D runtime work

- Host wiring issues can hide the real engine bug. Before changing the corpus,
  verify file-based composition, stylesheet parameters, and base URI handling
  against real inputs.
- Arithmetic in XPath should convert singleton items numerically, not require
  the operand to already be an `xs:double` or `xs:integer`. Real XSLT
  variables often carry node values that must be coerced at the operator
  boundary.
- A focused corpus probe is more useful than a broad sweep when the failure is
  already localized. Keep the smallest real input that reproduces the current
  semantic gap.
- Temporary asset stubs are useful for isolating engine behavior, but they
  should stay local to the probe so missing workspace assets do not get
  mistaken for stylesheet regressions.
- Some Vision S1000D stylesheets resolve `../../Languages/*.resx` relative to
  `.workbench/vision xslts/S1000D`, which lands at `.workbench/Languages`.
  When mirroring the corpus in a temp probe, place the language assets there or
  the runtime will report a file-not-found error even if the source assets are
  present one directory lower.
- The real compile bottleneck is not always the artifact you expect. A timed
  benchmark on `S1000D_main.xslt` showed `compileIr` consuming nearly the entire
  31-minute compile, while source-map generation was under a second. Measure the
  actual phase before spending time on the obvious-looking one.
- When a whole phase dominates wall-clock, split it again before optimizing.
  `compileIr` was too coarse: the next useful question is which parser, resolver,
  or lowering substep is actually burning the time.
- TypeScript object churn matters, but it rarely explains a 31-minute compile by
  itself. If the profiler says one lowering phase owns nearly all the time, look
  for repeated work, quadratic scans, or repeated parse/resolve steps before
  blaming allocation alone.
- A large compile can still be dominated by repeated parser and resolver work.
  On `S1000D_main.xslt`, the IR counters showed tens of thousands of XPath parses
  and QName resolutions against only a few thousand unique expressions, which is
  a strong hint that caching or deduplicating parse/resolution work will matter
  more than shaving a few allocations.
- If one IR bucket still dwarfs all others after the first split, split that
  bucket again before chasing micro-optimizations. In this case the top-level
  lowering loop became the only meaningful `compileIr` hotspot, so it needed to
  be broken down by declaration kind before the next benchmark could say where
  the time really went.
- After splitting by declaration kind, the `xsl:template` branch turned out to
  dominate the remaining lowering time, while `xsl:param` and `xsl:variable`
  lowering were negligible. That is a useful reminder to keep splitting the hot
  branch itself instead of treating all declarations as one category.
- Once template lowering is isolated, average time per template becomes a much
  better signal than aggregate parser counters. Roughly hundreds of milliseconds
  per template is a strong hint that the next profiler view should rank the
  slowest templates and compare their instruction count, XPath count, and child
  node count before assuming the parser or runtime is the root cause.
- A slowest-template table is more actionable than a global average. On the
  Vision stylesheet, the next split showed that a small number of templates such
  as `internalRef`, `addBoldTitle1`, and `/dmodule/identAndStatusSection` were
  taking seconds each, which is a much stronger lead than “template lowering is
  slow” in the abstract.
- After the slowest-template view is in place, aggregate by template key before
  assuming the biggest single instance is the real hotspot. On the Vision
  stylesheet, repeated keys such as `/dmodule/identAndStatusSection`, `warning`,
  and `caution` dominated total lowering time even when their individual
  instances were not always the single slowest rows, which is a stronger signal
  for repeated algorithmic work than any one outlier template.
- Rich template-shape metrics are useful mainly when they can be tied back to
  repeated patterns. The most actionable next question was not “how many
  instructions does this hot template have?” but “does this family of templates
  repeatedly call the same named templates or use the same apply-templates mode
  sets?”
- If aggregate template hot spots line up with repeated imports of shared
  stylesheets, inspect the composition boundary before optimizing template
  bodies. In the Vision S1000D graph, the real problem was that identical
  unnamed match templates from `common.xslt` and similar shared imports were
  being lowered dozens of times, and composition-level dedupe removed thousands
  of duplicate top-level entries before IR compile even started.
- Source-location helpers are part of the hot path, not just diagnostics glue.
  Recomputing line-start offsets for the full stylesheet string on every call to
  `getNodeSourceLocation` or `getAttributeValueSourceLocation` turned out to be
  catastrophic once template duplication was removed. Cache source-derived
  indexing structures per stylesheet source before assuming the remaining cost
  belongs to XPath or instruction lowering itself.

## Documentation habits

- Record the lesson where the work happened, then link to it from the main docs
  nav so it stays visible during future changes.
- Keep entries short and specific. The goal is a durable debugging memory, not a
  running log of every probe.

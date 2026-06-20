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

## Documentation habits

- Record the lesson where the work happened, then link to it from the main docs
  nav so it stays visible during future changes.
- Keep entries short and specific. The goal is a durable debugging memory, not a
  running log of every probe.

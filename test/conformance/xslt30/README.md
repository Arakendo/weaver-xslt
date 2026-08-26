# XSLT 3.0 conformance slices

This directory will hold the staged XSLT 3.0 conformance harness for MVP+3 and
later increments.

## MVP+3 stance

Do not start by running the full `vendor/xslt30-test` catalog.

MVP+3 should use:

- focused goldens for the current vertical slice
- a curated `xslt30-test` subset filtered to the supported feature set

The first slice should stay narrow enough that failures answer a useful
question such as:

- did literal result elements serialize correctly?
- did `xsl:value-of` read the intended source data?
- did `xsl:apply-templates` and the built-in root/text behavior do the right
  thing?

## What belongs in the first curated slice

- literal result element cases
- `xsl:value-of`
- `xsl:apply-templates`
- built-in root/text behavior
- minimal template dispatch cases that fit the current priority rules

## What does not belong yet

- `xsl:mode`
- `xsl:import` / `xsl:include`
- `xsl:key`
- `xsl:number`
- `xsl:sort`
- non-XML output methods
- cases whose main value is serializer breadth rather than the current core
  interpreter slice

## Working rule

Treat `xslt30-test` the same way the QT3 harness treats the broader catalog:
pick an honest denominator, document why cases are excluded, and widen the
baseline only when the current slice is stable enough to classify failures.

Use `npm run inventory:xslt30-metadata` to inspect the complete pinned suite
metadata and `npm run rank:xslt30-families` to reproduce the retained
small-family execution ranking. Candidate ranking does not admit cases by
itself; admission still requires a versioned overlay that preserves every
member of the chosen upstream family.

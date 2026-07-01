# S1000D HTML Health Audit

> Scope: inspect generated HTML outputs for signs of incomplete transformation,
> missing structure, or placeholder rendering that suggests holes in the XSLT
> -> TS -> IR path.
>
> Source set: `.workbench/S1000D/ValidXml/S1000D Issue 5.0`
> Output set: `.workbench/S1000D/bundle-output-full`

## What this audit is looking for

This audit is not trying to judge whether the stylesheet text itself contains
warning phrases. It is looking for HTML outputs that appear structurally thin,
stub-like, or incomplete compared to the rest of the corpus.

Useful signals:

- missing or malformed top-level HTML structure
- empty or placeholder titles / identifiers
- very short outputs for modules that normally render a full document body
- explicit fallback language such as "not yet implemented"
- outputs that appear to be shells rather than transformed content

## Initial findings

The current batch run produced `99` HTML files in the full bundle output.
The generated files are generally well formed at the HTML shell level:

- `DOCTYPE` was present in the sampled outputs
- `<html>`, `<head>`, and `<body>` were present in the sampled outputs
- no obvious broken or truncated HTML shells were found in the initial pass

That means the likely issue is not a broken HTML serializer. The more
interesting problem is module coverage: some outputs are clearly stubs or
fallback pages instead of full transformed documents.

## Strong hole candidates

### 0. BREX module is a performance outlier

The `022A` BREX module (`DMC-S1000DBIKE-AAA-D00-00-00-00AA-024A-D_002-00_EN-US.XML`)
did not appear as a bad HTML shell; instead it behaved like a transform hang
or extreme slowdown and hit the batch timeout at `30032 ms`.

Why this matters:

- this is a separate class of hole from malformed HTML
- it suggests a path in the XSLT -> TS -> IR pipeline that may be either very
  expensive or stuck on a construct the current emitter/runtime handles poorly
- it should be checked alongside the coverage holes, because a transform that
  cannot finish is just as blocking as one that renders an empty shell

This file should stay on the audit watchlist even if its eventual HTML output
is structurally valid, because the failure mode is excessive transform time
rather than obvious markup damage.

### 1. Unsupported DDN / DML modules

Examples:

- `DDN-S1000DBIKE-B6865-B6865-2019-00001.html`
- `DML-S1000DBIKE-B6865-S-2019-00001_001-00.html`

Observed shape:

- output length: `538` bytes
- `dmType = "UNSUPPORTED"`
- empty `currentDMC`
- empty `<title>` prefix
- body contains `This DM Type is not yet implemented`

Why this matters:

- these are valid HTML shells, but they are effectively fallback stubs
- they suggest the stylesheet / IR / emitter path is not handling the module
  family yet
- if these should be supported by the production pipeline, they are a real hole
  in coverage rather than a formatting issue

Concrete examples from the current batch:

| File                                                  |       Size | Signal                   | Why it looks incomplete                                                  |
| ----------------------------------------------------- | ---------: | ------------------------ | ------------------------------------------------------------------------ |
| `DDN-S1000DBIKE-B6865-B6865-2019-00001.html`          |  538 bytes | `dmType = "UNSUPPORTED"` | Placeholder shell, empty title/body, explicit "not yet implemented" text |
| `DML-S1000DBIKE-B6865-S-2019-00001_001-00.html`       |  538 bytes | `dmType = "UNSUPPORTED"` | Same fallback pattern as the DDN above                                   |
| `PMC-S1000DBIKE-B6865-LOAP1-00_004-00_SX-US.html`     |  849 bytes | small publication shell  | Valid HTML, but suspiciously tiny for a published module                 |
| `PMC-BRAKE-B6865-EPWG1-00_004-00_SX-US.html`          |  963 bytes | small publication shell  | Valid HTML, but looks like a minimal stub rather than a full publication |
| `PMC-S1000DBIKE-B6865-EPWG1-00_004-00_SX-US.html`     |  964 bytes | small publication shell  | Same pattern: HTML shell exists, content is very sparse                  |
| `PMC-S1000DLIGHTING-B6865-EPWG1-00_004-00_SX-US.html` | 1008 bytes | small publication shell  | Same pattern: likely minimal or missing sections                         |

These are the best starting points for tracing gaps back into the XSLT -> TS
emitter path.

### 2. Publication modules are rendered as very small shells

Examples:

- `PMC-BRAKE-B6865-EPWG1-00_004-00_SX-US.html`
- `PMC-S1000DBIKE-B6865-EPWG1-00_004-00_SX-US.html`
- `PMC-S1000DBIKE-B6865-LOAP1-00_004-00_SX-US.html`
- `PMC-S1000DLIGHTING-B6865-EPWG1-00_004-00_SX-US.html`

Observed shape:

- output lengths are in the `849` to `1008` byte range
- the HTML shell is intact
- these are not malformed, but they are very small compared to the rest of the
  corpus

Why this matters:

- they may be intentionally minimal publication pages
- or they may be missing expected publication sections that should have been
  emitted by the stylesheet
- they should be compared against the source XSLT / TS emitter path before
  being marked as acceptable

## Outputs that look healthy

Most data-module outputs in the current batch are not tiny shells. They land in
the `8 KB` to `70 KB` range and appear to contain real rendered content.

Examples from the slower / larger set:

- `DMC-S1000DBIKE-AAA-D00-00-00-00AA-009A-A_003-00_EN-US.html`
- `DMC-S1000DBIKE-AAA-D00-00-00-00AA-258A-A_010-00_EN-US.html`
- `DMC-S1000DLIGHTING-AAA-D00-00-00-00AA-00EA-D_003-00_EN-US.html`

These are not automatically “good,” but they do not currently show the same
stub-like profile as the unsupported module types above.

## Schema-type spot checks

The following representative outputs look structurally complete and help
separate real XSLT/IR gaps from module families that are already rendering
coherently.

| Schema family          | File                                                             | `dmType`      | Title                                          |  Size | Quick read                                                                    |
| ---------------------- | ---------------------------------------------------------------- | ------------- | ---------------------------------------------- | ----: | ----------------------------------------------------------------------------- |
| Descriptive            | `DMC-BRAKE-AAA-DA1-00-00-00AA-041A-A_003-00_EN-US.html`          | `DESCRIPTIVE` | `Brake system - Description of how it is made` | 14076 | Full HTML shell with normal title/body content                                |
| IPD                    | `DMC-S1000DBIKE-AAA-D00-00-00-01AA-941A-D_009-00_EN-US.html`     | `IPD`         | `Bicycle - Illustrated Parts Data - IPD`       | 15164 | Appears structurally healthy and title is complete                            |
| Procedural             | `DMC-BRAKE-AAA-DA1-00-00-00AA-341A-A_003-00_EN-US.html`          | `PROCEDURAL`  | `Brake system - Manual test`                   | 11246 | Full shell, non-trivial body content                                          |
| Crew-tagged procedural | `DMC-S1000DBIKE-AAA-D00-00-00-00AA-121A-A_010-00_EN-US.html`     | `PROCEDURAL`  | `Bicycle - Pre-operation procedures (crew)`    | 24271 | Looks complete; crew-specific content is rendering inside a procedural module |
| Wire / wiring          | `DMC-S1000DLIGHTING-AAA-D00-00-00-00AA-057A-A_010-00_EN-US.html` | `WIRINGDATA`  | `Wiring - Wire list`                           | 36524 | Large, healthy output; wiring content is clearly emitted                      |

These spot checks are useful because they show that the bundle is not failing
universally by schema family. The audit should treat them as control cases when
tracking missing HTML or timeout holes.

## Working hypothesis

The most promising audit path is to treat the HTML as a downstream symptom and
ask:

1. Which module families are being rendered by fallback templates?
2. Which module families are producing only shell pages or placeholder bodies?
3. Which XSLT -> TS emitter paths fail to lower the right instructions or
   XPath expressions for those families?

That framing should help distinguish a genuine IR/emitter hole from a page type
that is intentionally minimal.

## Next checks to run

- Inspect the BREX module that timed out during the batch run:
  `DMC-S1000DBIKE-AAA-D00-00-00-00AA-024A-D_002-00_EN-US.XML`
  - confirm whether the hang is caused by a specific instruction family,
    XPath expression, or document-resolution call
  - compare the same module under interpreter vs emitted-bundle execution if
    the interpreter path completes faster
- Compare the unsupported DDN / DML outputs against the source stylesheet logic
  under `.workbench/vision xslts/S1000D/` to see where the fallback branch is
  chosen.
- Compare a small publication module against its stylesheet path to determine
  whether the tiny output is expected or missing content.
- Add a simple output-health classifier for future batches:
  - shell-only / unsupported
  - minimal but valid publication page
  - full rendered module
  - suspiciously empty or truncated

## Notes for future audits

The first pass should not use generic words like "error" or "warning" inside
the HTML as a failure signal, because those phrases can legitimately appear in
source-derived content. Structural signals and module-family expectations are
more reliable.

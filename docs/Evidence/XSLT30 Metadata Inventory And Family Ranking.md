# XSLT30 Metadata Inventory And Family Ranking

- Status: observed checkpoint
- Suite revision: `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b`
- Retained discovery report: `corpus/reports/xslt30-family-ranking-v1.json`
- Retained semantic delta: `corpus/reports/xslt30-family-ranking-v2.json`
- Retained arithmetic delta: `corpus/reports/xslt30-family-ranking-v3.json`
- Retained completed-family delta: `corpus/reports/xslt30-family-ranking-v4.json`
- Retained root output-declaration delta: `corpus/reports/xslt30-family-ranking-v5.json`
- Retained root XDM-semantics delta: `corpus/reports/xslt30-family-ranking-v6.json`
- Retained document-node delta: `corpus/reports/xslt30-family-ranking-v7.json`
- Retained completed root-family delta: `corpus/reports/xslt30-family-ranking-v8.json`
- Retained conditional-content delta: `corpus/reports/xslt30-family-ranking-v9.json`
- Retained completed conditional-content family delta: `corpus/reports/xslt30-family-ranking-v10.json`
- Retained completed current-family delta: `corpus/reports/xslt30-family-ranking-v11.json`

## Result

Weaver now reproduces metadata accounting across all 14,600 cases in all 234
test sets. The inventory found 9,663 stylesheet references to 7,646 distinct
files and 564 combined dependency, environment, stylesheet, and assertion
shapes. Environments are referenced in 10,798 cases, inline in 2,161, and
absent in 1,641.

The inventory records dependency kinds, specification values, environment
bindings, top-level assertion families, nested assertion elements, and
per-family metadata shape counts. Paths are resolved within the pinned suite
root, duplicate catalog references are rejected, and every referenced
stylesheet file must exist.

## Ranking boundary

The first execution ranking deliberately considers only complete families of
at most 20 cases where every case has exactly one file-backed stylesheet and
one top-level `assert-xml` or `error` assertion. This is a harness-ready
candidate screen, not a conformance claim.

Sixteen families meet that screen, including the already admitted `template`
and `path` families. Each candidate is probed independently under interpreter,
native-direct, and genuine native-emitted execution. The retained report
stores backend pass counts plus a digest over every case identity and execution
disposition, so outcome drift cannot hide behind unchanged aggregate counts.

The leading unadmitted results were:

| Family         | Cases | Interpreter | Native direct | Native emitted |
| -------------- | ----: | ----------: | ------------: | -------------: |
| `deep-equal`   |     2 |           2 |             0 |              0 |
| `for`          |     4 |           1 |             0 |              0 |
| `root`         |    10 |           2 |             0 |              0 |
| `on-non-empty` |    14 |           1 |             1 |              1 |

The complete two-case `deep-equal` family was therefore admitted immediately
under the interpreter profile and passes 2/2. Its native gaps remain visible
in the ranking rather than being mislabeled as parity.

## Peer lesson and next pressure

FastXSLT independently selected the complete four-case `for` family after its
template/path work. Weaver adopts that planning lesson without copying the
peer's narrower capability assumptions: execution probing shows `for-002`
already passes here, while `for-001` requires `xsl:sequence`, `for-003`
exposes sequence arithmetic behavior, and `for-004` requires
`format-number()`. A family overlay now conserves all four members, selecting
the passing case and retaining the other three as explicit engine gaps. That
family is the next semantic decomposition target.

The first decomposition increment adds a source-located `xsl:sequence` IR node
and interpreter sequence construction. `for-001` now passes, moving the family
to 2/2 selected interpreter cases with two remaining engine gaps. Native-direct
and native-emitted stay explicitly unsupported for this instruction. The v2
delta report preserves the original discovery report while recording the
changed backend count and outcome digest.

The second increment corrects XPath unary and binary arithmetic to propagate
an empty operand as an empty result instead of raising `XPTY0004`. This is the
behavior exercised by `for-003`: each return expression is empty and
`sum(())` produces zero. The case now passes, moving the family to 3/3 selected
interpreter cases with only `format-number()` remaining. The v3 delta retains
the corresponding backend count and outcome digest transition.

The third increment adds the basic unnamed-decimal-format picture slice needed
by `format-number()` in `for-004`, including mandatory/optional fractional
digits, three-digit grouping, and structured `FODF1310` rejection outside that
slice. The case passes and completes the family at 4/4 selected interpreter
cases. This does not claim named decimal formats or the complete picture
grammar, and native modes remain separately unsupported.

The next complete-family overlay conserves all ten `root` cases. Its initial
2/10 interpreter result exposed four cases blocked at the same declaration
boundary. Weaver now admits only the output settings already equivalent to its
serializer behavior: `encoding="UTF-8"` (case-insensitive) and `indent="no"`.
Other encodings and affirmative indentation remain structured unsupported
diagnostics rather than ignored promises. Three additional cases pass, moving
the family to 5/10; the fourth requires stylesheet-relative `document()`
resource resolution and remains explicit. Document-node matching,
document-node serialization, and node-kind tests account for the other four
gaps. The v5 delta retains the 2-to-5 transition and its outcome digest.

The second `root` increment recognizes empty `element()` kind tests as path
steps and centralizes DOM-backed XDM node string values. Document and element
string values now concatenate descendant text nodes while excluding comments,
processing instructions, and DOM-only whitespace outside the document
element. Document child navigation applies the same XDM boundary. This moves
`root-0102`, `root-0104`, and `root-0601` into the selected passing set and the
family to 8/10. The v6 delta retains that transition. The remaining cases are
still divided between `document-node()` template matching and explicit
stylesheet-relative resource resolution.

The third `root` increment adds empty `document-node()` kind tests and the
pattern-specific rule needed to match the source document itself. Kind-test
patterns now also receive their standard `-0.5` default priority within the
supported empty-test slice. `root-0101` passes, moving the family to 9/10 and
leaving only stylesheet-relative `document()` resolution. The v7 delta retains
the 8-to-9 transition without changing native support claims.

The final `root` increment corrects corpus execution provenance. The harness
now supplies each file-backed stylesheet's actual pinned path as the explicit
transform base URI, allowing the already-supported `document()` function to
resolve declared sibling resources without falling back to the process working
directory. `root-0502` passes and completes the family at 10/10 selected
interpreter cases. This is not a new ambient resource capability or a native
support claim; the v8 delta records native-direct and native-emitted at 0/10.

The next ranked complete family is the fourteen-case `on-non-empty` set. Its
initial overlay conserves one passing `XTSE0010` ordering diagnostic and
thirteen explicit engine gaps. Eleven cases share conditional sequence-content
buffering pressure, one combines that behavior with `xsl:on-empty`, one adds
`xsl:sort`, and `on-non-empty-002` also exposes a hyphenated XPath name-test
parser gap. This denominator is fixed before any dispositions move.

The first conditional-content increment introduces a source-located IR 1.2
marker for `xsl:on-empty` and `xsl:on-non-empty`. The interpreter buffers the
surrounding sequence constructor, evaluates markers against whether its core
serialized content is empty, and preserves each marker's position and dynamic
variable context. Empty text and empty document-node results remain empty;
ignored fallback content does not make the constructor non-empty. The XPath
parser also accepts keyword-shaped tokens such as `in` as name tests where a
path step is required. These changes move the family to 13/14 interpreter
passes. `on-non-empty-010` remains explicit because it also requires
`xsl:sort`; native-direct and native-emitted remain at their original 1/14.
The v9 delta retains the resulting execution counts and outcome digest.

The final family increment adds leading `xsl:sort` children to
`xsl:for-each` under a deliberately narrow default-text profile: ascending
order, default `select="."`, multiple stable keys, and source-located static
diagnostics for misplaced or unsupported sort forms. This admits
`on-non-empty-010` and completes the interpreter family at 14/14. Native
profiles remain 1/14 because sort and conditional-content emission are still
explicitly unsupported. The v10 delta retains the completed-family counts and
outcome digest without broadening that claim to numeric, descending,
language-sensitive, or custom-collation sorting.

The next ranked uncompleted family is the single-case `current` set. Its
initial zero-pass overlay records that `current-001` is a composed boundary,
not merely a missing function registration: the stylesheet first requires
`xsl:copy`, then predicate-bearing match-pattern evaluation whose `current()`
value is fixed by the outer pattern evaluation. The sibling axis used inside
the predicate is already supported. This denominator is fixed before either
remaining disposition moves.

The completed `current` increment adds a source-located shallow `xsl:copy`
instruction, `xsl:comment select`, and the checked `comment()` template result
annotation used by the upstream stylesheet. XPath dynamic contexts now carry
a distinct XSLT `current()` anchor that survives nested predicate focus
changes. Complex template-dispatch cache keys also distinguish sibling nodes,
preventing a predicate result for one same-named sibling from being reused for
another. `current-001` passes and completes the interpreter family at 1/1;
native modes remain explicitly 0/1. The v11 delta retains this transition and
its outcome digest.

The next ranked one-case family, `sf-fold-right`, is now conserved without
being mistaken for a narrow function addition. Its initial static-global
failure now passes under the bounded boolean gating slice, moving the exact
first failure to its typed stylesheet function. The same upstream case also
composes stylesheet parameters, a named function reference, `fold-right()`, decimal arithmetic,
stylesheet-relative `xsl:source-document`, and a streaming dependency. The
family overlay retains one engine gap while AR-0001 records why reproducing the
expected value through buffering would not establish streamability.

With streaming deferred, the next actionable ranked family is the two-case
non-streaming `innermost` set. Both cases currently fail first on the static
global `$RUN` referenced by `use-when`. Their fixed denominator then separates
the common stylesheet-relative `doc()` and `innermost()` requirements from
the grounded case's additional `snapshot()` requirement. Neither member is
selected merely because Weaver already supports relative `doc()` in other
contexts.

The completed increment admits both cases. Static preprocessing is restricted
to unique boolean top-level variables and direct variable-reference
`use-when` guards; it does not claim a general compile-time XPath evaluator.
The shared XPath engine now owns `doc()` resolution, grounded snapshot copies,
and identity-preserving innermost node reduction in document order. The v12
delta records the interpreter move from 0/2 to 2/2 while both native profiles
remain 0/2.

The next non-streaming candidate, `treat-as`, is not admitted for execution.
All four members depend on schema-aware processing and XSD source-reference
environments; they compose `xsl:import-schema`, derived atomic types, typed
stylesheet functions, and schema-aware result or diagnostic behavior. The
family overlay conserves 0 selected and 4 profile-excluded cases under AR-0002
instead of presenting absent schema typing as ordinary XPath engine failure.

The next applicable candidate is the five-case `initial-mode` family. Its
initial denominator records five harness gaps: the adapter does not yet map the
requested mode name, and its generic parameter loader cannot distinguish the
local and tunnel parameters nested under `<initial-mode>` from top-level
stylesheet parameters. This classification precedes the interpreter's known
initial-mode rejection so adapter and engine work remain independently visible.

## Reproduction

```powershell
npm run inventory:xslt30-metadata
npm run rank:xslt30-families
npx vitest run test/conformance/xslt30/metadataInventory.test.ts test/conformance/xslt30/familyRanking.test.ts test/conformance/xslt30/deep-equal-family.test.ts test/conformance/xslt30/for-family.test.ts test/conformance/xslt30/root-family.test.ts test/conformance/xslt30/on-non-empty-family.test.ts test/conformance/xslt30/current-family.test.ts test/conformance/xslt30/sf-fold-right-family.test.ts test/conformance/xslt30/innermost-family.test.ts test/conformance/xslt30/treat-as-family.test.ts test/conformance/xslt30/initial-mode-family.test.ts
```

These observations apply only to the pinned suite revision and the Weaver
revision containing this record. They do not state a full-suite conformance
percentage.

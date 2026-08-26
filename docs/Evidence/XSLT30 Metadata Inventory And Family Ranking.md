# XSLT30 Metadata Inventory And Family Ranking

- Status: observed checkpoint
- Suite revision: `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b`
- Retained discovery report: `corpus/reports/xslt30-family-ranking-v1.json`
- Retained semantic delta: `corpus/reports/xslt30-family-ranking-v2.json`
- Retained arithmetic delta: `corpus/reports/xslt30-family-ranking-v3.json`

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

## Reproduction

```powershell
npm run inventory:xslt30-metadata
npm run rank:xslt30-families
npx vitest run test/conformance/xslt30/metadataInventory.test.ts test/conformance/xslt30/familyRanking.test.ts test/conformance/xslt30/deep-equal-family.test.ts
```

These observations apply only to the pinned suite revision and the Weaver
revision containing this record. They do not state a full-suite conformance
percentage.

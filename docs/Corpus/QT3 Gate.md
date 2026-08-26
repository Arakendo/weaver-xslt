# QT3 Gate

The QT3 harness deliberately filters the full W3C catalog down to the current
roadmap slice before measuring pass rates. The goal is an honest denominator:
run cases that exercise supported MVP+2 semantics, exclude cases that depend on
later-tier features, and make those exclusions explainable when the slice moves.

ADR-0005 requires these classifications to remain durable ledger outcomes.
The `weaver-mvp2-v1` profile now versions the selected test sets, disposition
policy, expected totals, and a digest over every case outcome. The source
predicate computes the current result; the profile prevents it from silently
changing history.

## What the gate does

- Rejects unsupported environment setup and spec dependencies before execution.
- Rejects later-tier XPath surface such as declarations, imports, higher-order
  function syntax, typed variable declarations, XML constructors, and other
  syntax outside MVP+2.
- Rejects unsupported functions by scanning function-call candidates in the test
  expression and, for `assert-eq`, in the expected expression too.
- Matches supported `fn:*` names case-sensitively so the harness and runtime use
  the same canonical function surface. `fn:QName` is in scope; `fn:qname` is
  not.

## Exclusion reasons

The harness reports exclusions through `getQt3CaseExclusion()` in
`test/conformance/qt3/harness.ts`. Current reasons are:

- `unsupported-environment`
- `unsupported-spec-dependency`
- `unsupported-xsd-version`
- `unsupported-xml-version`
- `unsupported-feature`
- `unsupported-schema-constructor`
- `syntax-not-in-scope`
- `unsupported-function`

`unsupported-schema-constructor` is split out from the generic syntax bucket on
purpose because schema constructor tests are a large, noisy class in QT3 and can
otherwise hide more interesting scope drift.

## Debugging the denominator

The default MVP+2 report conserves all 7,289 upstream cases in its 65 admitted
test sets: 2,487 selected, 1,086 profile-excluded, 2,991 engine-unsupported, 54
harness-unsupported, and 671 metadata failures. The 671 cases use test or
assertion metadata shapes the current adapter does not decode; they are visible
in the denominator instead of being silently skipped.

Use these environment variables with `test/conformance/qt3/mvp2.test.ts`:

- `QT3_BROAD_BASELINE=1` enables the broader baseline test.
- `QT3_HEARTBEAT_SECONDS=<n>` controls heartbeat cadence during long runs.
- `QT3_EXCLUSION_DEBUG=1` prints exclusion counts by reason plus a small sample
  of excluded cases.

Example:

```powershell
$env:QT3_BROAD_BASELINE='1'
$env:QT3_EXCLUSION_DEBUG='1'
$env:QT3_HEARTBEAT_SECONDS='15'
npm test -- test/conformance/qt3/mvp2.test.ts
```

## Extending the gate

When a new MVP slice adds syntax or functions:

1. Add runtime support first.
2. Update the gate so the denominator reflects the newly supported surface.
3. Add focused tests for both inclusion and exclusion behavior.
4. Rerun the broad baseline with `QT3_EXCLUSION_DEBUG=1` to verify the shift is
   understandable.

Keep the gate narrow and explicit. If the denominator changes, it should be
obvious why, and the profile totals and outcome digest must be reviewed
together. See the [QT3 MVP2 profile baseline](../Evidence/QT3%20MVP2%20Profile%20Baseline.md).

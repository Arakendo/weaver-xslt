# XSLT30 Native Parity Baseline

- Date: 2026-08-26
- Weaver baseline: `b883365` plus the checkpoint containing this record
- XSLT30 revision: `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b`
- Profile: `weaver-template-path-native-parity-v1`
- Required backends: interpreter, native-direct, native-emitted
- Platform: Windows, Node.js 22.23.2

## Scope

This profile applies the three-backend parity contract to the same complete
16-case `template` and `path` family inventory used by the interpreter
baseline. It does not shrink the family to cases that happen to compile.

A case is selected only when it can run through:

1. the interpreter reference path;
2. explicit `execution: 'native'`, which cannot fall back; and
3. an emitted module produced from a real shared native plan.

## Conserved result

| Selection disposition | Count |
| --- | ---: |
| Selected | 1 |
| Engine unsupported | 15 |
| Harness unsupported | 0 |
| Profile excluded | 0 |
| Metadata failure | 0 |
| **Inventoried** | **16** |

The selected case is `template-006`. It independently passes under all three
required backends:

| Backend | Selected | Passed | Incomplete |
| --- | ---: | ---: | ---: |
| Interpreter | 1 | 1 | 0 |
| Native direct | 1 | 1 | 0 |
| Native emitted | 1 | 1 | 0 |

## Native boundary finding

The initial probe appeared to show emitted success for all 13
interpreter-selected family cases. Inspection showed that 12 of those emitted
modules used the generic `transformCompiledStylesheet` path because
`tryCreateNativeTransformPlan(...)` returned no shared native plan. That path
preserves useful generated-module compatibility, but it is not evidence of
native-emitted execution under ADR-0003.

The conformance harness now checks shared-plan availability before executing an
emitted observation. A focused regression test proves that `template-001`
is reported as engine-unsupported rather than counted as a native-emitted pass.

Of the 15 non-selected cases:

- 12 pass under the interpreter but are unsupported by the current shared
  native planner; and
- `path-008`, `path-009`, and `path-010` retain the interpreter engine
  gaps recorded by the family baseline and therefore cannot enter parity yet.

## Interpretation

This is a parity baseline, not a claim that Phase 3 widening is finished. It
establishes independent backend observations and prevents an emitted fallback
from inflating native coverage. Future native-plan widening can move cases from
`engine-unsupported` to `selected` without changing the 16-case denominator.

## Reproduction

Run:

```powershell
npx vitest run test/conformance/xslt30/native-parity.test.ts
```

The test fails if family membership drifts, a required backend observation is
missing, any selected execution fails, or generic emitted fallback is counted
as native-emitted execution.

## Validation

- Exact corpus verification reproduced QT3 31,821/428 and XSLT30 14,600/234.
- Typecheck, focused ESLint, and the package build passed.
- The complete suite passed 1,031 tests across 92 files, with one skipped and
  two todo.
- QT3 MVP+2 remained 2,487/2,487, XSLT30 MVP+3 remained 73/73, and the
  interpreter template/path family remained 13/13 selected.
- A normal MkDocs build passed. Strict mode retained the same 56 pre-existing
  broken-link warnings and introduced no warning from this checkpoint.

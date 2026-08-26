# QT3 MVP2 Profile Baseline

- Date: 2026-08-26
- Weaver baseline: `ed660b9` plus the checkpoint containing this record
- QT3 revision: `83993587711dbd5c18ed846385ec37d079d6e492`
- Profile: `weaver-mvp2-v1`
- Required backend: interpreter
- Platform: Windows, Node.js 22.23.2
- Outcome digest: `718fe9289d1eb0d64d2ca9ca8c097ec4f7bd65446495de6bb47e2a5e7c22e023`

## Scope

The profile versions Weaver's established 65-test-set MVP+2 selection. Unlike
the earlier runtime predicate alone, it inventories every upstream `test-case`
in those sets, including cases whose test or assertion metadata the current
adapter cannot decode.

The profile stores the selected test-set paths, the mapping from structured
exclusion reasons to ledger dispositions, expected selection totals, and a
SHA-256 digest over every ordered identity/outcome tuple. The digest fails when
a case changes disposition, reason, or detail even if aggregate totals happen
to remain equal.

## Conserved selection result

| Selection disposition | Count |
| --- | ---: |
| Selected | 2,487 |
| Profile excluded | 1,086 |
| Engine unsupported | 2,991 |
| Harness unsupported | 54 |
| Metadata failure | 671 |
| **Inventoried** | **7,289** |

Every selected case has one interpreter observation. All 2,487 selected cases
pass, with no incomplete observations.

The 671 metadata failures are not claims that upstream QT3 metadata is invalid.
They identify test/assertion shapes that the current Weaver adapter does not
yet decode. They were previously absent from the reported denominator.

## Disposition policy

- Unsupported environment configuration maps to `harness-unsupported`.
- Spec, XSD-version, and XML-version dependencies outside the profile map to
  `profile-excluded`.
- Unsupported features, schema constructors, syntax, and functions map to
  `engine-unsupported`.
- A case omitted by the current test/assertion decoder maps to
  `metadata-failure`.

Changing that policy, the selected test sets, or any computed outcome requires
a reviewed profile revision and a new expected digest.

## Reproduction

Run:

```powershell
npm run test:corpus-sources
npx vitest run test/conformance/qt3/profile.test.ts test/conformance/qt3/mvp2.test.ts
```

The optional all-catalog discovery run remains available through
`QT3_BROAD_BASELINE=1`; it is separate from the versioned MVP+2 profile.

## Validation

- Exact corpus verification reproduced QT3 31,821/428 and XSLT30 14,600/234.
- Typecheck, focused ESLint, and the package build passed.
- The complete suite passed 1,028 tests across 91 files, with one skipped and
  two todo.
- QT3 MVP+2 remained 2,487/2,487, XSLT30 MVP+3 remained 73/73, and the
  XSLT30 template/path family remained 13/13 selected with three retained gaps.
- A normal MkDocs build passed. Strict mode retained the same 56 pre-existing
  broken-link warnings and introduced no warning from this checkpoint.

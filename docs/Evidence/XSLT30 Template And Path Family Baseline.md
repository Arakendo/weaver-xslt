# XSLT30 Template And Path Family Baseline

- Date: 2026-08-26
- Weaver baseline: `bccc056` plus the checkpoint containing this record
- XSLT30 revision: `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b`
- Overlay: `weaver-template-path-family-v1`
- Required backend: interpreter
- Platform: Windows, Node.js 22.23.2

## Scope

This record admits every upstream case in:

- `tests/decl/template/_template-test-set.xml`; and
- `tests/expr/path/_path-test-set.xml`.

The harness verifies that the overlay's 16 identities exactly equal the cases
present in those two pinned test sets. It loads suite metadata and fixtures
before invoking Weaver; engine execution receives stylesheet and source
content without ambient filesystem or network authority.

## Conserved result

| Selection disposition | Count |
| --- | ---: |
| Selected | 13 |
| Engine unsupported | 3 |
| Harness unsupported | 0 |
| Profile excluded | 0 |
| Metadata failure | 0 |
| **Inventoried** | **16** |

All 13 selected cases pass under the interpreter, with no missing execution
observations:

| Family | Inventoried | Selected and passed | Engine unsupported |
| --- | ---: | ---: | ---: |
| `template` | 6 | 6 | 0 |
| `path` | 10 | 7 | 3 |
| **Total** | **16** | **13** | **3** |

## Retained gaps

- `path-008` and `path-009` require the XPath `floor()` function. Weaver
  currently reports `XPST0017` for that function.
- `path-010` uses a complex arithmetic predicate in a match pattern. Weaver
  currently completes without an engine exception but produces an empty
  result instead of the asserted `out` element.

The exploratory probe also exposed an accounting defect: unparsable actual
output was initially reported as a harness failure because expected and actual
normalization shared one catch boundary. The reusable harness now treats an
invalid expected fixture as a harness failure and invalid actual output as a
semantic mismatch.

## Backend interpretation

This discovery overlay requires the interpreter because the existing XSLT30
corpus adapter executes through `XsltProcessor`. It does not claim
native-direct or native-emitted coverage. No engine semantics were added while
admitting these families, so this checkpoint creates no new behavior requiring
a focused parity fixture. Multi-backend corpus observations remain Phase 3
work governed by ADR-0003 and ADR-0005.

## Reproduction

Run:

```powershell
npm run test:corpus-sources
npx vitest run test/conformance/xslt30/template-path-family.test.ts
```

The focused family test fails if an upstream family member is absent from the
overlay, an identity is duplicated, a selected case does not pass, or the
selection and execution denominators do not conserve.

## Validation

- Exact corpus verification reproduced QT3 31,821/428 and XSLT30 14,600/234.
- Typecheck, focused ESLint, and the package build passed.
- The complete suite passed 1,027 tests across 90 files, with one skipped and
  two todo.
- The existing XSLT30 MVP+3 checkpoint remained 73/73.
- A normal MkDocs build passed. Strict mode retained the same 56 pre-existing
  broken-link warnings and introduced no warning from this checkpoint.

# W3C Test Suite Provenance

## Pinned sources

| Suite | Upstream | Local path | Revision | Inventory |
| --- | --- | --- | --- | ---: |
| QT3 | `https://github.com/w3c/qt3tests` | `vendor/qt3tests` | `83993587711dbd5c18ed846385ec37d079d6e492` | 31,821 cases in 428 test sets |
| XSLT 3.0 | `https://github.com/w3c/xslt30-test` | `vendor/xslt30-test` | `6f8fd9e966ae74a251a2604abef9d904c7bc5c9b` | 14,600 cases in 234 test sets |

The Git submodules are immutable upstream inputs. Weaver owns its harness,
selection overlays, classifications, and reports; it does not modify upstream
catalogs, fixtures, environments, assertions, or expected results.

## Acquisition and integrity

Initialize and verify a clone with:

```powershell
git submodule update --init --recursive
npm run test:corpus-sources
```

The verification command:

- requires both root catalogs;
- checks each submodule HEAD against the recorded revision;
- rejects local changes inside either submodule;
- resolves root-catalog test-set paths within the suite root;
- rejects duplicate or missing test-set references; and
- requires the exact structural test-set and case totals above.

Use `npx tsx scripts/check-conformance-sources.ts --json` when a machine-readable
inventory is useful.

For the full XSLT30 metadata inventory and the deterministic complete-family
execution ranking, run:

```powershell
npm run inventory:xslt30-metadata
npm run rank:xslt30-families
```

The retained `corpus/reports/xslt30-family-ranking-v1.json` report pins the
ranking criteria, suite revision, denominators, backend pass counts, and
per-family outcome digests. It is candidate-planning evidence, not a
full-suite conformance percentage.

The submodule gitlink supplies content identity. The verification command is
the authority for detecting an uninitialized, moved, or locally modified
working copy. CI runs it on Linux/Node 22 after explicitly initializing both
submodules.

## Overlay boundary

Weaver overlays live under `corpus/overlays/<suite>/`. They contain only
first-party metadata referencing suite-native identities. The first overlay,
`xslt30/weaver-mvp3-v1.json`, preserves the established 73-case MVP+3
checkpoint while ADR-0005's complete-family ledger is introduced.

An overlay records:

- schema and profile version;
- exact suite identity and revision;
- required Weaver execution modes;
- selection rationale; and
- test-set path, case name, and selection disposition for every member.

Changing an overlay changes the verification profile and must produce a new
reviewable evidence checkpoint. Do not change upstream expected results to make
a Weaver result pass.

## Licensing boundary

Weaver's MIT license does not relicense W3C or nested third-party corpus
material. Preserve the submodules and their notices. Before distributing a
subset, modified fixture, bundled corpus, or public conformance report, review
the applicable W3C test-suite terms, nested notices, and claim wording for that
specific use.

The submodules are development/test inputs and are not included in the Weaver
npm package.

## Revision update procedure

1. Record why a suite update is needed.
2. Compare upstream commits, catalog/schema changes, nested licenses, and
   structural totals between revisions.
3. Run the same overlay and harness against both revisions.
4. Classify added, removed, and changed cases without rewriting prior evidence.
5. Update the gitlink, integrity constants, this record, overlays, and retained
   results together.

Movement of an upstream default branch alone is not a reason to update.

## Claim boundary

Corpus presence and inventory totals are not conformance results. A reported
result must name its exact revision, profile/overlay, selection dispositions,
required execution modes, comparison coverage, Weaver revision, toolchain, and
target. See [ADR-0005](../ADR/ADR-0005-verification-ledger-and-corpus-accounting.md).

# CLI Source Decomposition

- Status: decomposition checkpoint complete
- Governing decision: [ADR-0004](../ADR/ADR-0004-source-unit-cohesion-size-pressure-and-decomposition.md)
- Baseline checkpoint: `7d14e77`

## Purpose

This record applies ADR-0004 to `src/cli.ts`. It separates Weaver's local glob
expansion policy from command execution without changing CLI arguments, watch
behavior, filesystem effects, diagnostic projection, or process exit codes.

## Review and disposition

At checkpoint `7d14e77`, `cli.ts` contained 1,216 physical lines and was in
ADR-0004's inspect-on-substantive-change band. Its responsibilities include
global option handling, command dispatch, compile/watch/run lifecycles,
artifact replacement and cleanup, diagnostic emission, local glob expansion,
and direct Node process termination.

Compile and watch share invocation diagnostic state, artifact policy, source
composition, and file replacement. Splitting those flows now would require a
broad mutable context or callback surface. Direct-process fallback also reads
the same diagnostics-output state used during command execution. Those regions
remain together with inspection on substantive change.

Local glob expansion is independently describable and has no dependency on
compiler, processor, diagnostic, or command state. The disposition is
**decompose glob policy and retain the remaining CLI orchestration**.

## Extracted responsibility

### `cliGlob.ts`

- Subject: CLI filesystem input discovery.
- Responsibility: identify glob magic, determine the traversal root, collect
  files, normalize Windows paths, and match `*`, `**`, and `?` patterns.
- Authority: Weaver CLI's local glob interpretation only.
- Inputs: a user pattern and the local filesystem tree beneath its fixed base.
- Outputs: absolute matched file paths or reusable matcher/path-normalization
  functions for watch events.
- Dependencies: Node filesystem and path APIs.
- Exclusions: stylesheet compilation, watch scheduling, diagnostics, artifact
  emission, and process exit policy.

## Dependency and coupling review

```text
cli
    -> cliGlob
        -> node:fs + node:path
```

`cliGlob.ts` does not import `cli.ts`, mutate invocation state, or know which
command consumes a match. Compile and watch retain their previous sorting,
canonicalization, and event filtering in the CLI composition unit.

Post-extraction, `cli.ts` contains 1,136 physical lines and `cliGlob.ts`
contains 101. The CLI remains in the inspect-on-substantive-change band but is
below the explicit-review threshold.

## Conservation evidence

The baseline is commit `7d14e77`, where the complete suite passed 1,019 tests
across 86 files. After extraction:

- `npm run typecheck` passes; and
- all 29 CLI tests pass, including compile globs, watch add/change/delete
  behavior, multi-target artifacts, run mode, and diagnostics.

Additional conservation evidence is green:

- `npm run build` and focused `cliGlob.ts` ESLint validation pass; and
- the complete suite passes all 86 test files with 1,019 tests passing, one
  skipped, and two todo. The run retains the XSLT 3.0 MVP+3 result at 73/73 and
  the QT3 MVP+2 supported slice at 2,487/2,487.

Repository-wide ESLint still reaches the pre-existing unused `writeErr`
binding in the direct-process fallback at the end of `cli.ts`. This structural
checkpoint does not reinterpret or repair that independent lint finding.

A normal MkDocs build completes. Strict mode reaches the same 56 pre-existing
broken-link warnings recorded by the preceding campaigns; this record and its
navigation entries add no new documentation warning.

## Reopening triggers

Revisit this boundary if:

- glob behavior diverges between initial compile and watch events;
- filesystem traversal begins consuming compiler or diagnostic policy;
- compile and watch can share an immutable command plan rather than mutable
  module state;
- direct-process fallback can consume a stable invocation result contract; or
- `cli.ts` crosses the explicit-review threshold.

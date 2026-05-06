# Project Guidelines

## Architecture
- This repository builds `@arakendo/weaver-xslt` as a **TypeScript-native XSLT compiler**. The interpreter is the reference backend; the **codegen backend is the product**.
- Start with the pinned docs before making architectural changes:
  - [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for non-negotiable design decisions
  - [docs/DIFFERENTIATORS.md](../docs/DIFFERENTIATORS.md) for the product thesis and diagnostic goals
  - [docs/ROADMAP.md](../docs/ROADMAP.md) for increment boundaries and exit criteria
- Keep the core engine owned in-tree. Do **not** add external XPath or XSLT engine dependencies.
- Treat the IR as the contract between compiler, interpreter, codegen, and future tooling. If a backend change feels awkward, prefer fixing the IR rather than adding backend-specific hacks.
- Use the XML boundary in `src/xml/parse.ts` instead of constructing ad hoc parser usage.

## Conventions
- **Diagnostics-first**: parser, AST, IR, and evaluator work should preserve source locations and make errors clearer, not defer that work.
- Prefer compile-time diagnostics over runtime surprises whenever the design allows it.
- Treat diagnostics as first-class product artifacts: analyzers and runtimes discover them, while canonical ordering and shared presentation policy should live in the shared diagnostics boundary rather than inside individual analysis passes or one-off surfaces.
- Use [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) DEC-013 as the primary diagnostics north star, and use [docs/DIAGNOSTIC_INTRINSICS.md](../docs/DIAGNOSTIC_INTRINSICS.md) when work crosses into compiler-recognized `wx:*` observability/assertion surface.
- Generated TypeScript should stay readable and inspectable. Do not optimize by making codegen output opaque.
- Keep Node-specific APIs out of core engine logic unless the code is clearly CLI-only or tooling-only.
- Scope work to the current roadmap increment. Do not silently pull features forward from later milestones.
- When pinned design intent changes, update the relevant docs in the same change so code and docs do not drift.

## Code Style
- Follow the existing strict TypeScript style and keep `npm run typecheck` clean.
- Keep public APIs small and explicit. Avoid broad surface-area expansion unless the current milestone requires it.
- Prefer small, local abstractions over speculative frameworks.
- Use ASCII unless an existing file already requires Unicode.
- Add comments only when they clarify non-obvious behavior or a design constraint.
- This project is still pre-stability. Favor correctness and clearer design over preserving premature compatibility.

## Local Consistency Check
- When modifying a file, briefly scan surrounding code for violations of the above guidelines. Prefer small, localized improvements (naming, structure, duplication) when they are low-risk and directly adjacent to the change. Avoid large or unrelated refactors. If the file is already large or has organizational issues, note them in the audit tracker and move on to the intended change.

## Build and Test
- Install dependencies with `npm install`.
- Validate types with `npm run typecheck`.
- Run the main test suite with `npm test`.
- Use focused Vitest runs while iterating, then finish with the relevant broader validation.
- Use `npm run test:conformance` only when the local slice is stable enough for broader conformance work.
- GitHub Actions CI runs on clean runners without `vendor/` submodules checked out. Tests and harnesses that touch `vendor/qt3tests` or `vendor/xslt30-test` must skip or guard cleanly when those corpora are absent.
- When asked to push, finish with the relevant local validation first. Default to `npm run typecheck` plus the narrowest relevant test run, and use full `npm test` when the change touches shared runtime/compiler behavior, test harnesses, workflow files, or package/configuration surfaces.
- After pushing, check the latest GitHub Actions run when the change could affect CI or deployment. Treat fresh CI failures as part of the task, not as follow-up bookkeeping.

## XPath and XSLT Work
- Preserve the hand-written parser architecture: recursive descent for paths/statements and Pratt-style expression parsing.
- XPath semantics are load-bearing. Be careful with sequences, context sensitivity, comparisons, atomization, function dispatch, and W3C error codes.
- Runtime and compile-time errors should use the typed engine error classes and codes under `src/errors/`.
- When a feature exists in both interpreter and codegen backends, design and test for semantic parity rather than letting the backends drift.
- For codegen work, keep generated output reviewable in fixtures and suitable for debugging in normal JS tools.

## Testing and Documentation
- Add focused tests near the slice being implemented, especially for parser/evaluator behavior and diagnostics formatting.
- Do not mark a feature done if it only passes happy-path tests and still has poor diagnostics.
- When design or organization decisions change, update the nearest durable document rather than leaving rationale only in code or chat.
- Prefer linking existing docs over duplicating them in instructions.
- Treat `vendor/` as a large conformance corpus, not a normal exploration surface: avoid attaching, listing, or reading broad swaths of `vendor/**` when a targeted file or subtree will do. Prefer specific catalog files, specific test-set files, or narrowly scoped searches inside `vendor/qt3tests` and `vendor/xslt30-test` to avoid request-size/tooling failures.
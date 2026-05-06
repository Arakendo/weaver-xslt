# Weaver

A TypeScript-native **XSLT 3.0 platform** with interpreter and native
execution backends, plus inspectable emitted TypeScript for bundlers,
debuggers, and generated-artifact workflows.

<sub>package: `@arakendo/weaver-xslt` · repo: `weaver-xslt`</sub>

> Status: **MVP+6 complete** — typed params, typed extension functions, CLI compile/run/watch, source maps, diagnostics v2, watch invalidation coverage, static analysis, and thin Vite/esbuild plugin wrappers are in place. Next planned increments are native direct execution and the live workbench boundary.

> **Open source, closed contributions.** This project is MIT licensed — fork
> and use it however you like. External pull requests and issues are not
> accepted. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why another XSLT engine?

Because existing ones treat XSLT as a black box. This one treats it as a
**build step and execution platform**: compile your `.xsl` once, get a typed,
tree-shakeable, source-mapped TypeScript module you can import, debug in
DevTools, type-check your params against, run through the interpreter, or
bundle with Vite or esbuild.

See [docs/DIFFERENTIATORS.md](./docs/DIFFERENTIATORS.md) for the four
things this project aims to be clearly best at. See
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how it is built.

## Requirements

- Node.js 20+
- npm 10+

## Getting started

```bash
npm install
npm test
```

## Hello world

```ts
import { XsltProcessor } from '@arakendo/weaver-xslt';

const stylesheet = `
  <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
      <hello>
        <xsl:value-of select="/root/name"/>
      </hello>
    </xsl:template>
  </xsl:stylesheet>
`;

const processor = new XsltProcessor(stylesheet);
const result = processor.transform('<root><name>world</name></root>');

console.log(result.output);
// <hello>world</hello>
```

## CLI

From a local checkout, build the package and run the compiled CLI entrypoint.
The compile command accepts a file path or glob and writes generated artifacts
next to each matched stylesheet:

```bash
npm run build
node dist/cli.js compile ./hello.xsl
```

That writes `./hello.xsl.ts`, `./hello.xsl.d.ts`, `./hello.xsl.digest`, and
`./hello.xsl.map` using the current codegen backend.

For iterative work, the CLI can also watch the same glob and keep those
artifacts in sync as stylesheets are added, edited, or deleted:

```bash
node dist/cli.js watch ./hello.xsl
```

You can also run a stylesheet directly through the interpreter:

```bash
node dist/cli.js run ./hello.xsl --input ./input.xml
```

And the CLI exposes built-in usage text:

```bash
node dist/cli.js --help
```

When the package is installed from npm, the same command is exposed as
`weaver-xslt compile ./hello.xsl` via the package `bin` entry.

The compile and watch commands also accept `--sample <xml-file>` when you want
static typo diagnostics against a representative input document.

## Bundlers

Thin wrapper plugins are available for bundler/dev-server flows that want to
import `.xsl` files directly:

```ts
import { weaverVitePlugin } from '@arakendo/weaver-xslt/vite';

export default {
  plugins: [weaverVitePlugin()],
};
```

```ts
import { weaverEsbuildPlugin } from '@arakendo/weaver-xslt/esbuild';

export default {
  plugins: [weaverEsbuildPlugin()],
};
```

Both wrappers compile `.xsl` files through the same artifact pipeline used by
the CLI, so generated TypeScript, source maps, and compile-time diagnostics
stay aligned across entry points.

For the manual Chrome DevTools source-map verification pass, use the fixture in
[docs/DEVTOOLS_CHECKLIST.md](./docs/DEVTOOLS_CHECKLIST.md).

## Scripts

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run build`     | Compile TypeScript to `dist/`             |
| `npm run dev`       | Run `src/index.ts` in watch mode via tsx  |
| `npm run devtools:fixture` | Start the local browser fixture used for Chrome DevTools `.xsl` breakpoint verification |
| `npm test`          | Run the Vitest test suite once            |
| `npm run benchmark:watch` | Measure a real `weaver-xslt watch` round-trip on a generated 200-line stylesheet |
| `npm run test:packaging` | Build and dry-run the published package surface |
| `npm run test:watch`| Run Vitest in watch mode                  |
| `npm run typecheck` | Type-check without emitting               |
| `npm run lint`      | Lint sources with ESLint                  |
| `npm run format`    | Format sources with Prettier              |

## Project layout

```
src/
  index.ts                  Public entry point
  version.ts
  errors/                   W3C-coded error classes
  xml/                      DOM parse/serialize boundary
  xdm/                      XPath Data Model (atomics, nodes, sequences, maps, arrays)
  xpath/
    lex/                    XPath 3.1 lexer
    parse/                  XPath 3.1 parser (recursive descent + Pratt)
    eval/                   XPath 3.1 evaluator + context
    fn/                     fn:* function library
    regex/                  Schema-regex → JS-regex translator
    types/                  SequenceType / casting / promotion
  xslt/
    compile/                Stylesheet → IR compiler
    eval/                   Transform evaluator
    fn/                     XSLT-specific functions
  processor/                Public orchestration (XsltProcessor)
  util/

test/
  smoke.test.ts             Basic API smoke tests
  golden.test.ts            Generic runner for test/golden/*/
  golden/                   File-based transform cases
  conformance/              W3C XSLT 3.0 suite runner (skipped by default)

docs/
  ARCHITECTURE.md           Pinned design decisions
```

## Scope

**Will support** (eventually): XSLT 3.0 basic conformance, DOM/string input
and output, synchronous evaluation, XPath 3.1 with ~220 built-in functions,
maps & arrays, higher-order functions.

**Not yet**: streaming (XSLT 3.0 streamability), schema-aware processing,
packages, extension instructions.

**Never**: XSLT 1.0 bug-compat mode, XQuery.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full design
and the pinned decisions behind each layer.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full MVP / MVP+N execution
plan with scope and exit criteria per increment. High-level milestones:

- [x] M0 — Project scaffold + W3C test suites cataloged (14.6k XSLT, 31.8k QT3)
- [x] M1 — XPath vertical slice + diagnostic bones
- [x] M2 — XPath core on interpreter (~20% of QT3)
- [x] M3 — XSLT MVP on interpreter
- [x] M4 — **Codegen backend v1** (IR → readable TypeScript)
- [x] M5 — Typed params, typed extension functions, CLI
- [x] M6 — Watch mode, source maps, static-analysis diagnostics v2, bundler polish
- [ ] M6.25 — Native backend direct execution
- [ ] M6.5 — Live workbench / playground
- [ ] M7 — XPath type system, maps/arrays, higher-order functions
- [ ] M8 — XSLT 3.0 feature-complete (non-streaming)
- [ ] M9 — Conformance push (≥70% under both backends)
- [ ] M10 — Practical streaming subset, gated `<ts:eval>` escape hatch

## License

MIT

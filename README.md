# Weaver

A TypeScript-native **XSLT 3.0 compiler** that emits inspectable, typed,
debuggable transform modules — with an interpreter backend for
conformance and dynamic features.

<sub>package: `@arakendo/weaver-xslt` · repo: `weaver-xslt`</sub>

> Status: **MVP+4 complete** — the interpreter slice is live, the first codegen backend now emits readable TypeScript, generated fixtures are checked in for review, and the generated-module debugger path is wired up in VS Code.

> **Open source, closed contributions.** This project is MIT licensed — fork
> and use it however you like. External pull requests and issues are not
> accepted. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why another XSLT engine?

Because existing ones treat XSLT as a black box. This one treats it as a
**build step**: compile your `.xsl` once, get a typed, tree-shakeable,
source-mapped TypeScript module you can import, debug in DevTools,
type-check your params against, and bundle with Vite or esbuild.

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

## Scripts

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run build`     | Compile TypeScript to `dist/`             |
| `npm run dev`       | Run `src/index.ts` in watch mode via tsx  |
| `npm test`          | Run the Vitest test suite once            |
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
- [ ] M3 — XSLT MVP on interpreter (interpreter slice active; remaining exit criteria still in progress)
- [x] M4 — **Codegen backend v1** (IR → readable TypeScript)
- [ ] M5 — Typed params, typed extension functions, CLI compile
- [ ] M6 — Watch mode, source maps, static-analysis diagnostics v2
- [ ] M7 — XPath type system, maps/arrays, higher-order functions
- [ ] M8 — XSLT 3.0 feature-complete (non-streaming)
- [ ] M9 — Conformance push (≥70% under both backends)
- [ ] M10 — Practical streaming subset, gated `<ts:eval>` escape hatch

## License

MIT

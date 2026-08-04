# Weaver

A TypeScript-native **XSLT 3.0 platform** with interpreter and native
execution backends, plus inspectable emitted TypeScript for bundlers,
debuggers, and generated-artifact workflows.

<sub>package: `@arakendo/weaver-xslt` · repo: `weaver-xslt`</sub>

> Status: **MVP+6.5 closed** — the live public workbench is now running on `weaverxslt.org`, and the next gated increment is MVP+6.75 XML node trace debugging.

> **Open source, closed contributions.** This project is MIT licensed — fork
> and use it however you like. External pull requests and issues are not
> accepted. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why another XSLT engine?

Because existing ones treat XSLT as a black box. This one treats it as a
**build step and execution platform**: compile your `.xsl` once, get a typed,
tree-shakeable, source-mapped TypeScript module you can import, debug in
DevTools, type-check your params against, run through the interpreter, or
bundle with Vite or esbuild.

See [Weaver Product Thesis](docs/Specifications/Weaver%20Product%20Thesis.md) for the four
things this project aims to be clearly best at. See
[Weaver Software Design Document](docs/Specifications/Weaver%20Software%20Design%20Document.md) for how it is built.

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

When you want to choose the execution strategy explicitly, use the `execution`
option:

```ts
import { XsltProcessor } from '@arakendo/weaver-xslt';

const stylesheet = `
  <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:param name="greeting" select="'hello'"/>
    <xsl:template match="/root">
      <out><xsl:value-of select="$greeting"/></out>
    </xsl:template>
  </xsl:stylesheet>
`;

const processor = new XsltProcessor(stylesheet);

const nativeResult = processor.transform('<root/>', { execution: 'native' });
console.log(nativeResult.execution);
// { requested: 'native', resolved: 'native' }

const autoResult = processor.transform('<root/>', {
  execution: 'auto',
  parameters: { greeting: 'hi' },
});
console.log(autoResult.output);
// <out>hi</out>
console.log(autoResult.execution);
// { requested: 'auto', resolved: 'native' }
```

Use `execution: 'native'` when the current stylesheet must stay on the native
path. Use `execution: 'auto'` when native is preferred but structured
interpreter fallback is acceptable while the supported slice is still widening.

When you want to compile once and reuse the compiled stylesheet across
multiple source documents, use the workbench boundary explicitly:

```ts
import { compile, transform } from '@arakendo/weaver-xslt/workbench';

const compiled = compile({
  stylesheet: {
    uri: 'memory:/hello.xsl',
    text: `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <hello><xsl:value-of select="/root/name"/></hello>
        </xsl:template>
      </xsl:stylesheet>
    `,
  },
});

if (!compiled.ok) {
  throw new Error('stylesheet did not compile');
}

const first = transform({
  stylesheet: compiled.stylesheet,
  sourceXml: {
    uri: 'memory:/first.xml',
    text: '<root><name>alpha</name></root>',
  },
});

const second = compiled.stylesheet.transform({
  uri: 'memory:/second.xml',
  text: '<root><name>beta</name></root>',
});

console.log(first.output);
// <hello>alpha</hello>
console.log(second.output);
// <hello>beta</hello>
```

That keeps the compile/run split explicit for embedders that want to compile a
stylesheet once, inspect generated TS or source maps, and reuse the same
compiled handle as often as they want.

The public `weaverxslt.org` workbench now ships with a small preset selector
that hydrates both editable panes with starter XML + XSLT pairs. The initial
preset set is documented in
[docs/Specifications/Weaver Workbench API Specification.md](docs/Specifications/Weaver%20Workbench%20API%20Specification.md) and currently targets three
simple flows: hello world, parameters with defaults, and `xsl:apply-templates`
with matching rules.
For the public host-facing shape of that embed, including default preset,
page behavior, and the live route, see
[docs/Plans/Workbench Embed.md](docs/Plans/Workbench%20Embed.md) and
[docs/WORKBENCH.md](./docs/WORKBENCH.md).

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

When you want JavaScript output explicitly, use `--emit`:

```bash
node dist/cli.js compile ./hello.xsl --emit js
node dist/cli.js compile ./hello.xsl --emit bundle
node dist/cli.js compile ./hello.xsl --emit ts,bundle
```

- `--emit js` writes `./hello.xsl.js` plus `./hello.xsl.js.map` and keeps the
  shared runtime as an external package import.
- `--emit bundle` writes `./hello.xsl.bundle.js` plus
  `./hello.xsl.bundle.js.map` and inlines the Weaver runtime and package
  dependencies into a single Node ESM renderer artifact.
- `--emit ts,bundle` writes both the default TS artifact set and the bundled
  JS artifact in one compile pass.

The current `bundle` flavor is intended for Node 20+ hosts. It is self-contained
with respect to Weaver package installs, but it is not yet a browser-neutral
drop-in renderer because some runtime paths still depend on Node builtins.

For iterative work, the CLI can also watch the same glob and keep those
artifacts in sync as stylesheets are added, edited, or deleted:

```bash
node dist/cli.js watch ./hello.xsl
```

`watch` accepts the same `--emit` values as `compile`, including `js`,
`bundle`, `ts,js`, and `ts,bundle`.

You can also run a stylesheet directly through the interpreter:

```bash
node dist/cli.js run ./hello.xsl --input ./input.xml
```

When you want the CLI to participate in execution selection, pass
`--execution interpreter`, `--execution native`, or `--execution auto`:

```bash
node dist/cli.js run ./hello.xsl --input ./input.xml --execution auto
```

If `--execution auto` falls back to the interpreter because the stylesheet is
outside the current native slice, the CLI prints the structured fallback reason
as a warning on stderr while still returning the transform output on stdout.

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
[docs/Evidence/Chrome DevTools Verification.md](docs/Evidence/Chrome%20DevTools%20Verification.md).

## Scripts

| Script                     | Description                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm run build`            | Compile TypeScript to `dist/`                                                           |
| `npm run dev`              | Run `src/index.ts` in watch mode via tsx                                                |
| `npm run devtools:fixture` | Start the local browser fixture used for Chrome DevTools `.xsl` breakpoint verification |
| `npm test`                 | Run the Vitest test suite once                                                          |
| `npm run benchmark:watch`  | Measure a real `weaver-xslt watch` round-trip on a generated 200-line stylesheet        |
| `npm run test:packaging`   | Build and dry-run the published package surface                                         |
| `npm run test:watch`       | Run Vitest in watch mode                                                                |
| `npm run typecheck`        | Type-check without emitting                                                             |
| `npm run lint`             | Lint sources with ESLint                                                                |
| `npm run format`           | Format sources with Prettier                                                            |

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
  Specifications/          Current contracts and design boundaries
  ADR/                     Accepted architectural decisions
  Architectural Reviews/  Open and deferred architecture evidence
  Plans/                   Implementation plans and roadmap
  Evidence/                Verification and implementation records
  Corpus/                  Conformance inputs and harness guidance
  Notes/                   Non-normative project memory
```

## Scope

**Will support** (eventually): XSLT 3.0 basic conformance, DOM/string input
and output, synchronous evaluation, XPath 3.1 with ~220 built-in functions,
maps & arrays, higher-order functions.

**Not yet**: streaming (XSLT 3.0 streamability), schema-aware processing,
packages, extension instructions.

**Never**: XSLT 1.0 bug-compat mode, XQuery.

See the [Weaver Software Design Document](docs/Specifications/Weaver%20Software%20Design%20Document.md) for the full design
and the pinned decisions behind each layer.

## Roadmap

See the [Weaver Roadmap](docs/Plans/Weaver%20Roadmap.md) for the full MVP / MVP+N execution
plan with scope and exit criteria per increment. High-level milestones:

- [x] M0 — Project scaffold + W3C test suites cataloged (14.6k XSLT, 31.8k QT3)
- [x] M1 — XPath vertical slice + diagnostic bones
- [x] M2 — XPath core on interpreter (~20% of QT3)
- [x] M3 — XSLT MVP on interpreter
- [x] M4 — **Codegen backend v1** (IR → readable TypeScript)
- [x] M5 — Typed params, typed extension functions, CLI
- [x] M6 — Watch mode, source maps, static-analysis diagnostics v2, bundler polish
- [x] M6.25 — Native backend direct execution
- [x] M6.5 — Live workbench / playground
- [ ] M6.75 — XML node trace debugging
- [ ] M7 — XPath type system, maps/arrays, higher-order functions
- [ ] M8 — XSLT 3.0 feature-complete (non-streaming)
- [ ] M9 — Conformance push (≥70% under both backends)
- [ ] M10 — Practical streaming subset, gated `<ts:eval>` escape hatch

## License

MIT

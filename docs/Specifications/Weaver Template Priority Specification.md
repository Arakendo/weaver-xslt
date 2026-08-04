# Template Priority Mini-Spec

This document defines the MVP+3 template-dispatch behavior that the current
interpreter slice is expected to honor.

## Supported match patterns

The current slice only assigns priorities for these patterns:

- `/`
- `/name`
- `/*`
- `/text()`
- `/node()`
- `name`
- `*`
- `text()`
- `node()`

Anything outside that subset is still out of scope for MVP+3.

## Selection rules

All templates currently share the same import precedence because
`xsl:import` / `xsl:include` are not implemented yet.

Selection therefore works in this order:

1. highest explicit `priority`
2. otherwise, highest default priority for the supported pattern kind
3. if still tied, the later template declaration wins

## Default priorities in the current slice

- `/` -> `0.5`
- `/name` -> `0.5`
- `/*` -> `0.5`
- `/text()` -> `0.5`
- `/node()` -> `0.5`
- `name` -> `0`
- `*` -> `-0.5`
- `text()` -> `-0.5`
- `node()` -> `-0.5`

## Executable fixtures

The following fixtures anchor the current behavior:

- `invoice-simple`
- `priority-name-over-wildcard`
- `priority-later-template-wins`
- `nodetest-001` via `test/conformance/xslt30/mvp3.test.ts`
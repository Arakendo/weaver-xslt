# W3C conformance

This directory hosts conformance harnesses for the official W3C suites
that matter to `@arakendo/xslt`.

Current structure:

- `qt3/` holds QT3 (XPath/XQuery 3.1) suite runners and slices
- top-level shared files hold harness code that applies across suites
- future `xslt30/` files should hold XSLT 3.0-specific runners once that
	harness grows beyond the current smoke checks

## Setup (not done yet)

The suites are separate repositories. Add them as git submodules:

```bash
git submodule add https://github.com/w3c/xslt30-test vendor/xslt30-test
git submodule add https://github.com/w3c/qt3tests vendor/qt3tests
git submodule update --init --recursive
```

It's a few hundred MB, so it's **not** included in `npm ci` or the CI
workflow by default. The conformance harness skips itself when the
submodule is absent.

## Running

```bash
npm run test:conformance   # once implemented
```

## Goal

Report a single number: `passed / required`. It starts at 0 and only
ever goes up. Regressions in that number should fail CI once we pick a
floor to defend.

## References

- XSLT 3.0 test suite: https://github.com/w3c/xslt30-test
- QT3 test suite: https://github.com/w3c/qt3tests
- Catalog format: `catalog.xml` in the suite root
- XSLT 3.0 conformance chapter: https://www.w3.org/TR/xslt-30/#conformance

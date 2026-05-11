# S1000D Vendor Corpus

This directory vendors a standalone S1000D Issue 5.0 XML and XSD corpus for
future Weaver tests.

The intent is to preserve a realistic, full-folder sample without coupling it
to the local `.workbench/` exploration area or to the Vision-specific metrics
pipeline.

## Contents

The vendored layout mirrors the source corpus directly:

```txt
Schemas/
    S1000D Issue 5.0/

ValidXml/
    S1000D Issue 5.0/
```

- `Schemas/S1000D Issue 5.0/` contains the Issue 5.0 flat-schema XSD set.
- `ValidXml/S1000D Issue 5.0/` contains standalone sample XML documents.

This copy is intentionally broad rather than curated one-file-at-a-time so that
future tests can preserve real relative paths, schema references, and document
mixes.

## How to treat this corpus

- Treat this as a vendor test corpus, not as product source.
- Keep the original Issue 5.0 directory structure intact.
- Prefer adding narrow tests that point at specific files instead of reshaping
    the corpus.
- Keep Vision-specific transforms, generated outputs, and host-side metrics
    aggregation logic out of this directory.

## Flat-schema limitation

S1000D flat-schema packages are not meant to be loaded as one merged schema
universe.

Multiple XSD files intentionally repeat global declarations so each schema can
stand alone for a specific document type. For example, names like `para` may be
declared in more than one schema file.

Practical consequence:

- do not load every XSD in the folder into one schema set and expect it to work
- instead, validate each XML document against the specific schema it declares

Typical documents identify that schema through
`xsi:noNamespaceSchemaLocation`.

## Validation guidance

When Weaver eventually uses this corpus for schema-aware testing, the expected
approach is:

1. Read the XML document.
2. Detect the referenced schema file.
3. Load only that schema.
4. Validate the document against that single schema.

This keeps the corpus faithful to how S1000D flat schemas are actually used.

## Security and parsing note

Some S1000D documents may contain DTD declarations or external references.
Hosts should continue to apply the same explicit entity and resource-loading
policies described in the repo docs:

- `docs/ENTITY_RESOLUTION.md`
- `docs/URI_RESOLUTION.md`
- `docs/SECURITY_BOUNDARIES.md`

The presence of a vendored corpus does not change Weaver's default trust model.

## Provenance

This vendor copy preserves the local standalone S1000D Issue 5.0 XML/XSD source
folders as an in-repo corpus for future tests. It is a duplicate intended for
repeatable repository use, not the canonical upstream distribution point.

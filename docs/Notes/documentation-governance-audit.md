# Documentation Governance Audit

- Date: 2026-08-03
- Status: completed organizational audit

## Finding

The former flat `docs/` directory mixed normative specifications, executable
plans, completed evidence, corpus guidance, and exploratory notes. File names
did not communicate authority or lifecycle, and pinned decisions existed only
inside the architecture document.

## Action Taken

- Classified documents into Specifications, ADR, Architectural Reviews, Plans,
  Evidence, Corpus, and Notes.
- Renamed durable design documents with descriptive Weaver-specific titles.
- Extracted the pinned DEC groups into three accepted ADRs while preserving the
  detailed DEC text in the Software Design Document.
- Added lifecycle indexes and grouped MkDocs navigation.
- Preserved public site entry pages at the documentation root.

## Remaining Maintenance

Document authors should update `document-status.md` when reviews or plans
change lifecycle. Future embedded design decisions should become ADRs rather
than accumulating indefinitely in one large architecture document.


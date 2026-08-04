# AR-0003: WeaverPDF Document And Layout Boundary

- Status: Open / incubating
- Opened: 2026-08-03

## Question

Can WeaverPDF own a stable document and layout representation without coupling
XSLT execution, authoring syntax, layout policy, and PDF backend mechanisms?

## Current Evidence

The WeaverPDF specifications separate source syntax, document AST, layout IR,
and final rendering in design. Executable consumer and backend evidence remains
limited.

## Disposition

Keep WeaverPDF incubating. Use the existing specification and plan corpus to
test the boundaries before declaring a public capability contract.


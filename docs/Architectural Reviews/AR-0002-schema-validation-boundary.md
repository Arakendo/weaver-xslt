# AR-0002: Schema Validation Boundary

- Status: Open / incubating
- Opened: 2026-08-03

## Question

Where should XSD validation and schema-aware evidence enter Weaver without
turning a validator provider into the owner of XPath or XSLT semantics?

## Current Evidence

The [XSD Validation plan](../Plans/XSD%20Validation.md) proposes preflight
validation and structured diagnostics. Provider choice, schema-aware execution,
and host authority remain intentionally unsettled.

## Disposition

Continue plan-side incubation. Admit a stable boundary only after a real
consumer and corpus demonstrate provider-neutral inputs, outputs, diagnostics,
and failure policy.


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

The pinned XSLT30 corpus contributes the four-case `treat-as` family as a
concrete boundary. Every member declares the `schema_aware` dependency and an
XSD source-reference environment. Together they require `xsl:import-schema`,
strict or schema-informed source typing, derived atomic types, typed stylesheet
functions, and run-time `XPDY0050` behavior. Executing the same syntax against
Weaver's untyped DOM would not be equivalent evidence.

## Disposition

Continue plan-side incubation. The complete `treat-as` family is conserved as
profile-excluded rather than mislabeled as four engine failures. Admit a stable
boundary only after a real consumer and corpus demonstrate provider-neutral
inputs, outputs, diagnostics, and failure policy.


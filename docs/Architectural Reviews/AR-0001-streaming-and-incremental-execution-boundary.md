# AR-0001: Streaming And Incremental Execution Boundary

- Status: Open / deferred
- Opened: 2026-08-03

## Question

Which streaming semantics belong in Weaver's shared execution model, and which
mechanisms remain host- or backend-owned?

## Current Evidence

The interpreter/native parity contract is established for non-streaming work.
The [Practical Streaming plan](../Plans/Practical%20Streaming.md) records a
bounded direction, but no independent consumer evidence yet justifies a stable
streaming contract.

The pinned XSLT30 corpus now contributes one concrete pressure case,
`sf-fold-right-003`. It is not an isolated streaming test: before executing
`xsl:source-document streamable="yes"`, Weaver must account for a static global
variable and `use-when`, `xsl:strip-space`, a typed stylesheet function,
stylesheet parameters, a named function reference, `fold-right()`, and decimal
arithmetic. Bounded boolean static gating now passes that first prerequisite;
the current exact boundary is the typed `xsl:function` declaration. A buffered
implementation could reproduce the expected `<out>54.37</out>` without
establishing streamability, so a green result alone would not prove a streaming
contract.

## Disposition

Keep streaming deferred. Non-streaming language prerequisites exposed by the
corpus case may advance independently, but the case remains outside the
selected execution profile until its streaming claim can be tested honestly.
Reopen when corpus and consumer cases can distinguish semantic streamability,
buffering policy, and transport/input mechanisms.


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

## Disposition

Keep streaming deferred. Reopen when corpus and consumer cases can distinguish
semantic streamability, buffering policy, and transport/input mechanisms.


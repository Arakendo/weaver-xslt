# Project Governance

> Status: active documentation policy.

Weaver separates architectural authority from implementation planning and
observed evidence. The directory containing a document communicates its role.

## Authority Order

1. Accepted ADRs record binding architectural decisions.
2. Specifications define current contracts within those decisions.
3. Architectural Reviews preserve evidence for open, deferred, or revisited
   questions. They do not override an ADR.
4. Plans describe intended work and acceptance criteria.
5. Evidence records what was observed in a particular implementation or run.
6. Notes preserve useful context without becoming normative.

If new evidence invalidates an accepted decision, reopen the relevant review
and explicitly supersede or amend the ADR. Do not let a local implementation
quietly become the new architecture.

## Document Lifecycle

```text
question or pressure
        |
        v
Architectural Review
        |
        v
implementation and corpus evidence
        |
        v
accepted decision (ADR) or explicit deferral
        |
        v
specification and plan updates
```

Plans may be completed, paused, superseded, or retired. Evidence remains useful
after implementation changes when it clearly records its date, scope, inputs,
and limitations.


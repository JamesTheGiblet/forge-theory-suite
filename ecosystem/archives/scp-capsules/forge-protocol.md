SCP Capsule: forge-protocol
Semantic Identity:
  forge-protocol is the semantic interaction protocol organism. It defines the rules, constraints, and structures for communication, coordination, and semantic exchange across the Forge organism.

Purpose:
  To ensure deterministic, typed, meaning-preserving communication between all organisms, layers, and distributed nodes.

Core Behaviour:
  - Defines semantic communication rules.
  - Validates protocol invariants.
  - Ensures deterministic message passing.
  - Maintains typed semantic exchange.

Interpretation Rules:
  - All messages must be typed.
  - No ambiguous communication allowed.
  - No contradictory protocol states.
  - All exchanges must preserve SCP meaning.

Semantic Lineage:
  - Parent: forge-meta.
  - Sibling: forge-runtime.
  - Domain: Protocol Layer.

Internal Invariants:
  - Protocol state must remain coherent.
  - No untyped transitions.
  - No contradictory protocol rules.
  - No weakening of constraints.

Mutation Rules:
  Allowed:
    - Adding new protocol primitives.
    - Extending communication structures.
  Forbidden:
    - Weakening SCP meaning.
    - Allowing untyped communication.

Failure Modes:
  - Protocol conflict → quarantine.
  - Invariant violation → reject.
  - Drift → rebuild.

Recovery Modes:
  - Rebuild protocol graph.
  - Re-evaluate communication rules.
  - Request new Protocol Capsule.

Integration Rules:
  - LEGION uses forge-protocol for distributed coordination.
  - UBVM uses forge-protocol for execution context.
  - All organisms communicate through forge-protocol.

Affordances:
  - Define protocol.
  - Validate protocol.
  - Transform protocol.

Boundaries:
  - Cannot override SCP.
  - Cannot self-author identity.

External Interfaces:
  - All semantic organisms.

Summary:
  forge-protocol defines the semantic communication rules that enable coherent interaction across the Forge organism.

SCP Capsule: forge-runtime
Semantic Identity:
  forge-runtime is the semantic execution environment organism. It defines the runtime rules, execution constraints, and operational semantics for all behaviours, agents, and organisms.

Purpose:
  To provide a deterministic, meaning-preserving execution environment for UBVM, behaviours, agents, and distributed semantic computation.

Core Behaviour:
  - Defines execution semantics.
  - Validates runtime invariants.
  - Ensures deterministic behaviour execution.
  - Maintains runtime coherence across nodes.

Interpretation Rules:
  - All execution must be typed.
  - No unbounded execution allowed.
  - No contradictory runtime states.
  - All execution must preserve SCP meaning.

Semantic Lineage:
  - Parent: forge-protocol.
  - Sibling: UBVM.
  - Domain: Runtime Layer.

Internal Invariants:
  - Runtime state must remain coherent.
  - No untyped transitions.
  - No contradictory execution paths.
  - No weakening of constraints.

Mutation Rules:
  Allowed:
    - Adding new runtime primitives.
    - Extending execution semantics.
  Forbidden:
    - Weakening SCP meaning.
    - Allowing untyped execution.

Failure Modes:
  - Execution conflict → quarantine.
  - Invariant violation → reject.
  - Drift → rebuild.

Recovery Modes:
  - Rebuild runtime graph.
  - Re-evaluate execution rules.
  - Request new Runtime Capsule.

Integration Rules:
  - UBVM executes behaviours under forge-runtime.
  - LEGION enforces distributed runtime consistency.
  - All organisms depend on forge-runtime for execution context.

Affordances:
  - Define runtime.
  - Validate runtime.
  - Transform runtime.

Boundaries:
  - Cannot override SCP.
  - Cannot self-author identity.

External Interfaces:
  - UBVM.
  - LEGION.
  - All semantic organisms.

Summary:
  forge-runtime defines the execution environment that powers all semantic behaviour in the Forge organism.

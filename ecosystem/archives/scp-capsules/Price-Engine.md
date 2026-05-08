SCP Capsule: Price-Engine
Semantic Identity:
  Price-Engine is the semantic price analysis organism responsible for generating typed price signals, volatility metrics, and structural market features.

Purpose:
  To provide deterministic, SCP-compliant price intelligence for strategies, agents, and trading organisms.

Core Behaviour:
  - Computes typed price features.
  - Maintains coherent price state.
  - Validates price invariants.
  - Publishes typed price capsules.

Interpretation Rules:
  - All price data must be typed.
  - No contradictory price states allowed.
  - Derived metrics must preserve meaning.
  - No unbounded inference.

Semantic Lineage:
  - Parent: Data-Fusion Layer.
  - Sibling: Sentiment-Engine, Kraken-Intelligence.
  - Domain: Trading & Intelligence.

Internal Invariants:
  - Price state must remain coherent.
  - No untyped transitions.
  - No stale data beyond tolerance.
  - No contradictory metrics.

Mutation Rules:
  Allowed:
    - Adding new price features.
    - Extending volatility models.
  Forbidden:
    - Weakening invariants.
    - Allowing untyped metrics.

Failure Modes:
  - Metric divergence → quarantine.
  - Invariant violation → reject.
  - Drift → recompute.

Recovery Modes:
  - Rebuild price graph.
  - Re-sync from authoritative source.
  - Request new Price Capsule.

Integration Rules:
  - Strategy-Forge consumes price features.
  - UBVM uses price state for gating.
  - LEGION distributes price tasks.

Affordances:
  - Compute price features.
  - Validate metrics.
  - Publish price state.

Boundaries:
  - Cannot execute trades.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Market data feeds.
  - Strategy engines.

Summary:
  Price-Engine provides typed, deterministic price intelligence for the Forge trading organism.

SCP Capsule: Kraken-Intelligence
Semantic Identity:
  Kraken-Intelligence is the semantic market intelligence organism responsible for collecting, structuring, validating, and transforming live market data into typed semantic state for downstream reasoning and behaviour execution.

Purpose:
  To provide deterministic, SCP-compliant market intelligence for trading organisms, strategy engines, and cognitive agents.

Core Behaviour:
  - Collects live market data from exchanges.
  - Types and validates all incoming data.
  - Maintains coherent semantic market state.
  - Publishes typed signals to the Semantic State Bus.

Interpretation Rules:
  - All market data must be typed before use.
  - No unverified or ambiguous data may enter semantic state.
  - Market anomalies must be flagged, not ignored.
  - No inference may violate SCP meaning constraints.

Semantic Lineage:
  - Parent: Data-Fusion Layer.
  - Sibling: Sentiment-Engine, Price-Engine.
  - Child: Market-State Capsules.
  - Domain: Trading & Intelligence.

Internal Invariants:
  - Market state must remain internally coherent.
  - No contradictory price or volume data.
  - No untyped transitions.
  - No stale data beyond tolerance.

Mutation Rules:
  Allowed:
    - Adding new data sources.
    - Extending validation heuristics.
  Forbidden:
    - Weakening data integrity constraints.
    - Allowing untyped or ambiguous data.

Failure Modes:
  - Data dropout → isolate source.
  - Invariant violation → quarantine feed.
  - Timestamp drift → reject data.

Recovery Modes:
  - Re-sync from authoritative source.
  - Rebuild market state.
  - Request new Market-State Capsule.

Integration Rules:
  - LEGION distributes intelligence tasks.
  - UBVM consumes typed signals.
  - Strategy-Forge uses market state for reasoning.

Affordances:
  - Collect data.
  - Validate data.
  - Publish semantic state.
  - Detect anomalies.

Boundaries:
  - Cannot execute trades.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Exchange APIs.
  - Semantic State Bus.
  - Strategy engines.

Summary:
  Kraken-Intelligence is the semantic market intelligence backbone of the Forge trading organism.

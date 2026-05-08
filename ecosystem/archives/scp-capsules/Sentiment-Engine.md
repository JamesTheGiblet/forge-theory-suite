SCP Capsule: Sentiment-Engine
Semantic Identity:
  Sentiment-Engine is the semantic sentiment analysis organism responsible for extracting, typing, and validating market sentiment signals from structured and unstructured data.

Purpose:
  To provide deterministic, SCP-compliant sentiment signals for trading strategies, cognitive agents, and market-state reasoning.

Core Behaviour:
  - Collects sentiment data from multiple sources.
  - Types and validates sentiment signals.
  - Maintains coherent sentiment state.
  - Publishes typed sentiment capsules.

Interpretation Rules:
  - All sentiment must be typed.
  - No ambiguous emotional inference allowed.
  - Sentiment must map to SCP meaning primitives.
  - Conflicting sentiment must be resolved deterministically.

Semantic Lineage:
  - Parent: Data-Fusion Layer.
  - Sibling: Price-Engine, Kraken-Intelligence.
  - Domain: Trading & Intelligence.

Internal Invariants:
  - Sentiment state must remain coherent.
  - No contradictory sentiment without uncertainty tagging.
  - No untyped transitions.
  - No stale sentiment beyond tolerance.

Mutation Rules:
  Allowed:
    - Adding new sentiment sources.
    - Extending inference heuristics.
  Forbidden:
    - Weakening meaning constraints.
    - Allowing untyped sentiment.

Failure Modes:
  - Source conflict → quarantine.
  - Invariant violation → reject signal.
  - Drift → re-evaluate sentiment.

Recovery Modes:
  - Rebuild sentiment graph.
  - Re-sync from authoritative sources.
  - Request new Sentiment Capsule.

Integration Rules:
  - Strategy-Forge consumes sentiment.
  - LEGION distributes sentiment tasks.
  - UBVM uses sentiment for behaviour gating.

Affordances:
  - Extract sentiment.
  - Validate sentiment.
  - Publish sentiment state.

Boundaries:
  - Cannot execute trades.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - News feeds.
  - Social data.
  - Market data.

Summary:
  Sentiment-Engine provides typed, deterministic sentiment intelligence for the Forge trading organism.

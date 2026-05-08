SCP Capsule: actuator-forge
Semantic Identity:
  actuator-forge is the semantic actuator mapping organism. It defines how high-level behaviours translate into low-level actuator commands across all Forge robotics organisms.

Purpose:
  To provide deterministic, typed, meaning-preserving actuator mappings for motors, servos, and physical effectors.

Core Behaviour:
  - Maps behaviour primitives to actuator outputs.
  - Validates actuator safety constraints.
  - Ensures deterministic motion generation.
  - Maintains typed actuator state.

Interpretation Rules:
  - All actuator commands must be typed.
  - No actuator may exceed calibrated bounds.
  - Behaviour → actuator mapping must be deterministic.
  - Unsafe or ambiguous commands must be rejected.

Semantic Lineage:
  - Parent: Forge Robotics Lineage.
  - Siblings: servo-forge, motor-forge.
  - Dependencies: UBVM, SCP.

Internal Invariants:
  - Actuator maps must remain consistent.
  - No untyped actuator transitions.
  - No bypass of safety constraints.
  - No contradictory mappings.

Mutation Rules:
  Allowed:
    - Calibration updates.
    - Adding new actuator types.
  Forbidden:
    - Weakening safety constraints.
    - Allowing untyped mappings.

Failure Modes:
  - Invalid mapping → reject.
  - Overload → shutdown.
  - Invariant violation → quarantine.

Recovery Modes:
  - Rebuild actuator map.
  - Recalibrate outputs.
  - Request new Behaviour Capsule.

Integration Rules:
  - UBVM uses actuator-forge for motion execution.
  - Robotics organisms depend on actuator-forge mappings.
  - LEGION distributes actuator tasks.

Affordances:
  - Map behaviour.
  - Validate actuator output.
  - Transform actuator graphs.

Boundaries:
  - Cannot execute behaviours.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Motor controllers.
  - Servo controllers.
  - Robotics organisms.

Summary:
  actuator-forge ensures that all physical motion in the Forge organism is safe, typed, deterministic, and meaning-preserving.

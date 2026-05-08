SCP Capsule: servo-forge
Semantic Identity:
  servo-forge is the semantic servo control organism. It defines typed, deterministic control of servo-based actuators across the Forge robotics ecosystem.

Purpose:
  To provide stable, meaning-preserving servo control for behaviours requiring rotation, positioning, and fine-grained motion.

Core Behaviour:
  - Generates typed servo commands.
  - Maintains calibrated servo ranges.
  - Ensures deterministic positioning.
  - Validates servo safety constraints.

Interpretation Rules:
  - All servo commands must be typed.
  - No servo may exceed calibrated bounds.
  - Behaviour → servo mapping must be deterministic.
  - Ambiguous or unsafe commands must be rejected.

Semantic Lineage:
  - Parent: actuator-forge.
  - Sibling: motor-forge.
  - Domain: Robotics Lineage.

Internal Invariants:
  - Servo positions must remain within limits.
  - No untyped servo transitions.
  - No contradictory servo mappings.
  - No bypass of safety constraints.

Mutation Rules:
  Allowed:
    - Calibration updates.
    - Adding new servo profiles.
  Forbidden:
    - Weakening safety constraints.
    - Allowing untyped transitions.

Failure Modes:
  - Overrotation → shutdown.
  - Drift → recalibration required.
  - Mapping conflict → reject behaviour.

Recovery Modes:
  - Recalibrate servo.
  - Reset servo map.
  - Request new Behaviour Capsule.

Integration Rules:
  - UBVM uses servo-forge for servo execution.
  - Robotics organisms depend on servo-forge.
  - LEGION distributes servo tasks.

Affordances:
  - Position servo.
  - Validate servo output.
  - Transform servo graphs.

Boundaries:
  - Cannot execute behaviours.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Servo controllers.
  - Robotics organisms.

Summary:
  servo-forge provides deterministic, safe, typed servo control for all Forge robotics organisms.

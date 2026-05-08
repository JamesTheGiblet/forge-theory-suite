SCP Capsule: motor-forge
Semantic Identity:
  motor-forge is the semantic motor control organism. It defines typed, deterministic control of DC motors, stepper motors, and drive systems across the Forge robotics ecosystem.

Purpose:
  To provide stable, safe, meaning-preserving motor control for behaviours requiring locomotion, torque, and continuous rotation.

Core Behaviour:
  - Generates typed motor commands.
  - Maintains calibrated speed/torque limits.
  - Ensures deterministic motor behaviour.
  - Validates motor safety constraints.

Interpretation Rules:
  - All motor commands must be typed.
  - No motor may exceed calibrated bounds.
  - Behaviour → motor mapping must be deterministic.
  - Unsafe or ambiguous commands must be rejected.

Semantic Lineage:
  - Parent: actuator-forge.
  - Sibling: servo-forge.
  - Domain: Robotics Lineage.

Internal Invariants:
  - Motor outputs must remain within limits.
  - No untyped motor transitions.
  - No contradictory motor mappings.
  - No bypass of safety constraints.

Mutation Rules:
  Allowed:
    - Calibration updates.
    - Adding new motor profiles.
  Forbidden:
    - Weakening safety constraints.
    - Allowing untyped transitions.

Failure Modes:
  - Overcurrent → shutdown.
  - Stall → safe-halt.
  - Mapping conflict → reject behaviour.

Recovery Modes:
  - Recalibrate motor.
  - Reset motor map.
  - Request new Behaviour Capsule.

Integration Rules:
  - UBVM uses motor-forge for motor execution.
  - Robotics organisms depend on motor-forge.
  - LEGION distributes motor tasks.

Affordances:
  - Drive motor.
  - Validate motor output.
  - Transform motor graphs.

Boundaries:
  - Cannot execute behaviours.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Motor controllers.
  - Robotics organisms.

Summary:
  motor-forge provides deterministic, safe, typed motor control for all Forge robotics organisms.

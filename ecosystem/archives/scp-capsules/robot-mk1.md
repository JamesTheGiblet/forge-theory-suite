SCP Capsule: robot-mk1
Semantic Identity:
  robot-mk1 is a foundational robotics organism representing the earliest stable embodiment of Forge semantic motion. It provides a baseline physical agent for testing locomotion, sensing, and behaviour execution.

Purpose:
  To serve as a minimal, deterministic robotics platform for validating semantic behaviours, actuator mappings, and UBVM-driven motion primitives.

Core Behaviour:
  - Executes typed motion primitives.
  - Integrates basic sensor input into Semantic State.
  - Maintains stable locomotion under SCP constraints.
  - Provides deterministic actuator responses.

Interpretation Rules:
  - All sensor data must be typed.
  - All motion commands must originate from SCP-validated behaviours.
  - No unbounded or unsafe actuator commands allowed.
  - Behaviour conflicts must be rejected.

Semantic Lineage:
  - Parent: Forge Robotics Lineage.
  - Siblings: G.I.S.M.O, E.M.B.E.R, wheelie.
  - Dependencies: UBVM, SCP, LEGION.

Internal Invariants:
  - Actuator outputs must remain within calibrated bounds.
  - Sensor readings must remain internally consistent.
  - No untyped state transitions.
  - No self-modification of control loops.

Mutation Rules:
  Allowed:
    - Actuator calibration.
    - Sensor threshold tuning.
  Forbidden:
    - Removing safety constraints.
    - Bypassing SCP interpretation.

Failure Modes:
  - Sensor dropout → Safe-Halt.
  - Actuator overload → subsystem shutdown.
  - Behaviour mismatch → reject behaviour.

Recovery Modes:
  - Recalibrate sensors.
  - Reset actuator map.
  - Request new Behaviour Capsule.

Integration Rules:
  - Accepts behaviours from UBVM.
  - Publishes telemetry to Semantic State.
  - Exposes motion primitives.

Affordances:
  - Move, rotate, stop, scan.
  - Provide sensor telemetry.

Boundaries:
  - Cannot generate behaviours.
  - Cannot override SCP.
  - Cannot operate without typed input.

External Interfaces:
  - Motor controllers.
  - Basic sensors.
  - UBVM hooks.

Summary:
  robot-mk1 is the minimal semantic robotics organism, providing a stable foundation for physical behaviour validation.

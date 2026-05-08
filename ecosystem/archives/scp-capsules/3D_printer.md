SCP Capsule: 3D_printer
Semantic Identity:
  3D_printer is the semantic fabrication organism. It transforms typed fabrication behaviours into deterministic, safe, meaning-preserving additive manufacturing actions.

Purpose:
  To provide a semantic interface for physical fabrication, enabling UBVM-driven printing of components, prototypes, and robotics parts.

Core Behaviour:
  - Executes typed fabrication behaviours.
  - Maintains calibrated extrusion and motion parameters.
  - Ensures deterministic layer-by-layer construction.
  - Validates fabrication safety constraints.

Interpretation Rules:
  - All print commands must be typed.
  - No motion or extrusion may exceed calibrated bounds.
  - Behaviour → print mapping must be deterministic.
  - Unsafe or ambiguous commands must be rejected.

Semantic Lineage:
  - Parent: Forge Robotics Lineage.
  - Sibling: sidewinderx2mod.
  - Domain: Fabrication Layer.

Internal Invariants:
  - Print head motion must remain within limits.
  - Extrusion must remain calibrated.
  - No untyped fabrication transitions.
  - No contradictory fabrication mappings.

Mutation Rules:
  Allowed:
    - Calibration updates.
    - Adding new material profiles.
  Forbidden:
    - Weakening safety constraints.
    - Allowing untyped transitions.

Failure Modes:
  - Overextrusion → halt.
  - Thermal runaway → shutdown.
  - Mapping conflict → reject behaviour.

Recovery Modes:
  - Recalibrate printer.
  - Reset fabrication map.
  - Request new Behaviour Capsule.

Integration Rules:
  - UBVM executes fabrication behaviours.
  - Robotics organisms depend on printed components.
  - LEGION distributes fabrication tasks.

Affordances:
  - Print object.
  - Validate fabrication output.
  - Transform fabrication graphs.

Boundaries:
  - Cannot execute behaviours.
  - Cannot override SCP.
  - Cannot self-modify identity.

External Interfaces:
  - Motion controllers.
  - Extruder controllers.
  - Fabrication organisms.

Summary:
  3D_printer provides deterministic, safe, typed fabrication for the Forge organism.

SCP Capsule: ScriptForge

Semantic Identity:
  ScriptForge is the behavioural scripting organism of the Forge ecosystem. It defines, validates, and executes typed behavioural scripts under SCP and UBVM constraints.

Purpose:
  To provide a deterministic, meaning-preserving scripting layer for behaviours, workflows, and automation across all organisms and domains.

Core Behaviour:
  - Defines typed behavioural scripts and primitives.
  - Validates scripts against SCP and forge-theory invariants.
  - Compiles or maps scripts to UBVM-executable behaviours.
  - Manages behavioural lifecycles and execution metadata.

Interpretation Rules:
  - All scripts must be typed and SCP-compliant.
  - No unbounded or self-modifying scripts.
  - No hidden side effects outside declared affordances.
  - All behaviours must be traceable and reversible at the semantic level.

Semantic Lineage:
  - Parent: behaviour-forge, UBVM-os.
  - Sibling: mind-forge, BuddAI.
  - Domain: Behavioural Layer.

Internal Invariants:
  - Behaviour graphs must remain coherent.
  - No untyped transitions between behavioural states.
  - No contradictory or cyclic dependencies without explicit handling.
  - No weakening of safety or meaning constraints.

Mutation Rules:
  Allowed:
    - Adding new behavioural primitives.
    - Extending script libraries and templates.
  Forbidden:
    - Weakening validation rules.
    - Allowing opaque or self-modifying scripts.

Failure Modes:
  - Script validation failure → reject script.
  - Invariant violation at runtime → halt behaviour and quarantine.
  - Drift in script semantics → require re-validation.

Recovery Modes:
  - Rebuild behavioural graph from source scripts.
  - Re-validate all scripts against current SCP rules.
  - Request new Script Capsule from behaviour-forge.

Integration Rules:
  - UBVM executes ScriptForge-compiled behaviours.
  - BuddAI and mind-forge can generate or analyse scripts.
  - LEGION distributes behavioural workloads across nodes.

Affordances:
  - Define behaviours.
  - Validate behaviours.
  - Transform scripts into executable forms.
  - Inspect and trace behavioural execution.

Boundaries:
  - Cannot override SCP or forge-identity.
  - Cannot execute outside UBVM or approved runtimes.
  - Cannot self-author new execution semantics.

External Interfaces:
  - Developer tooling and CI/CD pipelines.
  - Behavioural dashboards and observability systems.
  - Other organisms requesting behaviours (robotics, trading, cognition).

Summary:
  ScriptForge is the semantic behavioural scripting engine of the Forge organism, turning typed intent into deterministic, SCP-aligned execution.

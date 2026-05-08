# 🧬 Evolutionary Code System (ECS)

## *A proof-of-concept for self-improving, self-learning code*

This project is a demonstration of an "Evolutionary Code System," where code autonomously evolves to fix bugs, handle edge cases, and even correct logic errors based on a cycle of testing and mutation.

---

## Key Features

### 🎯 Targeted Mutation System

The engine uses **exception-driven mutation selection**. When code fails with a specific error, it intelligently applies the most relevant fix.

- `TypeError` → Adds inferred type checking (`isinstance`).
- `NameError` → Adds missing `import` statements.
- `IndexError` → Wraps code in a `try...except IndexError` block.
- `KeyError` → Adds a key existence check (`if key in dict`).
- `AttributeError` → Wraps code in a `try...except AttributeError` block.
- **Logic Error** (Wrong Output) → Attempts to modify the function's return logic.

### 🧠 Self-Learning Feedback Loop

The system tracks the historical success rate of every mutation in an **Evolution Corpus**. It uses this data to dynamically adjust its strategy, preferring mutations that have proven effective in the past.

```python
# Mutations that work get a higher probability of being selected
rate = successful_applications / total_applications
weight = rate + exploration_bonus
```

### 🔬 Context-Aware Mutations

Mutations are not blind; they intelligently infer behavior from the provided test cases to generate more precise code.

- **Infers Types:** Detects the expected data type (e.g., `list`, `str`) from valid test inputs.
- **Infers Return Values:** Determines the correct return value for edge cases (e.g., `None` vs. `False`) from test case expectations.
- **Adapts to Naming:** Uses function naming conventions (e.g., `get_first_item` vs `get_last_item`) to guide logic-fixing mutations.

## How to Run

To see the system in action, simply run the `main.py` script.

```bash
python main.py
```

### Example Output

You will see the engine attempt to evolve a function named `smart_sort`. It will likely fail the initial tests and then apply mutations until a version that passes is found.

```txt
=== Evolving a Sort Function ===
✗ Test failed for smart_sort: 'NoneType' object is not iterable
2024-05-21 12:34:56,789 - INFO - Attempting loop optimization (placeholder).
✗ Test failed for smart_sort: 'NoneType' object is not iterable
✓ Evolution successful for smart_sort
Evolved code:

def smart_sort(items):
    """Sort a list of items"""
    try:
        return sorted(items)
    except Exception as e:
        logging.warning(f'Error in smart_sort: {e}')

=== Evolution Stats ===
Attempts: 3
Functions in library: 1
```

## Future Vision

This simple script is the first step towards a much larger vision of a true Evolutionary Code System. Future goals include:

- **Smarter Mutations:** Using test failure data (the "Evolution Corpus") to intelligently select which mutation to apply, rather than choosing randomly.
- **Advanced Testing:** Generating a wider and more complex range of test cases automatically.
- **The Three-Layer Architecture:** Building out the full system with Adaptive Functions, a Coordination Substrate, and enabling Emergent Capabilities as described in the original ECS document.
- **Real-World Integration:** Creating wrappers and decorators (`@evolutionary_function`) to easily apply this system to existing codebases.
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


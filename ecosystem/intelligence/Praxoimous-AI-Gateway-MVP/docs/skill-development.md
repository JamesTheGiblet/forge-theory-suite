---
sidebar_position: 3
title: Creating a Smart Skill
---

## Tutorial: Creating a New Smart Skill

Welcome to the Praximous Smart Skill development guide! Smart Skills are the backbone of Praximous's local processing power. They are modular, self-contained Python classes that execute specific, deterministic tasks without needing to call a large language model (LLM).

**Why build a Smart Skill?**

- **🚀 Speed:** They run locally and are incredibly fast.
- **💰 Cost-Effective:** They consume minimal resources and don't incur API costs.
- **🔐 Secure:** Logic and data are processed entirely within your on-premise environment.
- **🧩 Reusable:** Build a function once and call it from any internal application via the Praximous API.

This tutorial will guide you through creating a simple `BasicMathSkill` that can perform simple arithmetic.

## Prerequisites

- A running instance of Praximous.
- Basic knowledge of Python, including classes and `asyncio`.

## The Anatomy of a Smart Skill

Every Smart Skill is a Python class that inherits from `BaseSkill` and resides in the `skills/` directory. The `SkillManager` automatically discovers and registers any valid skill file placed there.

A valid skill must have two key methods:

1. `get_capabilities()`: A method that returns a dictionary describing what the skill does, what parameters it accepts, and an example of how to call it. This metadata is used by the `/api/v1/skills` endpoint and the GUI.
2. `async def execute()`: An asynchronous method that contains the core logic of the skill. It receives the `prompt` and any other parameters from the API request.

## Step 1: Create the Skill File

In the root of your Praximous project, navigate to the `skills/` directory. Create a new file named `calculator_skill.py`.
In the root of your Praximous project, navigate to the `skills/` directory. Create a new file named `basic_math_skill.py`.

```text
praximous/
├── skills/
│   ├── __init__.py
│   ├── echo_skill.py
│   └── basic_math_skill.py  <-- YOU ARE HERE
└── ...
```

## Step 2: Write the Skill Code

Open `skills/calculator_skill.py` and add the following code. We'll break down what each part does below.

```python
# skills/basic_math_skill.py

from .base_skill import BaseSkill
from core.logger import log
from typing import Dict, Any, Optional

class BasicMathSkill(BaseSkill):
    """
    A skill to perform basic mathematical operations.
    """
    def __init__(self):
        # The 'name' must match the 'task_type' you will use in API calls.
        self.name = "basic_math"
        super().__init__()

    def get_capabilities(self):
        """
        Returns a dictionary of the skill's capabilities.
        """
        return {
            "skill_name": self.name,
            "description": "Performs basic mathematical calculations like add, subtract, and multiply.",
            "operations": {
                "add": {
                    "description": "Adds two numbers together.",
                    "parameters_schema": {
                        "a": {"type": "number", "description": "The first number.", "optional": False},
                        "b": {"type": "number", "description": "The second number.", "optional": False}
                    },
                    "example_payload": {
                        "task_type": self.name,
                        "operation": "add",
                        "a": 10,
                        "b": 5
                    }
                },
                "subtract": {
                    "description": "Subtracts the second number from the first.",
                    "parameters_schema": {
                        "a": {"type": "number", "description": "The number to subtract from.", "optional": False},
                        "b": {"type": "number", "description": "The number to subtract.", "optional": False}
                    },
                    "example_payload": {
                        "task_type": self.name,
                        "operation": "subtract",
                        "a": 100,
                        "b": 25
                    }
                }
            }
        }

    async def execute(self, prompt: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Executes the skill's logic.
        """
        # Get the desired operation, defaulting to 'add' if not specified.
        operation = kwargs.get("operation", "add").lower()
        log.info(f"Executing {self.name} skill with operation: '{operation}'")

        # Get parameters 'a' and 'b' from kwargs.
        a = kwargs.get("a")
        b = kwargs.get("b")

        # --- Parameter Validation ---
        if a is None or b is None:
            error_msg = f"Missing required parameters 'a' or 'b' for operation '{operation}'."
            log.warning(f"{self.name} failed: {error_msg}")
            return {"success": False, "error": error_msg}

        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            error_msg = "Parameters 'a' and 'b' must be numbers (integer or float)."
            log.warning(f"{self.name} failed: {error_msg}")
            return {"success": False, "error": error_msg}

        # --- Operation Routing ---
        try:
            result = None
            if operation == "add":
                result = a + b
                message = f"Successfully added {a} and {b}."
            elif operation == "subtract":
                result = a - b
                message = f"Successfully subtracted {b} from {a}."
            else:
                error_msg = f"Unknown operation: '{operation}'. Valid operations are: add, subtract."
                log.warning(f"{self.name} failed: {error_msg}")
                return {"success": False, "error": error_msg}

            log.info(f"{self.name} result: {result}")
            
            # Return a standardized success response.
            # The 'data' dictionary is what gets returned in the API response's 'result' field.
            return {
                "success": True,
                "message": message,
                "data": {
                    "operation": operation,
                    "a": a,
                    "b": b,
                    "result": result,
                }
            }
        except Exception as e:
            error_msg = f"An unexpected error occurred during calculation: {str(e)}"
            log.error(f"{self.name} error: {error_msg}", exc_info=True)
            return {"success": False, "error": error_msg}
```

## Step 3: Restart Praximous

For the `SkillManager` to discover your new skill, you need to restart the Praximous service.

```bash
docker-compose restart praximous
```

## Step 4: Test Your New Skill

Once restarted, your skill is live! You can now call it via the `/api/v1/process` endpoint.

Use `curl` or the Praximous GUI to send the following request:

```bash
curl -X POST http://localhost:8000/api/v1/process \
     -H "Content-Type: application/json" \
     -d '{"task_type": "calculator", "prompt": "50 * (10 - 8)"}'
```

**Expected Response:**

You should receive a successful JSON response containing the result of the calculation.

```json
{
  "status": "success",
  "result": {
    "expression": "50 * (10 - 8)",
    "result": 100
  },
  "message": "Successfully evaluated expression.",
  "details": null,
  "request_id": "..."
}
```

Congratulations! You have successfully created and deployed a new Smart Skill in Praximous. You can follow this same pattern to build more complex skills that integrate with other systems, manipulate data, or perform any business logic you need.

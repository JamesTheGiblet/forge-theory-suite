---
sidebar_position: 4
title: Smart Skill Security Checklist
---

## Smart Skill Security Checklist

The Praximous "Smart Skill" platform is designed to be powerful and flexible. With this power comes the responsibility to write secure, robust code. Every skill you develop is a trusted component of the Praximous gateway.

This checklist is a mandatory guide for all developers creating or reviewing Smart Skills. Following these principles will help prevent common vulnerabilities and ensure the integrity of the system.

---

## 1. Input Validation and Sanitization

**Core Principle:** Never trust any data coming from the user or an external system. Always validate and sanitize inputs before using them.

## ✅ Do

* **Validate Types and Values:** Explicitly check that parameters are the expected type and within an expected range or set of values.

    ```python
    operation = kwargs.get("operation")
    if operation not in ["add", "subtract"]:
        return {"success": False, "error": "Invalid operation specified."}

    a = kwargs.get("a")
    if not isinstance(a, (int, float)):
        return {"success": False, "error": "Parameter 'a' must be a number."}
    ```

* **Use Allow-Lists:** When dealing with file paths or commands, prefer allow-lists of known-good values over trying to block bad ones (deny-lists).

### ❌ Don't

* **NEVER use `eval()` or `exec()` on user input.** This is the most critical rule. It can lead to arbitrary code execution.

    ```python
    # DANGEROUS - DO NOT DO THIS
    expression = request.prompt # e.g., "__import__('os').system('rm -rf /')"
    result = eval(expression)
    ```

* **Don't construct file paths directly from user input.** This can lead to Path Traversal vulnerabilities.

    ```python
    # DANGEROUS
    filename = kwargs.get("filename") # e.g., "../../../.env"
    with open(f"/app/data/{filename}", "r") as f:
        # ...
    ```

    **Safe Alternative:** Use a library like `werkzeug.utils.secure_filename` or validate that the filename contains no path separators.

* **Don't construct shell commands or SQL queries with f-strings or `+`.** This leads to Command Injection or SQL Injection.

    ```python
    # DANGEROUS
    import os
    hostname = kwargs.get("host") # e.g., "example.com; ls -la"
    os.system(f"ping -c 1 {hostname}")
    ```

    **Safe Alternative:** Use libraries like `subprocess` with argument lists (`subprocess.run(["ping", "-c", "1", hostname])`) or use a database library's parameterized queries.

---

## 2. Secrets and Credentials Management

**Core Principle:** Keep secrets out of your code and version control.

### ✅ Secrets Management

* **Load all secrets from environment variables.** Use `os.getenv()` to retrieve API keys, passwords, and other credentials.

    ```python
    # In your skill's __init__
    import os
    from core.logger import log

    self.api_key = os.getenv("MY_SKILL_API_KEY")
    if not self.api_key:
        log.warning(f"{self.name}: MY_SKILL_API_KEY is not set. The skill may not function.")
    ```

* **Add the new environment variable to `.env.template`** so other developers know it's required.

### ❌ Secrets Management Mistakes

* **Never hardcode secrets in your Python files.**

    ```python
    # DANGEROUS - DO NOT DO THIS
    api_key = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ```

---

## 3. Secure External Communications

**Core Principle:** Treat all network calls as potentially slow, failing, or malicious.

### ✅ External Communication

* **Use an `async` HTTP client like `httpx`** to avoid blocking the Praximous server.
* **Set reasonable timeouts** on all external requests.
* **Handle exceptions gracefully.** Catch `httpx.RequestError` (for network issues) and `httpx.HTTPStatusError` (for 4xx/5xx responses) and return a proper error from your skill.

    ```python
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.example.com/data")
            response.raise_for_status() # Raises HTTPStatusError for non-2xx responses
            return {"success": True, "data": response.json()}
    except httpx.RequestError as e:
        log.error(f"Network error calling example.com: {e}", exc_info=True)
        return {"success": False, "error": "A network error occurred."}
    except httpx.HTTPStatusError as e:
        log.warning(f"API error from example.com: {e.response.status_code}")
        return {"success": False, "error": f"External API returned status {e.response.status_code}."}
    ```

---

## 4. Dependency Management

**Core Principle:** Your dependencies are part of your application's attack surface.

### ✅ Dependency Management

* **Pin dependency versions** in `requirements.txt` (e.g., `some-library==1.2.3`). This ensures reproducible builds and prevents a new, potentially vulnerable version from being installed automatically.
* **Vet new libraries** before adding them. Check their popularity, maintenance status, and open issues.
* **Run vulnerability scans** on your dependencies using tools like `pip-audit` or GitHub's Dependabot.

---

## 5. Error Handling and Logging

**Core Principle:** Log for debugging, not for leaking sensitive information.

### ✅ Error Handling and Logging

* **Use the central logger:** `from core.logger import log`.
* **Log errors with context.** Use `log.error("...", exc_info=True)` inside `except` blocks to capture the full traceback for easier debugging.

### ❌ Error Handling and Logging Mistakes

* **Don't log sensitive data** like API keys, passwords, or raw user PII in your log messages. If you must log parts of a request, be sure to redact sensitive fields first.
* **Don't return raw exception messages or stack traces** to the end-user in your API response. Return a generic, helpful error message and log the detailed error on the server.

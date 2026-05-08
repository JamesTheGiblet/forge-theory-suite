---
sidebar_position: 2
title: API Reference
---

Welcome to the Praximous API reference. This document provides a comprehensive overview of the available endpoints, authentication methods, and data structures.

## Live Interactive Documentation

The Praximous API is self-documenting. The most accurate and detailed reference, complete with interactive "Try it out" functionality, is available directly from your running Praximous instance.

- **Swagger UI (Recommended):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

We strongly recommend using these live documentation endpoints as the primary source of truth for request parameters, response objects, and status codes.

---

## Authentication

All requests to the Praximous API must be authenticated using an API key. The key must be included in the request headers as `X-API-Key`.

`X-API-Key: prx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

You can generate a new API key by running the following command in your Praximous project directory:

```bash
docker compose run --rm praximous python main.py generate-api-key
```

---

## Core Endpoints

### Process a Task

This is the main endpoint for executing both LLM tasks and local Smart Skills.

`POST /api/v1/process`

**Request Body:**

The payload is a JSON object that specifies the task and its parameters.

*Example (Smart Skill):*

```json
{
  "task_type": "echo",
  "prompt": "Hello from the API"
}
```

*Example (LLM Task):*

```json
{
  "task_type": "default_llm_tasks",
  "prompt": "Explain the theory of relativity in simple terms."
}
```

**Response Body:**

A successful response will have a `200 OK` status and a JSON body containing the result. The structure of the `result` field depends on the skill that was executed.

```json
{
  "status": "success",
  "result": {
    "echoed_prompt": "Hello from the API"
  },
  "message": "Skill 'echo' executed successfully.",
  "details": null,
  "request_id": "req_xxxxxxxx"
}
```

---

## Skill Discovery

### List All Skills

Retrieves a list of all registered Smart Skills.

`GET /api/v1/skills`

### Get Skill Capabilities

Retrieves the detailed capabilities, including operations and parameters, for a specific skill.

`GET /api/v1/skills/{skill_name}`

---

## Auditing & Analytics

### Get Analytics Data

Retrieves a paginated and filterable audit log of all interactions with the `/api/v1/process` endpoint.

`GET /api/v1/analytics`

**Query Parameters:**

- `limit` (int, default: 50): Number of records to return.
- `offset` (int, default: 0): Number of records to skip for pagination.
- `task_type` (string, optional): Filter records by a specific task type.

### Get Chart Data

These endpoints provide aggregated data ready for visualization in a UI.

- `GET /api/v1/analytics/charts/tasks-over-time`
- `GET /api/v1/analytics/charts/requests-per-provider`
- `GET /api/v1/analytics/charts/average-latency-per-provider`

---

## System & Configuration

### Get System Status

Checks the health and availability of all configured LLM providers.

`GET /api/v1/system-status`

### Get Provider Configuration

Returns the contents of the `providers.yaml` configuration file.

`GET /api/v1/config/providers`

---
id: failover-logic
title: Understanding Failover Logic
sidebar_label: Failover Logic
---

## Understanding the Model Router & Failover Logic

One of the core design principles of Praximous is resilience. The platform is built to ensure that your AI-driven applications remain operational even when an external service provider has an outage. This is achieved through the intelligent failover logic built into the **`ModelRouter`**.

This guide explains how this critical feature works and how you can configure it.

## What is Failover?

Failover is the process of automatically switching to a standby or secondary system when the primary system fails or is unavailable. In Praximous, this means if your preferred Large Language Model (LLM) provider (e.g., Gemini) is down, the system will automatically retry the request with your next preferred provider (e.g., a local Ollama instance) without any interruption to the end-user or calling application.

## How it Works in Praximous

The failover mechanism is orchestrated by two key components: the `ModelRouter` and the `config/providers.yaml` file.

1. **`config/providers.yaml`**: This is where you define all the LLM providers Praximous can use. The most important field for failover is `priority`.

    * **Priority**: A number that tells the `ModelRouter` the order of preference. **Lower numbers have higher priority**. The router will always try the provider with the lowest priority number first.

2. **`ModelRouter`**: This is the brain of the routing logic. When it receives a request for an LLM task, it performs the following steps:
    * It reads the `providers.yaml` file and gets a list of all `enabled` providers.
    * It sorts this list based on the `priority` field, from lowest to highest.
    * It attempts to send the request to the first provider in the sorted list (the one with the highest priority).
    * **If the request succeeds**, it returns the response immediately.
    * **If the request fails for any reason** (e.g., a network error, a `500` status from the provider's API, a timeout), the `ModelRouter` catches the exception, logs the error, and automatically moves to the next provider in the list to retry the request.
    * This process continues until a provider succeeds or all available providers have been tried.
    * If all providers fail, the `ModelRouter` raises a `NoAvailableProviderError`, which results in a `503 Service Unavailable` response to the client, indicating that the service is temporarily down.

## Configuration Example

Let's look at a typical `config/providers.yaml` setup for high availability:

```yaml
# config/providers.yaml
providers:
  # --- Primary Provider (External, High-Capability) ---
  - name: "gemini-primary"
    type: "gemini"
    model: "gemini-1.5-pro-latest"
    api_key_env: "GEMINI_API_KEY"
    priority: 10  # Highest priority
    enabled: true

  # --- Secondary Provider (External, Cheaper/Faster) ---
  - name: "gemini-secondary-flash"
    type: "gemini"
    model: "gemini-1.5-flash-latest"
    api_key_env: "GEMINI_API_KEY"
    priority: 20  # Second in line
    enabled: true

  # --- Tertiary/Failover Provider (Local, On-Premise) ---
  - name: "ollama-failover"
    type: "ollama"
    model: "llama3"
    base_url_env: "OLLAMA_API_URL"
    priority: 30  # Last resort
    enabled: true
```

With this configuration, the `ModelRouter` will:

1. Always try `gemini-primary` first.
2. If `gemini-primary` fails, it will automatically try `gemini-secondary-flash`.
3. If both Gemini models fail, it will fall back to the local `ollama-failover` instance as a last resort.

## Benefits of This Approach

* **High Availability**: Your applications are protected from single-provider outages, leading to higher uptime and a better user experience.
* **No Vendor Lock-In**: You can easily change your primary provider by simply adjusting the `priority` values in your configuration file. There are no code changes required in your applications.
* **Cost Optimization**: You can use a powerful but expensive model as your primary, with a cheaper or faster model as a secondary, balancing cost and capability.
* **Ultimate Resilience**: By including a local on-premise model (like Ollama) as the last resort, you can ensure that your system can still provide a basic level of service even if all external connections are down.

---
id: use-cases
title: Use Cases & Case Studies
sidebar_label: Use Cases & Case Studies
---

## Use Cases & Real-World Applications

Praximous is more than just a tool; it's a strategic platform designed to solve critical business challenges related to AI integration. This document showcases practical, real-world examples of how Praximous can deliver tangible value and a strong return on investment (ROI).

---

## 1. Optimizing Customer Support Costs with Smart Routing

**The Business Problem:**
A mid-sized e-commerce company uses an advanced LLM (like GPT-4 or Gemini Advanced) to power its customer support chatbot. While powerful, the cost is high because every single query—from simple "Where is my order?" questions to complex troubleshooting—is sent to the expensive model.

**The Praximous Solution:**
The company deploys Praximous as its central AI gateway. They create two key **Smart Skills**:

1. **`OrderLookupSkill`**: A simple skill that connects to their internal order database.
2. **`FAQSkill`**: A skill that queries a local vector database of their FAQ documents.

Now, the workflow is intelligent:

1. A customer query comes into the Praximous `/api/v1/process` endpoint.
2. A custom `TriageSkill` first analyzes the query's intent.
3. **If the intent is "order status"**, it invokes the `OrderLookupSkill`, which resolves the query locally and instantly—**no LLM call is made**.
4. **If the intent is a common question**, the `FAQSkill` handles it—**no LLM call is made**.
5. **Only if the query is complex and nuanced** is it routed to the expensive external LLM.

**The ROI:**

* **Drastic Cost Reduction:** 70-80% of queries are now handled by free, local Smart Skills, slashing the monthly LLM API bill.
* **Improved Performance:** Simple queries are answered faster, improving the customer experience.
* **Resilience:** With Praximous's failover, if the primary LLM is down, requests can be automatically sent to a secondary provider, ensuring the chatbot never goes completely offline.

---

## 2. Securing Financial Data Analysis with an On-Premise Gateway

**The Business Problem:**
A financial services firm wants to leverage LLMs to summarize sensitive market research reports and internal financial documents. However, due to strict regulatory compliance (like GDPR and SOX), they are prohibited from sending any client data or proprietary information to third-party cloud services.

**The Praximous Solution:**
The firm deploys the **Praximous Enterprise Tier** within its own private cloud.

1. An analyst submits a sensitive document for summarization through an internal application connected to Praximous.
2. The request first passes through the built-in **`PIIRedactionSkill`** (an Enterprise feature). This skill automatically identifies and anonymizes or removes all sensitive data, such as client names, account numbers, and other Personally Identifiable Information (PII).
3. Only the sanitized, anonymous version of the document is sent to the external LLM for analysis.
4. The summary is returned to the secure Praximous environment. The original context is never exposed externally.
5. All steps are logged in the audit database for compliance checks.

**The ROI:**

* **Unlocks AI Capabilities:** Enables the use of state-of-the-art AI models that would otherwise be forbidden.
* **Ensures Compliance:** Maintains full compliance with data privacy regulations, avoiding hefty fines and reputational damage.
* **Total Data Sovereignty:** Guarantees that sensitive data never leaves the company's secure perimeter.

---

## 3. Building Resilient and Vendor-Agnostic Internal Tools

**The Business Problem:**
A tech company has built several internal tools that rely on a specific LLM provider. When that provider experiences an outage or a significant price increase, their tools break, and development teams must scramble to refactor code for a different API.

**The Praximous Solution:**
All internal tools are refactored to point to a single, stable endpoint: the company's Praximous instance.

1. The `config/providers.yaml` file is configured with multiple LLM providers, ranked by priority.
    * **Priority 10:** `gemini-primary` (main provider)
    * **Priority 20:** `azure-openai-secondary` (first failover)
    * **Priority 30:** `ollama-local` (local failover as a last resort)
2. When an internal tool makes a request, Praximous's **`ModelRouter`** handles the logic.
3. It first tries to send the request to Gemini. If the API call fails or times out, it automatically—with no code changes required in the tool itself—retries the request with Azure OpenAI. This process is explained in detail in our Failover Logic Guide.
4. If both external providers fail, it can even fall back to a local model running on-premise via Ollama to provide a basic response instead of a complete failure.

**The ROI:**

* **Increased Uptime & Reliability:** Internal tools become significantly more resilient, as single-provider outages no longer cause downtime.
* **Eliminates Vendor Lock-In:** The company can switch its primary provider at any time by changing one line in a config file, allowing them to optimize for cost and performance without any engineering effort.
* **Simplified Development:** Developers build against one consistent API (Praximous) and don't need to worry about the underlying complexity of multiple LLM SDKs.

---

## 4. Enabling Advanced RAG for Enterprise Knowledge Bases

**The Business Problem:**
A large corporation has millions of internal documents (technical manuals, HR policies, project histories) spread across various systems. They want to build a chatbot that can accurately answer employee questions using this internal knowledge, but building a production-ready Retrieval-Augmented Generation (RAG) system is complex.

**The Praximous Solution:**
The company uses the **Praximous Enterprise Tier**, which includes a built-in RAG & Embedding Framework.

1. Praximous is configured to connect to their document stores (e.g., SharePoint, Confluence).
2. It uses its framework to handle the document chunking, embedding generation (using a local or external model), and storage in a vector database.
3. When an employee asks a question like "What is our policy on international travel for project work?", the Praximous RAG system:
    * Converts the question into an embedding.
    * Searches the vector database for the most relevant document chunks.
    * Constructs a detailed prompt containing both the original question and the retrieved context.
    * Sends this rich prompt to an LLM to generate a precise, context-aware answer.

**The ROI:**

* **Accelerated RAG Deployment:** Reduces the time to deploy a production-grade RAG solution from months to weeks.
* **Highly Accurate Answers:** Provides employees with reliable answers based exclusively on internal company documents, reducing misinformation.
* **Secure Knowledge Management:** The entire process, from document indexing to query handling, runs within the company's secure environment.

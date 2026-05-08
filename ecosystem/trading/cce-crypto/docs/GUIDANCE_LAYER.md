Guidance Layer (G.L)

User Influence · Intent Signal · Non‑Controlling Guide

Classification: Internal · Interactive
Layer Position: Between User Interface and G.O
Authority: Non‑binding influence (no overrides)
Status: 🟢 Live – Slider on dashboard, API endpoints active

---

1. Overview

The Guidance Layer is the only component of CCE OS where the human operator can provide input. It translates a user‑selected mode (e.g., BALANCED, AGGRESSIVE, CAUTIOUS) into a guidance signal that influences system behaviour without overriding any engine or supra‑layer decision.

The system remains autonomous; the guidance signal acts as a soft modifier – like a conversation, not a command.

---

2. Authority

G.L has no direct control. It cannot:

· change engine parameters directly
· block trades
· override F.L, G.O, or AUDIT

It can:

· store the user’s current guidance setting
· broadcast a scalar value (e.g., 0–1) representing the chosen intensity
· be read by G.O, F.L, or engines to adjust thresholds, confidence requirements, or doubt influence

---

3. Interaction Modes

The user selects one of three primary modes via the dashboard:

Mode Description Guidance Signal
CAUTIOUS Prioritise capital preservation; avoid risky trades 0.0 (lowest risk tolerance)
BALANCED Default, neutral behaviour 0.5
AGGRESSIVE Pursue higher returns, accept more risk 1.0 (highest risk tolerance)

Optionally, a continuous slider (0–1) can be offered for finer control.

---

4. How the Signal Is Used

The guidance signal is read by other layers to modify their behaviour:

4.1 F.L – Doubt Influence

· Low signal (CAUTIOUS): doubt flags are applied more aggressively (e.g., lower threshold for injecting doubt, higher weight on regret).
· High signal (AGGRESSIVE): doubt is ignored or heavily dampened.

4.2 G.O – Governance Thresholds

· CAUTIOUS: stability score required for “pass” increases (e.g., 0.85 instead of 0.80), cross‑engine agreement thresholds rise.
· AGGRESSIVE: thresholds lower, allowing earlier activation.

4.3 Engines – Confidence & Sizing

· CAUTIOUS: engines require higher confidence signals (e.g., momentum must be stronger, grid trades only at tighter ranges).
· AGGRESSIVE: lower confidence thresholds, wider grid ranges.

4.4 Risk Layer (if implemented)

· CAUTIOUS: target volatility reduced, position sizing capped.
· AGGRESSIVE: higher risk budgets.

---

5. Storage & API

5.1 Storage

A single value stored in a simple file or database table:

Table guidance_setting (if using DB)

Column Type Description
id INTEGER Always 1
mode TEXT CAUTIOUS / BALANCED / AGGRESSIVE
signal REAL 0.0–1.0
updated_at DATETIME Last change timestamp

5.2 API Endpoints

Endpoint Method Description
/api/guidance/current GET Return current mode and signal
/api/guidance/set POST Set mode (accepts mode or signal)
/api/guidance/history GET Optional: log of changes

5.3 Dashboard Widget

A simple card on the dashboard showing current mode with a dropdown or slider. No technical jargon – just human‑friendly controls.

---

6. Implementation

Phase 1 – Storage & API

· Create storage (file or DB table) for the current setting.
· Add endpoints to read and update the setting.
· Add a simple UI element to the dashboard.

Phase 2 – Integration with F.L

· Modify F.L’s doubt scoring to read the guidance signal.
· Apply signal as a multiplier to doubt weight or threshold.

Phase 3 – Integration with G.O

· Adjust G.O’s stability pass threshold based on signal.
· If G.O eventually governs allocation, use signal to bias allocation weights.

Phase 4 – Engine‑Level Influence (Optional)

· Propagate signal to engines via a shared memory or API call.
· Engines adjust internal confidence thresholds or position sizing accordingly.

---

7. Why G.L Matters

It closes the loop between human intent and machine autonomy. You don’t control the system, but you can talk to it. The system listens, but always decides for itself.

It’s the final piece of the cognitive stack: intention.

---

Giblets Creations · Internal Documentation
Guidance Layer (G.L) · v0.1 (Design)

---

---

## Current Implementation (v1.0)

G.L is live on the dashboard as a risk slider with three modes.

**What is implemented:**
- Dashboard slider: CAUTIOUS / BALANCED / AGGRESSIVE
- API endpoints: `GET /api/guidance/current` and `POST /api/guidance/set`
- In-memory state persists for the session
- Guidance mode shown on dashboard widget

**Endpoints:**
GET  /api/guidance/current  → { mode, signal, updated }
POST /api/guidance/set      → { mode: 'CAUTIOUS'|'BALANCED'|'AGGRESSIVE' }
or { signal: 0.0–1.0 }
**Planned:**
- G.O reads guidance signal to scale recommendation aggressiveness
- F.L uses guidance to adjust doubt thresholds
- Persistent storage across restarts

---

*Giblets Creations · Internal Documentation*
*Guidance Layer (G.L) · v1.0 (Live)*

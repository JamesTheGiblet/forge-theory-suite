Anchor Rotation Rules

BTC ↔ Gold Reserve Swaps · Macro‑Level Rotation

Classification: Internal · Supervisory
Layer Position: Within BTC‑Gold Capital Layer (or adjacent)
Authority: Executes swaps between BTC and gold funds (advisory first, then automatic)
Status: 🔵 Design – v0.1 | Pending implementation after G.O baseline completes

---

1. Overview

The Anchor Rotation Rules define when and how much capital to move between the BTC Fund and the Gold Fund at the highest level. This is not about short‑term allocation (which the Capital Layer handles daily) but about strategic reserve shifts – changing the system’s ultimate store of value.

The rules are driven by the same inputs as the Capital Layer but with longer time horizons and stricter thresholds. They represent the system’s highest‑conviction trades.

---

2. Position in the Architecture

```
BTC‑Gold Capital Layer
   │
   ├── Daily Allocation (G.O + Gold‑BTC Engine) → fine‑tuning
   │
   └── Anchor Rotation (long‑term regime shifts) → reserve swaps
```

The Capital Layer handles the daily allocation and siphoning. The Anchor Rotation is a separate module that triggers only when signals are unusually strong and persistent. It moves larger amounts and with longer‑term conviction.

---

3. Trigger Conditions

Anchor Rotation trades occur only when multiple high‑confidence signals align. The system does not rotate on every fluctuation.

3.1 Primary Signals

Signal Source Required Strength
G.O Regime G.O Clear and sustained (e.g., RISK_ON or RISK_OFF for > 30 days)
Gold‑BTC Ratio Z‑score Gold‑BTC Engine 2.0 or < -2.0, sustained > 14 days
G.O Confidence G.O 0.85 (high confidence)
F.L Doubt F.L Low on both sides (< 0.3) – no strong risk signals
Performance Divergence Engine logs One fund significantly outperforming the other for > 3 months

3.2 Secondary Signals (Optional)

Signal Source Role
Long‑term macro trend External (if ingested) Confirmatory
User Guidance G.L Override or veto (manual)

3.3 Rotation Conditions

· BTC → Gold:
  · G.O regime = RISK_OFF (or trend toward it) AND
  · Gold/BTC ratio Z‑score > 2.0 (gold undervalued relative to BTC) AND
  · G.O confidence > 0.85 AND
  · No strong doubt on gold
· Gold → BTC:
  · G.O regime = RISK_ON AND
  · Gold/BTC ratio Z‑score < -2.0 (BTC undervalued relative to gold) AND
  · G.O confidence > 0.85 AND
  · No strong doubt on BTC

---

4. Trade Size

Anchor rotations are large compared to daily allocation changes. They move a significant percentage of the total capital.

· Base size: 20–50% of the fund being reduced (e.g., if rotating from BTC to gold, move 30% of BTC Fund to gold).
· Split into tranches: Executed over several days (e.g., 10% per day for 3 days) to avoid slippage and confirm conviction.
· Maximum cumulative: In extreme conditions (e.g., Z‑score > 3.0, regime shift clear), up to 100% can be moved.

All sizes are configurable and will be tuned with backtesting.

---

5. Execution & Integration

5.1 Execution Mechanism

Anchor Rotation is executed via the same siphoning mechanism as the Capital Layer, but with larger amounts and a separate reason code (anchor). The rotation is recorded in siphon_events with reason = 'anchor'.

5.2 Cooldown Period

After an anchor rotation, a cooldown period (e.g., 90 days) prevents another rotation in the opposite direction unless signals are extreme. This prevents whipsaw.

5.3 Overrides

· Manual override: User can force a rotation via dashboard.
· AUDIT veto: If system health is degraded, rotations are paused.
· Guidance influence: CAUTIOUS mode reduces rotation size; AGGRESSIVE mode increases it.

---

6. Monitoring & Reporting

6.1 Telegram Report

When an anchor rotation occurs:

```
[ANCHOR] BTC → Gold rotation executed.
Amount: $25,000 (30% of BTC Fund)
Reason: RISK_OFF regime + gold undervalued (Z=2.3)
Cooldown until: 2026-06-28
```

6.2 Dashboard

A new section in the dashboard shows:

· Current anchor (BTC / Gold)
· Last rotation date and reason
· Next cooldown end
· Signal dashboard (Z‑score, regime, confidence)

---

7. Storage

Additional Columns in siphon_events

· reason now includes anchor as a value.
· For anchor rotations, we may store additional context: anchor_trigger_values (JSON) capturing all signals that triggered the rotation.

---

8. Implementation Plan

Phase 1 – Passive Monitoring (v0.1)

· Compute anchor signals continuously but only log them.
· No actual rotations.

Phase 2 – Advisory Mode (v0.2)

· Send Telegram alerts when anchor conditions are met, with suggested action.
· Dashboard shows “Anchor Rotation Opportunity”.

Phase 3 – Semi‑Automatic (v0.3)

· Execute rotations but with user confirmation (e.g., “Approve rotation?” in dashboard/Telegram).

Phase 4 – Fully Automatic (v1.0)

· Execute rotations automatically based on rules, with manual override.

---

9. Why This Completes the Architecture

The Anchor Rotation Rules are the highest‑level expression of the system’s macro view. They decide where the system stores its long‑term wealth. Combined with the Capital Layer (daily allocation) and the CSS (siphoning profits upward), the system now has a complete capital flow:

1. Engines generate PnL.
2. CSS siphons surplus to the reserve funds (BTC and gold).
3. Capital Layer allocates daily between BTC and gold funds based on regime.
4. Anchor Rotation occasionally shifts the bulk of reserves between BTC and gold at high‑conviction moments.

This mirrors how a real macro hedge fund operates: activity generates cash, cash is allocated to reserves, reserves are rotated based on long‑term macro views.

---

Giblets Creations · Internal Documentation
Anchor Rotation Rules · v0.1 (Design)
Next: Implement after G.O 24-cycle baseline — March/April 2026

---

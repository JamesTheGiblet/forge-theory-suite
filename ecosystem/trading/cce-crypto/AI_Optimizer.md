# AI Strategy Optimizer
### CCE Core Framework — Rule-Based Engine Analysis

The AI Optimizer reads live engine databases, applies CCE-specific analysis rules, and generates actionable improvement suggestions — no external API key required.

---

## Run It

```bash
node scripts/optimize.js
Reports saved to reports/optimize-[timestamp].md
Also runs automatically every Monday 9am via PM2 cron alongside F.L.
What It Analyses
Source
Data
cce-production.db
State distribution, F&G, portfolio performance, transitions
obs-production.db
Cross-engine patterns from Observer
fl-production.db
Doubt scores and regret lessons from F.L
grid-production.db
Grid performance, centre drift
mom-production.db
Momentum signal distribution
Analysis Rules
Dormancy — flags if engine is DORMANT >70% of cycles and suggests reducing minDormantDays
Fear & Greed — contextualises dormancy against market sentiment. Dormant at F&G 13 is correct. Dormant at F&G 65 is a problem.
Portfolio performance — checks total return, trailing stop adequacy, compounding progress
Transition failure rate — if WATCHING → DORMANT rate is >60%, entry thresholds may be too strict
Doubt scores — surfaces F.L patterns with doubt > 0.5 and suggests tightening entry conditions in those contexts
Lessons — analyses average regret across F.L lessons and suggests better exit timing
Grid drift — warns if BTC price has drifted >3% from grid centre (approaching 5% recentre threshold)
BTC dominance trend — rising dominance = stay DORMANT, falling dominance = watch for IGNITION
Sample Output
📊 KEY FINDINGS

  ℹ️  Engine in DORMANT 100% of cycles — market conditions unfavourable
  ℹ️  Average Fear & Greed: 16.9 | Extreme Fear cycles: 58.8%
  ⚠️  Sustained extreme fear — wait for F&G > 40 before expecting activity
  ℹ️  Portfolio: $813.54 | Total return: +178.9%
  ✅ Strong performance — consider trailing stop adequacy
  ✅ All doubt scores below 0.5 — no high-regret patterns

💡 IMPROVEMENT SUGGESTIONS

  No config changes recommended at this time.
  Platform is performing within expected parameters.

⚠️  RISK ASSESSMENT

  • Trailing stop (2.1%) may be too tight in high-momentum moves

🔬 NEXT EXPERIMENT

  Continue current configuration — insufficient data for changes.
  Check back after 30+ more cycles.
Adding New Rules
Edit scripts/optimize.js — add to the analyse() function:
// Example: flag if grid has been active > 30 days with zero profit
if (grid && grid.completed_cycles === 0 && grid.grid_state === 'ACTIVE') {
  const gridAge = /* calculate days since first cycle */;
  if (gridAge > 30) {
    findings.push({ level: 'WARN', msg: `Grid active ${gridAge} days with zero completed cycles — consider adjusting spacing` });
    suggestions.push({
      parameter: 'grid.spacing',
      current: 0.01,
      suggested: 0.008,
      rationale: 'Tighter spacing increases fill probability in low-volatility environment'
    });
  }
}
PM2
cce-optimizer   cron: 0 9 * * 1   Monday 9am
pm2 ls | grep optimizer
pm2 restart cce-optimizer
cat reports/optimize-*.md | tail -50
Giblets Creations · v2.4.0 · March 2026
"I wanted it. So I forged it. Now forge yours."

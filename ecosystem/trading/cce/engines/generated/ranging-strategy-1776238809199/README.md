# Ranging Accumulation Strategy

## Generated Strategy Capsule

**Generated:** 2026-04-15T07:40:09.199Z
**Market Regime:** RANGING
**Phase:** ACCUMULATION
**Sentiment:** NEUTRAL

## Strategy Parameters

| Parameter | Value |
|-----------|-------|
| Entry | Price within range, place limit orders |
| Target | 2% |
| Stop | 0.8% |
| Max Hold | 7 days |

## Deployment

```bash
cd ~/cce/engines/generated/ranging-strategy-1776238809199
npm init -y
npm install sql.js
pm2 start monitor.js --name ranging-strategy-1776238809199
```

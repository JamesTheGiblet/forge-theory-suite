// guidance-layer.js
// Fetches the current guidance signal from the dashboard and returns
// subtle multipliers that influence engine behaviour without overriding decisions.
// Philosophy: the engine makes all decisions — guidance nudges appetite only.

'use strict';

const http = require('http');

// Cache the guidance to avoid hitting the API every cycle
let _cachedGuidance = { signal: 0.5, mode: 'BALANCED', fetched: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchGuidance(dashboardPort = 3000) {
  const now = Date.now();
  if (now - _cachedGuidance.fetched < CACHE_TTL_MS) {
    return _cachedGuidance;
  }

  return new Promise((resolve) => {
    const req = http.get(
      { hostname: 'localhost', port: dashboardPort, path: '/api/guidance/current', timeout: 3000 },
      (res) => {
        let data = '';
        res.on('data', (d) => { data += d; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            _cachedGuidance = {
              signal: parsed.signal ?? 0.5,
              mode:   parsed.mode   ?? 'BALANCED',
              fetched: now
            };
            resolve(_cachedGuidance);
          } catch (e) {
            resolve(_cachedGuidance); // return cached on parse error
          }
        });
      }
    );
    req.on('error', () => resolve(_cachedGuidance)); // return cached on network error
    req.on('timeout', () => { req.destroy(); resolve(_cachedGuidance); });
  });
}

/**
 * Returns guidance multipliers based on current signal.
 * All multipliers are subtle — they nudge, never override.
 *
 * @param {number} signal - 0.0 (CAUTIOUS) to 1.0 (AGGRESSIVE)
 * @returns {object} multipliers
 */
function getMultipliers(signal) {
  // Linear interpolation between CAUTIOUS and AGGRESSIVE
  // signal = 0.0 → CAUTIOUS
  // signal = 0.5 → BALANCED (all multipliers = 1.0)
  // signal = 1.0 → AGGRESSIVE

  // Position size multiplier: 0.80 → 1.00 → 1.15
  const positionMultiplier = signal <= 0.5
    ? 0.80 + (signal / 0.5) * 0.20        // 0.80 to 1.00
    : 1.00 + ((signal - 0.5) / 0.5) * 0.15; // 1.00 to 1.15

  // Circuit breaker adjustment (% points): +5 → 0 → -5
  // CAUTIOUS: triggers earlier (e.g. -20 becomes -15)
  // AGGRESSIVE: triggers later (e.g. -20 becomes -25)
  const circuitBreakerAdjust = signal <= 0.5
    ? 5 - (signal / 0.5) * 5   // +5 to 0
    : 0 - ((signal - 0.5) / 0.5) * 5; // 0 to -5

  // Sentiment bias: -0.05 → 0 → +0.05
  const sentimentBias = (signal - 0.5) * 0.10;

  return {
    positionMultiplier:    parseFloat(positionMultiplier.toFixed(3)),
    circuitBreakerAdjust:  parseFloat(circuitBreakerAdjust.toFixed(2)),
    sentimentBias:         parseFloat(sentimentBias.toFixed(3))
  };
}

/**
 * Main export — call at the start of each engine cycle.
 * Returns the current guidance with multipliers applied.
 */
async function getGuidanceInfluence(dashboardPort = 3000) {
  const guidance = await fetchGuidance(dashboardPort);
  const multipliers = getMultipliers(guidance.signal);

  if (guidance.mode !== 'BALANCED') {
    console.log(`🎮 Guidance Layer: ${guidance.mode} (signal: ${guidance.signal.toFixed(2)}) — position ×${multipliers.positionMultiplier}, CB adjust: ${multipliers.circuitBreakerAdjust > 0 ? '+' : ''}${multipliers.circuitBreakerAdjust}%, sentiment bias: ${multipliers.sentimentBias > 0 ? '+' : ''}${multipliers.sentimentBias.toFixed(3)}`);
  }

  return {
    mode: guidance.mode,
    signal: guidance.signal,
    multipliers
  };
}

module.exports = { getGuidanceInfluence, getMultipliers };

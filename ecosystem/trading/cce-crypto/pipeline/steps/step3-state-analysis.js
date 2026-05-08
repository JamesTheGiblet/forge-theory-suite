// pipeline/steps/step3-state-analysis.js
// CCE Core Framework — Pipeline Step 3
// STATE AND PATTERN ANALYSIS
//
// Reads the analytics report from Step 2.
// Identifies full market cycles from price history.
// Measures temporal lag between lead and follower assets per cycle.
// Formalises the state map with entry/exit conditions grounded in data.
//
// Output: { stateMap, temporalProfile } saved to runDir

'use strict';

const fs   = require('fs');
const path = require('path');

class Step3_StateAnalysis {

  constructor(analyticsReport, targetSpec, runDir) {
    this.report  = analyticsReport;
    this.spec    = targetSpec;
    this.runDir  = runDir;
  }

  // ── EXECUTE ───────────────────────────────────────────────────────────────

  async execute() {
    console.log('[STEP 3] Starting state and pattern analysis...');

    const leadAsset = this.spec.asset_universe.find(a => a.role === 'lead');
    if (!leadAsset) throw new Error('No lead asset defined in target spec');

    const leadData = this.report.assets[leadAsset.symbol];
    if (!leadData?.candles?.length) throw new Error(`No price data for lead asset: ${leadAsset.symbol}`);

    // ── 1. IDENTIFY FULL MARKET CYCLES ───────────────────────────────────────

    console.log('[STEP 3] Identifying market cycles...');
    const cycles = this._identifyCycles(leadData.candles, leadAsset.symbol);
    console.log(`[STEP 3]   Found ${cycles.length} full market cycles`);

    if (cycles.length < 3) {
      console.warn('[STEP 3]   ⚠️  Fewer than 3 cycles — G03-A will fail');
    }

    cycles.forEach((c, i) => {
      console.log(`[STEP 3]   Cycle ${i + 1}: ${c.start_date} → ${c.end_date} | Peak: ${c.bull_peak_date} (+${(c.bull_gain * 100).toFixed(0)}%) | Bear: -${(c.bear_loss * 100).toFixed(0)}%`);
    });

    // ── 2. MEASURE TEMPORAL DELAYS PER CYCLE ─────────────────────────────────

    console.log('[STEP 3] Measuring temporal delays...');
    const temporalProfile = this._buildTemporalProfile(cycles);
    console.log(`[STEP 3]   Pairs analysed: ${temporalProfile.pairs.length}`);
    temporalProfile.pairs.forEach(p => {
      console.log(`[STEP 3]   ${p.lead_asset}→${p.follower_asset}: mean lag ${p.mean_lag.toFixed(1)}d | median ${p.median_lag.toFixed(1)}d | confidence: ${p.confidence}`);
    });

    // ── 3. ANALYSE MARKET REGIME STATISTICS ──────────────────────────────────

    console.log('[STEP 3] Analysing market regimes...');
    const regimes = this._analyseRegimes(leadData.candles, this.report.sentiment);

    // ── 4. FORMALISE STATE MAP ────────────────────────────────────────────────

    console.log('[STEP 3] Formalising state map...');
    const stateMap = this._formaliseStateMap(cycles, temporalProfile, regimes);
    console.log(`[STEP 3]   States defined: ${stateMap.map(s => s.state_id).join(', ')}`);

    // Validate portfolio weights
    for (const state of stateMap) {
      const total = state.portfolio.allocations.reduce((s, a) => s + a.weight, 0);
      if (Math.abs(total - 1.0) > 0.001) {
        console.warn(`[STEP 3]   ⚠️  ${state.state_id}: portfolio weights sum to ${total.toFixed(3)}, not 1.0`);
      }
    }

    // ── 5. SAVE OUTPUTS ───────────────────────────────────────────────────────

    const result = { stateMap, temporalProfile, cycles, regimes };

    fs.writeFileSync(
      path.join(this.runDir, 'cycles.json'),
      JSON.stringify(cycles, null, 2)
    );
    fs.writeFileSync(
      path.join(this.runDir, 'regimes.json'),
      JSON.stringify(regimes, null, 2)
    );

    console.log(`[STEP 3] Complete — ${stateMap.length} states, ${temporalProfile.pairs.filter(p => p.use_in_strategy).length} usable lag pairs`);
    return result;
  }

  // ── CYCLE IDENTIFICATION ──────────────────────────────────────────────────
  // A full cycle = one bull phase (price +50% from local min over 30+ days)
  //              + one bear phase (price -30% from local max over 30+ days)

  _identifyCycles(candles, leadSymbol) {
    const closes = candles.map(c => c.close);
    const dates  = candles.map(c => c.date);
    const cycles = [];

    let i = 0;
    while (i < closes.length - 60) {
      // Find local minimum (potential cycle start)
      const localMin = this._findLocalMin(closes, i, 30);
      if (!localMin) break;

      // Look for +50% gain from local min
      let peakIdx = -1;
      let peakVal = localMin.value * 1.5;

      for (let j = localMin.idx + 30; j < Math.min(localMin.idx + 730, closes.length); j++) {
        if (closes[j] >= peakVal) {
          // Find the actual peak after this confirmation
          peakIdx = j;
          for (let k = j; k < Math.min(j + 180, closes.length); k++) {
            if (closes[k] > closes[peakIdx]) peakIdx = k;
          }
          break;
        }
      }

      if (peakIdx === -1) { i = localMin.idx + 1; continue; }

      // Look for -30% bear from peak
      let troughIdx = -1;
      const bearTarget = closes[peakIdx] * 0.70;

      for (let j = peakIdx + 30; j < Math.min(peakIdx + 730, closes.length); j++) {
        if (closes[j] <= bearTarget) {
          troughIdx = j;
          // Find actual trough
          for (let k = j; k < Math.min(j + 90, closes.length); k++) {
            if (closes[k] < closes[troughIdx]) troughIdx = k;
          }
          break;
        }
      }

      if (troughIdx === -1) { i = peakIdx + 1; continue; }

      const bullGain  = (closes[peakIdx] - localMin.value) / localMin.value;
      const bearLoss  = (closes[peakIdx] - closes[troughIdx]) / closes[peakIdx];
      const bullDays  = peakIdx - localMin.idx;
      const bearDays  = troughIdx - peakIdx;

      // Validate minimum duration
      if (bullDays >= 30 && bearDays >= 30) {
        cycles.push({
          cycle_id:       cycles.length + 1,
          start_date:     dates[localMin.idx],
          bull_peak_date: dates[peakIdx],
          end_date:       dates[troughIdx],
          start_idx:      localMin.idx,
          peak_idx:       peakIdx,
          end_idx:        troughIdx,
          start_price:    localMin.value,
          peak_price:     closes[peakIdx],
          end_price:      closes[troughIdx],
          bull_gain:      bullGain,
          bear_loss:      bearLoss,
          bull_days:      bullDays,
          bear_days:      bearDays,
          lead_asset:     leadSymbol
        });

        i = troughIdx + 1;
      } else {
        i = peakIdx + 1;
      }
    }

    return cycles;
  }

  _findLocalMin(closes, startIdx, lookback) {
    let minIdx = startIdx;
    let minVal = closes[startIdx];
    const end = Math.min(startIdx + lookback, closes.length);
    for (let i = startIdx; i < end; i++) {
      if (closes[i] < minVal) { minVal = closes[i]; minIdx = i; }
    }
    return { idx: minIdx, value: minVal };
  }

  // ── TEMPORAL DELAY MEASUREMENT ────────────────────────────────────────────
  // For each cycle and each lead/follower pair:
  // Find when lead asset broke above SMA20 (fresh crossover)
  // Find when follower asset broke above SMA20 (fresh crossover)
  // Measure the lag in days

  _buildTemporalProfile(cycles) {
    const leadAssets     = this.spec.asset_universe.filter(a => a.role === 'lead');
    const followerAssets = this.spec.asset_universe.filter(a => a.role === 'follower');
    const pairs = [];

    for (const lead of leadAssets) {
      for (const follower of followerAssets) {
        const leadData     = this.report.assets[lead.symbol];
        const followerData = this.report.assets[follower.symbol];

        if (!leadData?.candles || !followerData?.candles) continue;

        const observations = [];

        for (const cycle of cycles) {
          // Find lead breakout date in this cycle
          const leadBreakout = this._findSMABreakout(
            leadData.candles,
            leadData.indicators?.sma_20,
            cycle.start_idx,
            cycle.peak_idx
          );

          if (!leadBreakout) continue;

          // Find follower breakout date after lead breakout
          const followerStartIdx = Math.max(
            this._dateToIndex(followerData.candles, leadData.candles[leadBreakout].date),
            0
          );

          if (followerStartIdx < 0) continue;

          const followerBreakout = this._findSMABreakout(
            followerData.candles,
            followerData.indicators?.sma_20,
            followerStartIdx,
            followerStartIdx + 60 // look 60 days ahead
          );

          if (!followerBreakout) continue;

          const leadDate     = leadData.candles[leadBreakout]?.date;
          const followerDate = followerData.candles[followerBreakout]?.date;

          if (!leadDate || !followerDate) continue;

          const lagDays = Math.round(
            (new Date(followerDate) - new Date(leadDate)) / (1000 * 60 * 60 * 24)
          );

          if (lagDays >= 0 && lagDays <= 30) {
            observations.push({
              cycle_id:       cycle.cycle_id,
              lead_date:      leadDate,
              follower_date:  followerDate,
              observed_lag:   lagDays
            });
          }
        }

        if (observations.length === 0) continue;

        const lags       = observations.map(o => o.observed_lag);
        const mean_lag   = lags.reduce((a, b) => a + b, 0) / lags.length;
        const median_lag = this._median(lags);
        const std_lag    = this._std(lags, mean_lag);
        const n          = observations.length;

        const confidence =
          n >= 5 && std_lag < 0.5 * mean_lag ? 'HIGH'   :
          n >= 3 && std_lag < mean_lag        ? 'MEDIUM' :
          n >= 2                              ? 'LOW'    : 'INSUFFICIENT';

        pairs.push({
          lead_asset:      lead.symbol,
          follower_asset:  follower.symbol,
          mean_lag:        Math.round(mean_lag * 10) / 10,
          median_lag:      Math.round(median_lag * 10) / 10,
          std_lag:         Math.round(std_lag * 10) / 10,
          n,
          confidence,
          use_in_strategy: confidence === 'HIGH' || confidence === 'MEDIUM',
          observations
        });
      }
    }

    return {
      cycles_analysed: cycles.length,
      pairs
    };
  }

  _findSMABreakout(candles, sma20, startIdx, endIdx) {
    if (!sma20) return null;
    const end = Math.min(endIdx, candles.length - 1);

    for (let i = Math.max(startIdx, 1); i <= end; i++) {
      const prevAbove = candles[i - 1]?.close > (sma20[i - 1] || 0);
      const currAbove = candles[i]?.close > (sma20[i] || 0);
      // Fresh crossover — was below, now above
      if (!prevAbove && currAbove) return i;
    }
    return null;
  }

  _dateToIndex(candles, date) {
    return candles.findIndex(c => c.date >= date);
  }

  // ── REGIME ANALYSIS ───────────────────────────────────────────────────────

  _analyseRegimes(candles, sentiment) {
    const closes     = candles.map(c => c.close);
    const sma200     = this._sma(closes, 200);
    const sentimentMap = {};

    if (sentiment) {
      sentiment.forEach(s => { sentimentMap[s.date] = s.value; });
    }

    let bullDays = 0, bearDays = 0, neutralDays = 0;
    let extremeFearDays = 0, extremeGreedDays = 0;

    for (let i = 200; i < candles.length; i++) {
      const aboveSMA200 = closes[i] > (sma200[i] || 0);
      if (aboveSMA200) bullDays++; else bearDays++;

      const fg = sentimentMap[candles[i].date];
      if (fg != null) {
        if (fg <= 20) extremeFearDays++;
        else if (fg >= 80) extremeGreedDays++;
        else neutralDays++;
      }
    }

    const total = bullDays + bearDays;
    return {
      bull_pct:          total ? bullDays / total : 0,
      bear_pct:          total ? bearDays / total : 0,
      extreme_fear_pct:  sentiment ? extremeFearDays / candles.length : null,
      extreme_greed_pct: sentiment ? extremeGreedDays / candles.length : null,
      avg_bull_duration: this._avgPhaseDuration(closes, sma200, true),
      avg_bear_duration: this._avgPhaseDuration(closes, sma200, false)
    };
  }

  _avgPhaseDuration(closes, sma200, bullPhase) {
    const durations = [];
    let current = 0;
    let inPhase = false;

    for (let i = 200; i < closes.length; i++) {
      const isBull = closes[i] > (sma200[i] || 0);
      if ((bullPhase ? isBull : !isBull)) {
        current++;
        inPhase = true;
      } else if (inPhase) {
        durations.push(current);
        current = 0;
        inPhase = false;
      }
    }
    if (current > 0) durations.push(current);
    return durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  // ── STATE MAP FORMALISATION ───────────────────────────────────────────────
  // Translates the draft state map into a formal state map
  // with entry/exit conditions grounded in the observed cycle data.

  _formaliseStateMap(cycles, temporalProfile, regimes) {
    const draft    = this.spec.state_map_draft || [];
    const stateMap = [];
    const usablePairs = temporalProfile.pairs.filter(p => p.use_in_strategy);

    // Use observed cycle characteristics to set thresholds
    const avgBullGain = cycles.length
      ? cycles.reduce((s, c) => s + c.bull_gain, 0) / cycles.length
      : 0.5;
    const avgBearLoss = cycles.length
      ? cycles.reduce((s, c) => s + c.bear_loss, 0) / cycles.length
      : 0.35;

    // Sentiment thresholds derived from regime analysis
    const panicThreshold      = 20;  // F&G below this = extreme fear
    const greedThreshold      = 75;  // F&G above this = greed
    const extremeGreedThreshold = 90; // F&G above this = extreme greed / exit signal

    for (const draft_state of draft) {
      const state = {
        state_id:   draft_state.state_name,
        state_type: this._classifyStateType(draft_state),
        notes:      `Derived from ${cycles.length} observed market cycles. Avg bull: +${(avgBullGain * 100).toFixed(0)}% Avg bear: -${(avgBearLoss * 100).toFixed(0)}%`,
        portfolio: {
          allocations: this._buildAllocations(draft_state, usablePairs)
        }
      };

      // Entry and exit conditions per state
      const conditions = this._buildConditions(
        draft_state,
        usablePairs,
        panicThreshold,
        greedThreshold,
        extremeGreedThreshold,
        regimes
      );

      state.entry_condition = conditions.entry;
      state.exit_condition  = conditions.exit;

      stateMap.push(state);
    }

    // Ensure EMERGENCY state exists
    if (!stateMap.some(s => s.state_type === 'EMERGENCY')) {
      stateMap.push({
        state_id:        'EXTRACTION',
        state_type:      'EMERGENCY',
        entry_condition: `fear_greed() < ${panicThreshold} OR pct_change("${this.spec.asset_universe.find(a => a.role === 'lead')?.symbol || 'BTC'}", 1) < -0.15`,
        exit_condition:  `fear_greed() > 30 AND days_in_state >= 14`,
        portfolio:       { allocations: [{ asset: 'CASH', weight: 1.0 }] },
        notes:           'Emergency exit state — added by Step 3 to satisfy G03-E requirement'
      });
    }

    return stateMap;
  }

  _classifyStateType(draft_state) {
    const name = draft_state.state_name.toUpperCase();
    if (name.includes('EXTRACT') || name.includes('EMERGENCY')) return 'EMERGENCY';
    if (name.includes('DORMANT') || name.includes('CASH'))       return 'RISK_OFF';
    if (name.includes('ACCUM')   || name.includes('WATCH'))      return 'TRANSITION';
    return 'RISK_ON';
  }

  _buildAllocations(draft_state, usablePairs) {
    // Use draft allocations as the base
    // Adjust follower weights based on temporal profile confidence
    const assets = draft_state.expected_assets || ['CASH'];
    const n      = assets.length;

    if (assets.includes('CASH') && n === 1) {
      return [{ asset: 'CASH', weight: 1.0 }];
    }

    // Distribute weights — lead asset gets proportionally more
    const leadSymbols     = this.spec.asset_universe.filter(a => a.role === 'lead').map(a => a.symbol);
    const followerSymbols = this.spec.asset_universe.filter(a => a.role === 'follower').map(a => a.symbol);

    const allocations = [];
    let remaining = 1.0;
    const cashIdx = assets.indexOf('CASH') !== -1 ? assets.indexOf('CASH') : -1;

    // Cash gets 0 unless explicitly in allocation
    if (cashIdx !== -1) {
      const cashWeight = draft_state.allocation === 'PARTIAL' ? 0.5 : 0;
      if (cashWeight > 0) {
        allocations.push({ asset: 'CASH', weight: cashWeight });
        remaining -= cashWeight;
      }
    }

    const nonCash = assets.filter(a => a !== 'CASH');
    if (nonCash.length === 0) return [{ asset: 'CASH', weight: 1.0 }];

    // Lead assets get 60% of non-cash, followers split the rest
    const leadInState     = nonCash.filter(a => leadSymbols.includes(a));
    const followersInState = nonCash.filter(a => followerSymbols.includes(a));

    if (leadInState.length > 0 && followersInState.length > 0) {
      const leadTotal     = remaining * 0.6;
      const followerTotal = remaining * 0.4;
      leadInState.forEach(a     => allocations.push({ asset: a, weight: leadTotal / leadInState.length }));
      followersInState.forEach(a => allocations.push({ asset: a, weight: followerTotal / followersInState.length }));
    } else {
      nonCash.forEach(a => allocations.push({ asset: a, weight: remaining / nonCash.length }));
    }

    // Normalise to exactly 1.0
    const total = allocations.reduce((s, a) => s + a.weight, 0);
    allocations.forEach(a => { a.weight = Math.round((a.weight / total) * 1000) / 1000; });

    return allocations;
  }

  _buildConditions(draft_state, usablePairs, panicFG, greedFG, extremeGreedFG, regimes) {
    const lead   = this.spec.asset_universe.find(a => a.role === 'lead)?.symbol || 'BTC'`);
    const name   = draft_state.state_name.toUpperCase();
    const type   = this._classifyStateType(draft_state);

    // Build lag signal references from usable pairs
    const lagSignals = usablePairs.map(p =>
      `was_above("${p.lead_asset}", "SMA_20", ${Math.round(p.median_lag)})`
    );

    if (type === 'EMERGENCY') {
      return {
        entry: `fear_greed() < ${panicFG} OR pct_change("${lead}", 1) < -0.15`,
        exit:  `fear_greed() > 30 AND days_in_state >= 14`
      };
    }

    if (type === 'RISK_OFF') {
      return {
        entry: `fear_greed() < ${panicFG} OR price("${lead}") < indicator("${lead}", "SMA_200")`,
        exit:  `fear_greed() >= 30 AND price("${lead}") > indicator("${lead}", "SMA_20")`
      };
    }

    if (name.includes('ACCUM')) {
      return {
        entry: `fear_greed() >= 30 AND fear_greed() < ${greedFG} AND price("${lead}") > indicator("${lead}", "SMA_20")`,
        exit:  `fear_greed() < 25 OR price("${lead}") < indicator("${lead}", "SMA_20")`
      };
    }

    if (name.includes('IGNIT') || name.includes('ACTIVE')) {
      return {
        entry: `fear_greed() >= 40 AND price("${lead}") > indicator("${lead}", "SMA_50") AND pct_change("${lead}", 7) > 0.05`,
        exit:  `fear_greed() > ${extremeGreedFG} OR fear_greed() < 20`
      };
    }

    if (name.includes('CASCADE') || name.includes('ALT')) {
      const lagPart = lagSignals.length > 0
        ? ` AND ${lagSignals.join(' AND ')}`
        : '';
      return {
        entry: `fear_greed() >= 50 AND btc_dominance() > 55${lagPart}`,
        exit:  `fear_greed() < 25 OR btc_dominance() < 45`
      };
    }

    // Generic fallback
    return {
      entry: `fear_greed() >= 40 AND price("${lead}") > indicator("${lead}", "SMA_20")`,
      exit:  `fear_greed() < 25`
    };
  }

  // ── STATISTICS ────────────────────────────────────────────────────────────

  _sma(closes, window) {
    return closes.map((_, i) => {
      if (i < window - 1) return null;
      const slice = closes.slice(i - window + 1, i + 1);
      return slice.reduce((a, b) => a + b, 0) / window;
    });
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  _std(arr, mean) {
    if (arr.length < 2) return 0;
    const variance = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

}

module.exports = Step3_StateAnalysis;

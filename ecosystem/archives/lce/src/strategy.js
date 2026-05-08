// src/strategy.js — LCE State Machine
// States: DORMANT → STALKING → TRIGGERED → RIDING → EXITING

const config = require('../config');

const STATES = {
  DORMANT:   'DORMANT',
  STALKING:  'STALKING',
  TRIGGERED: 'TRIGGERED',
  RIDING:    'RIDING',
  EXITING:   'EXITING',
};

class Strategy {
  constructor() {
    this.state = STATES.DORMANT;
    this.stateEnteredAt = Date.now();
    this.activePosition = null;  // { symbol, side, entryPrice, size, stopLoss, takeProfit }
    this.dailyPnlPct = 0;
    this.dailyTrades = 0;
    this.dailyResetAt = this._todayMidnight();
  }

  // ─── Main evaluation — called every 5 minutes ────────────────────────────

  evaluate(snapshots) {
    this._checkDailyReset();

    // Circuit breaker
    if (this.dailyPnlPct <= -config.risk.maxDailyLossPct) {
      if (this.state !== STATES.DORMANT) {
        console.log(`[LCE] ⛔ Circuit breaker: daily loss ${this.dailyPnlPct.toFixed(2)}% — forcing DORMANT`);
        this._transition(STATES.DORMANT);
      }
      return { state: this.state, action: 'CIRCUIT_BREAKER', signal: null };
    }

    switch (this.state) {
      case STATES.DORMANT:   return this._evalDormant(snapshots);
      case STATES.STALKING:  return this._evalStalking(snapshots);
      case STATES.TRIGGERED: return this._evalTriggered(snapshots);
      case STATES.RIDING:    return this._evalRiding(snapshots);
      case STATES.EXITING:   return this._evalExiting(snapshots);
      default:               return { state: this.state, action: 'HOLD', signal: null };
    }
  }

  // ─── DORMANT: scanning for first liquidation spike ───────────────────────

  _evalDormant(snapshots) {
    const best = this._findBestSignal(snapshots, config.signals.minLiqUsd5m);

    if (best) {
      console.log(`[LCE] 👁  Liquidation spike detected: ${best.symbol} $${(best.liq5m.totalLiqUsd / 1e6).toFixed(1)}M in 5min`);
      this._transition(STATES.STALKING);
      this.stalkedSymbol = best.symbol;
      this.stalkedSide = this._tradeSide(best);
      return { state: this.state, action: 'STALKING', signal: best };
    }

    return { state: this.state, action: 'DORMANT', signal: null };
  }

  // ─── STALKING: waiting for cascade confirmation ───────────────────────────

  _evalStalking(snapshots) {
    const snap = snapshots.find(s => s.symbol === this.stalkedSymbol);
    if (!snap) return { state: this.state, action: 'HOLD', signal: null };

    // Timeout — if no cascade in 15min, back to dormant
    if (this._timeInState() > 15 * 60 * 1000) {
      console.log(`[LCE] ⏱  Stalking timeout — returning to DORMANT`);
      this._transition(STATES.DORMANT);
      return { state: this.state, action: 'TIMEOUT', signal: null };
    }

    const confirmed = this._cascadeConfirmed(snap);

    if (confirmed) {
      console.log(`[LCE] 🎯 CASCADE CONFIRMED: ${snap.symbol} — entering trade`);
      this._transition(STATES.TRIGGERED);
      return {
        state: this.state,
        action: 'ENTER',
        signal: snap,
        side: this.stalkedSide,
        symbol: this.stalkedSymbol,
      };
    }

    return { state: this.state, action: 'STALKING', signal: snap };
  }

  // ─── TRIGGERED: trade entered, hand off to exchange connector ────────────

  _evalTriggered(snapshots) {
    // Immediately transition to RIDING once position is set externally
    if (this.activePosition) {
      this._transition(STATES.RIDING);
      return { state: this.state, action: 'RIDING', signal: null };
    }
    // Safety: if no position set within 2 cycles, abort
    if (this._timeInState() > 12 * 60 * 1000) {
      this._transition(STATES.DORMANT);
      return { state: this.state, action: 'ABORT', signal: null };
    }
    return { state: this.state, action: 'AWAITING_FILL', signal: null };
  }

  // ─── RIDING: in trade, manage stop/target ────────────────────────────────

  _evalRiding(snapshots) {
    if (!this.activePosition) {
      this._transition(STATES.DORMANT);
      return { state: this.state, action: 'NO_POSITION', signal: null };
    }

    const snap = snapshots.find(s => s.symbol === this.activePosition.symbol);
    const currentPrice = snap?.price?.price;

    if (!currentPrice) return { state: this.state, action: 'HOLD', signal: null };

    const { entryPrice, side, stopLoss, takeProfit } = this.activePosition;

    const pricePct = side === 'BUY'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;

    // Update trailing stop
    if (pricePct > 0.5) {
      const newStop = side === 'BUY'
        ? currentPrice * (1 - config.risk.trailingStopPct / 100)
        : currentPrice * (1 + config.risk.trailingStopPct / 100);

      if (side === 'BUY' && newStop > this.activePosition.stopLoss) {
        this.activePosition.stopLoss = newStop;
      } else if (side === 'SELL' && newStop < this.activePosition.stopLoss) {
        this.activePosition.stopLoss = newStop;
      }
    }

    // Check stop loss
    const stopHit = side === 'BUY'
      ? currentPrice <= this.activePosition.stopLoss
      : currentPrice >= this.activePosition.stopLoss;

    // Check take profit
    const tpHit = side === 'BUY'
      ? currentPrice >= takeProfit
      : currentPrice <= takeProfit;

    // Max trade window
    const timeOut = this._timeInState() > config.engine.tradeWindowMs;

    if (stopHit || tpHit || timeOut) {
      const reason = stopHit ? 'STOP_LOSS' : tpHit ? 'TAKE_PROFIT' : 'TIMEOUT';
      console.log(`[LCE] 🚪 Exiting position: ${reason} @ ${currentPrice}`);
      this.dailyPnlPct += pricePct;
      this.dailyTrades++;
      this._transition(STATES.EXITING);
      return {
        state: this.state,
        action: 'EXIT',
        reason,
        symbol: this.activePosition.symbol,
        side: side === 'BUY' ? 'SELL' : 'BUY',
        pnlPct: pricePct,
      };
    }

    return {
      state: this.state,
      action: 'HOLD',
      signal: null,
      pnlPct: pricePct,
      stopLoss: this.activePosition.stopLoss,
    };
  }

  // ─── EXITING: close position, cooldown 2 cycles then back to DORMANT ─────

  _evalExiting(snapshots) {
    this.activePosition = null;
    if (this._timeInState() > 10 * 60 * 1000) { // 10min cooldown
      this._transition(STATES.DORMANT);
    }
    return { state: this.state, action: 'COOLING_DOWN', signal: null };
  }

  // ─── Signal helpers ───────────────────────────────────────────────────────

  _findBestSignal(snapshots, minLiqUsd) {
    return snapshots
      .filter(s => s.liq5m?.totalLiqUsd >= minLiqUsd)
      .sort((a, b) => b.liq5m.totalLiqUsd - a.liq5m.totalLiqUsd)[0] || null;
  }

  _cascadeConfirmed(snap) {
    const { signals } = config;
    const liq15m = snap.liq15m?.totalLiqUsd || 0;
    const oiDrop = snap.oi?.dropPct || 0;
    const rsi = snap.price?.rsi || 50;
    const momentum = Math.abs(snap.price?.momentumPct || 0);

    return (
      liq15m >= signals.minLiqUsd15m &&
      oiDrop >= signals.minOiDropPct &&
      momentum >= signals.minMomentumPct &&
      rsi >= signals.rsiMin &&
      rsi <= signals.rsiMax
    );
  }

  // When longs get liquidated → price drops → we SHORT the continuation
  // When shorts get liquidated → price pumps → we LONG the continuation
  _tradeSide(snap) {
    return snap.liq5m?.dominantSide === 'LONG' ? 'SELL' : 'BUY';
  }

  // ─── Position management (called by exchange connector) ──────────────────

  setPosition(position) {
    this.activePosition = position;
  }

  clearPosition() {
    this.activePosition = null;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  _transition(newState) {
    console.log(`[LCE] 🔄 ${this.state} → ${newState}`);
    this.state = newState;
    this.stateEnteredAt = Date.now();
  }

  _timeInState() {
    return Date.now() - this.stateEnteredAt;
  }

  _checkDailyReset() {
    if (Date.now() > this.dailyResetAt + 86_400_000) {
      this.dailyPnlPct = 0;
      this.dailyTrades = 0;
      this.dailyResetAt = this._todayMidnight();
    }
  }

  _todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  getStatus() {
    return {
      state: this.state,
      timeInStateMs: this._timeInState(),
      activePosition: this.activePosition,
      dailyPnlPct: this.dailyPnlPct,
      dailyTrades: this.dailyTrades,
    };
  }
}

module.exports = { Strategy, STATES };

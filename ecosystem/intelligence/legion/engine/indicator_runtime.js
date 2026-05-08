// ~/legion/engine/indicator_runtime.js
// Pre‑computes indicators from a candle buffer and evaluates condition objects.

function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a,b) => a + b, 0) / period;
}

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let emaVal = sma(values.slice(0, period), period);
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function bollingerUpper(values, period = 20, stdDev = 2) {
  const mean = sma(values, period);
  if (mean === null) return null;
  const slice = values.slice(-period);
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const sd = Math.sqrt(variance);
  return mean + sd * stdDev;
}

function bollingerLower(values, period = 20, stdDev = 2) {
  const mean = sma(values, period);
  if (mean === null) return null;
  const slice = values.slice(-period);
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const sd = Math.sqrt(variance);
  return mean - sd * stdDev;
}

function computeAllIndicators(candles) {
  // candles: array of { close, volume, high, low, timestamp }
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const latest = candles[candles.length - 1];
  if (!latest) return null;

  return {
    rsi_14: rsi(closes, 14),
    sma_20: sma(closes, 20),
    ema_12: ema(closes, 12),
    ema_26: ema(closes, 26),
    volume_avg_20: sma(volumes, 20),
    bollinger_upper_20: bollingerUpper(closes, 20, 2),
    bollinger_lower_20: bollingerLower(closes, 20, 2),
    price: latest.close,
    volume: latest.volume
  };
}

function evaluateCondition(indicatorValues, condition) {
  const { indicator, operator, value, multiplier, lookback, percent, max_hours, required_regime } = condition;
  switch (indicator) {
    case 'rsi':
      const rsiVal = indicatorValues.rsi_14;
      if (rsiVal === null) return false;
      return compare(rsiVal, operator, value);
    case 'sma':
      const smaVal = indicatorValues.sma_20;
      if (smaVal === null) return false;
      return compare(smaVal, operator, value);
    case 'ema':
      const emaVal = indicatorValues.ema_12;
      if (emaVal === null) return false;
      return compare(emaVal, operator, value);
    case 'volume':
      const volAvg = indicatorValues.volume_avg_20;
      if (volAvg === null) return false;
      const currentVol = indicatorValues.volume;
      return currentVol > volAvg * (multiplier || 1);
    case 'bollinger':
      const upper = indicatorValues.bollinger_upper_20;
      const lower = indicatorValues.bollinger_lower_20;
      if (upper === null || lower === null) return false;
      if (operator === 'above_upper') return indicatorValues.price > upper;
      if (operator === 'below_lower') return indicatorValues.price < lower;
      return false;
    case 'trailing_stop':
      // Requires trade state – handled by monitor, not here
      return false;
    case 'time_in_trade':
      // Requires trade state
      return false;
    case 'drawdown_from_entry':
      return false;
    case 'regime_check':
      return true; // Placeholder – real regime check later
    default:
      return false;
  }
}

function compare(a, operator, b) {
  switch (operator) {
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
    case '==': return a === b;
    default: return false;
  }
}

function evaluateConditionGroup(group, indicatorValues, tradeState = null) {
  if (!group) return true;
  const allOk = !group.all || group.all.every(c => evaluateCondition(indicatorValues, c));
  const anyOk = !group.any || group.any.some(c => evaluateCondition(indicatorValues, c));
  return allOk && anyOk;
}

module.exports = { computeAllIndicators, evaluateConditionGroup };

// Minimal rolling candle buffer – replace with your Pharaoh extract later
class CandleBuffer {
  constructor(maxLength = 200) {
    this.maxLength = maxLength;
    this.buffers = new Map(); // asset -> array of candles { timestamp, open, high, low, close, volume }
  }

  add(asset, candle) {
    if (!this.buffers.has(asset)) {
      this.buffers.set(asset, []);
    }
    const buf = this.buffers.get(asset);
    // avoid duplicates by timestamp
    const last = buf[buf.length - 1];
    if (last && last.timestamp === candle.timestamp) {
      // replace last (update)
      buf[buf.length - 1] = candle;
    } else {
      buf.push(candle);
      if (buf.length > this.maxLength) buf.shift();
    }
  }

  get(asset, count = 50) {
    const buf = this.buffers.get(asset) || [];
    return buf.slice(-count);
  }

  latest(asset) {
    const buf = this.buffers.get(asset) || [];
    return buf[buf.length - 1] || null;
  }
}

module.exports = { CandleBuffer };

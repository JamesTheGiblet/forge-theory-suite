f = open('src/cce-grid-engine.js', 'r')
c = f.read()
f.close()

# Replace the _getBTCPrice method to use direct Kraken API instead of exchange connector
old = """  async _getBTCPrice() {
    try {
      if (this.dryRun) {
        // Fetch real price even in dry run for realistic simulation
        const ticker = await this.exchange.fetchTicker('BTC/USDC');
        return ticker?.last || ticker?.close || null;
      }
      const ticker = await this.exchange.fetchTicker('BTC/USDC');
      return ticker?.last || null;
    } catch (err) {
      console.error('[GRID] ❌ Price fetch error:', err.message);
      return null;
    }
  }"""

new = """  async _getBTCPrice() {
    return new Promise((resolve) => {
      const https = require('https');
      const url = 'https://api.kraken.com/0/public/Ticker?pair=BTCUSDC';
      const req = https.get(url, { headers: { 'User-Agent': 'CCE-Grid/1.0' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const d = JSON.parse(body);
            const pair = Object.values(d.result || {})[0];
            const price = pair ? parseFloat(pair.c[0]) : null;
            resolve(price);
          } catch (e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    });
  }"""

c = c.replace(old, new)
f = open('src/cce-grid-engine.js', 'w')
f.write(c)
f.close()
print('done')

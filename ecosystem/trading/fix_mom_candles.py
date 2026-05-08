f = open('src/cce-mom-engine.js', 'r')
c = f.read()
f.close()

# Fix 1: Remove 'since' from fetchOHLCV — let CCXT return default candles
c = c.replace(
    "      const ohlcv = await this.exchange.fetchOHLCV(pair, '2h', since);",
    "      const ohlcv = await this.exchange.fetchOHLCV(pair, '60', undefined, 200);"
)

# Fix 2: Use interval=60 (1H) in fallback — 120 is not valid on Kraken
c = c.replace(
    "          const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=120`;",
    "          const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=60`;"
)

# Fix 3: Update log message
c = c.replace(
    "console.log(`[MOM] ⏱️  Interval: 120min (2H)`);",
    "console.log(`[MOM] ⏱️  Interval: 60min (1H candles)`);",
)

f = open('src/cce-mom-engine.js', 'w')
f.write(c)
f.close()
print('done')

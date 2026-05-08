f = open('src/cce-engine.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "      console.log(`💰 BTC Price: $${marketData.btc_price?.toFixed(2) || 'N/A'}`);",
    "      console.log(`💰 BTC Price: $${marketData.btc_price?.toFixed(2) || 'N/A'}`);\n      this.lastBtcPrice  = marketData.btc_price || 0;\n      this.lastDominance = marketData.btc_dominance || 0;"
)

f = open('src/cce-engine.js', 'w')
f.write(c)
f.close()
print('done')

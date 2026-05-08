f = open('src/rme-data-feed.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "    try {\n      const [reitData, treasuryData, fedRateData] = await Promise.all([\n        this._fetchREIT(),\n        this._fetchTreasuryYield(),\n        this._fetchFedFundsRate()\n      ]);",
  "    try {\n      // Sequential fetches to avoid Alpha Vantage rate limiting (5 req/min free tier)\n      const reitData     = await this._fetchREIT();\n      await this._delay(15000);\n      const treasuryData = await this._fetchTreasuryYield();\n      await this._delay(15000);\n      const fedRateData  = await this._fetchFedFundsRate();"
)
# Add delay helper before module.exports
c = c.replace(
  "module.exports = RMEDataFeed;",
  "  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n}\n\nmodule.exports = RMEDataFeed;"
)
# Fix the double closing brace
c = c.replace(
  "  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n}\n\nmodule.exports = RMEDataFeed;\n}",
  "  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n}\n\nmodule.exports = RMEDataFeed;"
)
f = open('src/rme-data-feed.js', 'w')
f.write(c)
f.close()
print('done')

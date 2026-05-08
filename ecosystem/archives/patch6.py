f = open('src/rme-data-feed.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "function=TIME_SERIES_DAILY_ADJUSTED&symbol=",
  "function=TIME_SERIES_DAILY&symbol="
)
c = c.replace(
  "result.indicators?.quote?.[0]?.close",
  "result.indicators?.quote?.[0]?.close"
)
# Fix the parse key - TIME_SERIES_DAILY uses different key
c = c.replace(
  "const series = raw['Time Series (Daily)'];",
  "const series = raw['Time Series (Daily)'];"
)
c = c.replace(
  "v['5. adjusted close']",
  "v['4. close']"
)
f = open('src/rme-data-feed.js', 'w')
f.write(c)
f.close()
print('done')

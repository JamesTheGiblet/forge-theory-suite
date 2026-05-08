f = open('src/rme-data-feed.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "  }\n}\n\n  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n}\n\nmodule.exports = RMEDataFeed;",
  "  }\n\n  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n}\n\nmodule.exports = RMEDataFeed;"
)
f = open('src/rme-data-feed.js', 'w')
f.write(c)
f.close()
print('done')

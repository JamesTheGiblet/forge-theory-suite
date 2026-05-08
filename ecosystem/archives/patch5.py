f = open('config.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "forex: forexConfig,   // ← ADD THIS",
  "forex: forexConfig,   // ← ADD THIS\n  rme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'VNQ',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },"
)
f = open('config.js', 'w')
f.write(c)
f.close()
print('done')

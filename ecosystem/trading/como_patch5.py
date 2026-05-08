f = open('config.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "cme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'SPY',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },",
  "cme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'SPY',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },\n  como: {\n    enabled: true,\n    dryRun: true,\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },"
)
f = open('config.js', 'w')
f.write(c)
f.close()
print('done')

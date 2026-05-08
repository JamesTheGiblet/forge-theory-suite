f = open('config.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "rme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'O',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },",
  "rme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'O',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },\n  cme: {\n    enabled: true,\n    dryRun: true,\n    symbol: 'SPY',\n    startingCapital: 300,\n    intervalHours: 24,\n    fsm: {}\n  },"
)
f = open('config.js', 'w')
f.write(c)
f.close()
print('done')

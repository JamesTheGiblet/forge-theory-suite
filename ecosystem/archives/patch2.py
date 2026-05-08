f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const forexEngine    = forexEnabled ? new CCEForexEngine(config, sharedNotifier) : null;",
  "const forexEngine    = forexEnabled ? new CCEForexEngine(config, sharedNotifier) : null;\n  const rmeEnabled     = config.rme?.enabled !== false;\n  const rmeEngine      = rmeEnabled ? new CCERMEEngine(config, sharedNotifier) : null;"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

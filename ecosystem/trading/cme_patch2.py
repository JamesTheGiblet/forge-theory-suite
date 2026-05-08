f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const rmeEngine      = rmeEnabled ? new CCERMEEngine(config, sharedNotifier) : null;",
  "const rmeEngine      = rmeEnabled ? new CCERMEEngine(config, sharedNotifier) : null;\n  const cmeEnabled     = config.cme?.enabled !== false;\n  const cmeEngine      = cmeEnabled ? new CCECMEEngine(config, sharedNotifier) : null;"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

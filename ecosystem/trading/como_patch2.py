f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const cmeEngine      = cmeEnabled ? new CCECMEEngine(config, sharedNotifier) : null;",
  "const cmeEngine      = cmeEnabled ? new CCECMEEngine(config, sharedNotifier) : null;\n  const comoEnabled    = config.como?.enabled !== false;\n  const comoEngine     = comoEnabled ? new CCECOMOEngine(config, sharedNotifier) : null;"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

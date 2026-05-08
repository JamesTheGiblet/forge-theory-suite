f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const forexInterval  = config.forex?.intervalHours || 1;",
  "const forexInterval  = config.forex?.intervalHours || 1;\n  const rmeInterval    = config.rme?.intervalHours || 24;"
)
c = c.replace(
  "if (forexEngine) engines.push(forexEngine.start(forexInterval));",
  "if (forexEngine) engines.push(forexEngine.start(forexInterval));\n  if (rmeEngine) engines.push(rmeEngine.start(rmeInterval));"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

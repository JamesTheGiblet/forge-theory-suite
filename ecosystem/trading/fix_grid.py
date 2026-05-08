f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchangeConnector) : null;",
  "const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchange) : null;"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

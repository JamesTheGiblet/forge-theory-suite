f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const CCEForexEngine = require('./src/cce-forex-engine');",
  "const CCEForexEngine = require('./src/cce-forex-engine');\nconst CCERMEEngine   = require('./src/cce-rme-engine');"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

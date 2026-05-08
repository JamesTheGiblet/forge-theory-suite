f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const CCERMEEngine   = require('./src/cce-rme-engine');",
  "const CCERMEEngine   = require('./src/cce-rme-engine');\nconst CCECMEEngine   = require('./src/cce-cme-engine');"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

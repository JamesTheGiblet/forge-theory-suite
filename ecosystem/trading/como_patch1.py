f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "const CCECMEEngine   = require('./src/cce-cme-engine');",
  "const CCECMEEngine   = require('./src/cce-cme-engine');\nconst CCECOMOEngine  = require('./src/cce-como-engine');"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

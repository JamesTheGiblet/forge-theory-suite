f = open('index.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "const CCEBRKEngine   = require('./src/cce-brk-engine');",
    "const CCEBRKEngine   = require('./src/cce-brk-engine');\nconst CCEEGPEngine   = require('./src/cce-egp-engine');\nconst DXYLayer       = require('./src/dxy-layer');"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

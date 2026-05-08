f = open('index.js', 'r')
c = f.read()
f.close()

c = c.replace(
    "const DXYLayer       = require('./src/dxy-layer');",
    "const DXYLayer       = require('./src/dxy-layer');\nconst CCEEGPEngine   = require('./src/cce-egp-engine');"
)

f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

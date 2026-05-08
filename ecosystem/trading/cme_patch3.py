f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "if (rmeEngine) rmeEngine.stop();",
  "if (rmeEngine) rmeEngine.stop();\n    if (cmeEngine) cmeEngine.stop();"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

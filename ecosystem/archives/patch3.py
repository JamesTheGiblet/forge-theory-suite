f = open('index.js', 'r')
c = f.read()
f.close()
c = c.replace(
  "if (forexEngine) forexEngine.stop();",
  "if (forexEngine) forexEngine.stop();\n    if (rmeEngine) rmeEngine.stop();"
)
f = open('index.js', 'w')
f.write(c)
f.close()
print('done')

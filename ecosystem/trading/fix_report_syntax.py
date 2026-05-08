f = open('scripts/generate-report.js', 'r')
c = f.read()
f.close()

# Fix corrupted newlines in join statements
import re
# Replace ].join('\n') where the \n is a literal newline
c = re.sub(r"\]\.join\('\n'\)", "].join('\\n')", c)
c = re.sub(r'\]\.join\("\n"\)', '].join("\\n")', c)

f = open('scripts/generate-report.js', 'w')
f.write(c)
f.close()
print('done')

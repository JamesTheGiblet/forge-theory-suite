f = open('scripts/generate-report.js', 'r')
c = f.read()
f.close()

# Find the new sections block and move it after grid section
# The issue is the new sections were inserted before the existing sections
# We need to find where they are and move them to after section 5

# Extract the new sections
import re
new_sections_match = re.search(
    r"(  // MOM section.*?  // EGP section.*?  lines\.push\(''\);)",
    c, re.DOTALL
)

if new_sections_match:
    new_sections = new_sections_match.group(1)
    # Remove from current position
    c = c.replace(new_sections, '')
    # Insert after grid section (before platform summary)
    c = c.replace(
        "  lines.push('PLATFORM SUMMARY');",
        new_sections + "\n  lines.push('PLATFORM SUMMARY');"
    )
    print('sections reordered')
else:
    print('pattern not found - manual fix needed')

f = open('scripts/generate-report.js', 'w')
f.write(c)
f.close()

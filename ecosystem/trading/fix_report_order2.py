f = open('scripts/generate-report.js', 'r')
c = f.read()
f.close()

import re

# Extract all three new sections
egp = re.search(r'(  // EGP section.*?)(?=  lines\.push\(\'\')', c, re.DOTALL)
mom = re.search(r'(  // MOM section.*?)(?=  // BRK section)', c, re.DOTALL)
brk = re.search(r'(  // BRK section.*?)(?=  // EGP section)', c, re.DOTALL)

if egp and mom and brk:
    egp_block = egp.group(1)
    mom_block = mom.group(1)
    brk_block = brk.group(1)

    # Remove all three from current positions
    c = c.replace(egp_block, '')
    c = c.replace(mom_block, '')
    c = c.replace(brk_block, '')

    # Insert all three before platform summary in correct order
    c = c.replace(
        "  lines.push('PLATFORM SUMMARY');",
        mom_block + brk_block + egp_block + "\n  lines.push('PLATFORM SUMMARY');"
    )
    print('reordered: MOM → BRK → EGP → SUMMARY')
else:
    print('pattern not found:', bool(egp), bool(mom), bool(brk))

f = open('scripts/generate-report.js', 'w')
f.write(c)
f.close()

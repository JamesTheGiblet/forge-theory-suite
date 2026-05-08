f = open('scripts/generate-report.js', 'r')
lines = f.readlines()
f.close()

# Find EGP block start (line 282 area - 0-indexed = 281)
# Find where it ends and where to move it to (after BRK section)
content = ''.join(lines)

# Find the misplaced EGP block at the top
import re

# Extract the early EGP block (before CCE CRYPTO)
early_egp = re.search(
    r"(  lines\.push\('8\. S\.E EGP.*?)(?=  lines\.push\('1\. CCE CRYPTO)",
    content, re.DOTALL
)

# Find the EGP section comment near end (line 495)
late_egp_comment = "  // EGP section\n"

if early_egp:
    egp_block = early_egp.group(1)
    # Remove from early position
    content = content.replace(egp_block, '', 1)
    # Replace the late comment with the full block
    content = content.replace(
        late_egp_comment,
        egp_block
    )
    print('EGP block moved to correct position')
else:
    print('early EGP block not found')

f = open('scripts/generate-report.js', 'w')
f.write(content)
f.close()

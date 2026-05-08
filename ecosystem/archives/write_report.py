import os

target = '/data/data/com.termux/files/home/cce-crypto/scripts/generate-report.js'

# Check if file starts with null bytes
with open(target, 'rb') as f:
    first = f.read(10)
    
print('First bytes:', first)
print('Null bytes at start:', first[0] == 0)

# Find where real content starts
with open(target, 'rb') as f:
    content = f.read()

# Strip leading null bytes
stripped = content.lstrip(b'\x00')
print('Original size:', len(content))
print('Stripped size:', len(stripped))

# Write back without nulls
with open(target, 'wb') as f:
    f.write(stripped)
    
print('Fixed!')

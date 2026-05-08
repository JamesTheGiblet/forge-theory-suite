import re

# Patch config.js to read from modes.js
with open('/data/data/com.termux/files/home/cce-crypto/config.js', 'r') as f:
    config_src = f.read()

# Add modes require at top if not already there
if 'modes' not in config_src:
    config_src = "'use strict';\n\nconst modes = require('./modes');\n\n" + config_src.lstrip("'use strict';\n")
    print('Added modes require to config.js')

# Replace CCE_DRY_RUN env var reading with modes.js
old_dry = "  dryRun:           process.env.CCE_DRY_RUN !== 'false',"
new_dry = "  dryRun:           modes.isDryRun('se-crypto'),"
if old_dry in config_src:
    config_src = config_src.replace(old_dry, new_dry, 1)
    print('Wired se-crypto dryRun to modes.js')
else:
    print('se-crypto dryRun NOT FOUND - check manually')

# Replace grid dryRun
old_grid = "    dryRun:       true,    // Registry requires true default; CCE_DRY_RUN=false flips live"
new_grid = "    dryRun:       true,    // Registry default — modes.js controls actual live/dry"
if old_grid in config_src:
    config_src = config_src.replace(old_grid, new_grid, 1)
    print('Grid comment updated')

with open('/data/data/com.termux/files/home/cce-crypto/config.js', 'w') as f:
    f.write(config_src)

# Patch grid engine to read from modes.js
with open('/data/data/com.termux/files/home/cce-crypto/engines/te-grid/engine.js', 'r') as f:
    grid_src = f.read()

old_grid_start = "    // Flip to live if CCE_DRY_RUN=false — registry validates constructor (dryRun:true), this runs after\n    if (process.env.CCE_DRY_RUN === 'false') this.dryRun = false;"
new_grid_start = "    // Read from modes.js — registry validates constructor (dryRun:true), this runs after\n    const modes = require('../../modes');\n    if (!modes.isDryRun('te-grid')) this.dryRun = false;"

if old_grid_start in grid_src:
    grid_src = grid_src.replace(old_grid_start, new_grid_start, 1)
    print('Grid engine wired to modes.js')
else:
    print('Grid engine start NOT FOUND')

with open('/data/data/com.termux/files/home/cce-crypto/engines/te-grid/engine.js', 'w') as f:
    f.write(grid_src)

# Patch index.js to remove CCE_DRY_RUN env dependency
with open('/data/data/com.termux/files/home/cce-crypto/index.js', 'r') as f:
    index_src = f.read()

if 'modes' not in index_src:
    index_src = "'use strict';\n\nconst modes = require('./modes');\n" + index_src.lstrip("'use strict';\n")
    print('Added modes require to index.js')

with open('/data/data/com.termux/files/home/cce-crypto/index.js', 'w') as f:
    f.write(index_src)

print('All patches done')

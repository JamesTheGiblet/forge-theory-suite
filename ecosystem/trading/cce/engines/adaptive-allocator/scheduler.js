cat > scheduler.sh << 'EOF'
#!/bin/bash
# Run every hour to check market and update allocator

cd ~/cce/engines/adaptive-allocator
node cli.js run >> allocator.log 2>&1

# Also update dry run days at midnight
HOUR=$(date +%H)
if [ "$HOUR" = "00" ]; then
  node -e "const a = require('./allocator'); new a().updateDryRunDays();" >> allocator.log 2>&1
fi
EOF

chmod +x scheduler.sh

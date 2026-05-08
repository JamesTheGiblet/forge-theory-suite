#!/bin/bash
# View README.scp.json in human-readable format

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK20 — README                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📖 TITLE: $(cat README.scp.json | jq -r '.title')"
echo "📝 SUBTITLE: $(cat README.scp.json | jq -r '.subtitle')"
echo "🏷️  VERSION: $(cat README.scp.json | jq -r '.version')"
echo "✍️  AUTHOR: $(cat README.scp.json | jq -r '.author')"
echo "🎯 MOTTO: $(cat README.scp.json | jq -r '.motto')"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 QUICK START"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat README.scp.json | jq -r '.documentation.quick_start[]'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 AGENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat README.scp.json | jq -r '.documentation.architecture.agents[]'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 API ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat README.scp.json | jq -r '.documentation.api_endpoints.endpoints[]'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 FUN FACTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat README.scp.json | jq -r '.fun_facts[]'
echo ""

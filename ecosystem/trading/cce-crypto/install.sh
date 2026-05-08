#!/bin/bash

echo "========================================"
echo "   CCE Universal Installer"
echo "========================================"

# 1. Detect Android (Termux)
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    echo "📱 Environment: Android (Termux)"
    bash installs/deploy-pocket.sh
    exit $?
fi

# 2. Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Windows;;
    MINGW*)     machine=Windows;;
    MSYS*)      machine=Windows;;
    *)          machine="UNKNOWN:${OS}"
esac

if [ "$machine" == "Linux" ]; then
    echo "🍓 Environment: Linux (Raspberry Pi / Debian)"
    bash installs/deploy-pi.sh
elif [ "$machine" == "Windows" ]; then
    echo "🪟 Environment: Windows (Git Bash)"
    powershell.exe -ExecutionPolicy Bypass -File "installs/deploy-windows.ps1"
elif [ "$machine" == "Mac" ]; then
    echo "🍎 Environment: macOS"
    echo "   ⚠️  Note: No specific script for Mac yet. Running generic install..."
    npm install
else
    echo "❌ Unsupported OS: $machine"
    exit 1
fi
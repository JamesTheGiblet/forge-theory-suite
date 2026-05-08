Write-Host "🚀 Starting CCE Windows Setup..." -ForegroundColor Cyan

# Ensure we are in the project root (if script is run from installs/)
if (Split-Path -Leaf $PSScriptRoot -eq "installs") {
    Set-Location (Split-Path -Parent $PSScriptRoot)
    Write-Host "📂 Changed working directory to project root: $(Get-Location)" -ForegroundColor Gray
}

# 1. Check Node.js
try {
    $nodeVer = node --version
    Write-Host "✅ Node.js detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Error "❌ Node.js not found. Please install Node.js v20+ from https://nodejs.org/"
    exit 1
}

# 2. Install Dependencies (Node & Python)
Write-Host "📦 Installing Node dependencies..." -ForegroundColor Yellow

# Create data/logs directories
if (-not (Test-Path "data")) { New-Item -ItemType Directory -Force -Path "data" | Out-Null }
if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Force -Path "logs" | Out-Null }

npm install

try {
    $pyVer = python --version
    Write-Host "✅ Python detected: $pyVer" -ForegroundColor Green
    Write-Host "📦 Installing Python requirements..." -ForegroundColor Yellow
    pip install pandas numpy yfinance python-dotenv
} catch {
    Write-Warning "⚠️ Python not found or pip failed. Ensure Python is installed."
}

Write-Host "📦 Installing PM2 (Process Manager)..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup

# 3. Setup Environment
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Please edit .env with your API keys." -ForegroundColor White
}

# 4. Start Processes
Write-Host "🚀 Starting Processes..." -ForegroundColor Cyan

# Clean up existing processes to prevent errors
pm2 delete cce-bot 2>$null
pm2 delete cce-dashboard 2>$null
pm2 delete cce-forex 2>$null

Write-Host "   Starting CCE Forex Engine (Hourly Cron)..." -ForegroundColor Cyan
pm2 start cce_forex.py --name cce-forex --interpreter python --cron "0 * * * *" --no-autorestart
pm2 save

# Setup Auto-Startup
Write-Host "🔌 Setting up Auto-Startup..." -ForegroundColor Yellow
pm2-startup install

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "   Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "   To view logs: pm2 logs" -ForegroundColor Gray
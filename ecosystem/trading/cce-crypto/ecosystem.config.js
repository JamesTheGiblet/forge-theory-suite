// ecosystem.config.js
// PM2 Process Manager Configuration
// Usage:
//   Dry run:    pm2 start ecosystem.config.js
//   Live trade: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'cce-bot',
      script: './index.js',
      watch: false,

      // Restart behaviour
      max_restarts: 5,          // Stop restarting after 5 consecutive crashes
      min_uptime: '30s',        // Must stay up 30s to count as a successful start
      restart_delay: 5000,      // Wait 5s between restart attempts

      // Graceful shutdown — align with engine.stop() 5s timeout in index.js
      kill_timeout: 8000,       // Give shutdown 8s before SIGKILL

      // Memory guard — restart if process exceeds 512MB
      max_memory_restart: '512M',

      // Logging
      out_file: './logs/cce-bot-out.log',
      error_file: './logs/cce-bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: false,

      // Environment — defaults to dry run for safety
      env: {
        NODE_ENV: 'production',
        CCE_DRY_RUN: 'true'
      },

      // Live trading — activate with: pm2 start ecosystem.config.js --env production
      env_production: {
        NODE_ENV: 'production',
        CCE_DRY_RUN: 'false'
        // Secrets must be set externally via .env or system environment:
        // KRAKEN_API_KEY, KRAKEN_API_SECRET, TELEGRAM_BOT_TOKEN,
        // TELEGRAM_CHAT_ID, DASHBOARD_STOP_TOKEN
      }
    },

    {
      name: 'cce-dashboard',
      script: './dashboard-server.js',
      watch: false,

      // Dashboard is non-critical — allow more restarts
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,

      kill_timeout: 5000,
      max_memory_restart: '256M',

      // Logging
      out_file: './logs/cce-dashboard-out.log',
      error_file: './logs/cce-dashboard-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: false,

      env: {
        NODE_ENV: 'production'
        // DASHBOARD_STOP_TOKEN must be set externally via .env or system environment
      }
    }
  ]
};
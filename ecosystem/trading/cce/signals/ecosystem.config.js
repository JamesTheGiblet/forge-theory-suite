// PM2 Ecosystem Config — CCE Capitulation Signal Monitor
// Usage: pm2 start ecosystem.config.js
//        pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name:        'cce-cap-signal',
      script:      './cap-signal-monitor.js',
      interpreter: 'node',

      // Restart policy
      autorestart:    true,
      watch:          false,
      max_restarts:   10,
      restart_delay:  5000,   // 5s between restarts

      // Memory guard — should stay well under 50MB
      max_memory_restart: '100M',

      // Logging
      out_file:   `${process.env.HOME}/cce/signals/pm2-out.log`,
      error_file: `${process.env.HOME}/cce/signals/pm2-err.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

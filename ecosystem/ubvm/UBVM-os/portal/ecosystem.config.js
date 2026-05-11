module.exports = {
  apps: [
    {
      name: 'ubvm-portal',
      script: 'server.js',
      cwd: '/root/ubvm/portal',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3020,
        JAMES_PASSWORD: 'CHANGE_ME_JAMES',
        ABE_PASSWORD: 'CHANGE_ME_ABE',
        SESSION_SECRET: 'CHANGE_ME_SECRET_LONG_RANDOM_STRING',
        NODES_DIR: '/root/ubvm/nodes',
        QUEUE_DIR: '/root/ubvm/portal/queue',
        INCYBE_DIR: '/root/ubvm/nodes/incybe'
      },
      error_file: '/root/ubvm/portal/logs/error.log',
      out_file: '/root/ubvm/portal/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};

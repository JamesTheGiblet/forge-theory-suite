module.exports = {
  apps: [{
    name: 'cce-unreal',
    script: 'index-unreal.js',
    cwd: '/data/data/com.termux/files/home/cce-unreal',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    error_file: './logs/cce-unreal-error.log',
    out_file: './logs/cce-unreal-out.log',
    log_file: './logs/cce-unreal.log',
    time: true
  }]
}

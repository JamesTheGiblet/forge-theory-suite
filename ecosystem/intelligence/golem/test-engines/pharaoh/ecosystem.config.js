module.exports = {
  apps: [{
    name: 'pharaoh',
    script: './pharaoh.js',
    env_file: '.env',
    env: {
      NODE_ENV: 'production'
    }
  }]
}

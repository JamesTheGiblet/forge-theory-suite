// Centralized logging - only critical messages
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO'; // ERROR, WARN, INFO, DEBUG

function log(level, agent, message) {
  const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
  if (levels[level] <= levels[LOG_LEVEL]) {
    console.log(`[${agent}] ${message}`);
  }
}

function error(agent, message) { log('ERROR', agent, message); }
function warn(agent, message) { log('WARN', agent, message); }
function info(agent, message) { log('INFO', agent, message); }

module.exports = { log, error, warn, info };

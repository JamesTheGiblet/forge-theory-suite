// ~/legion/bus/router.js
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const crypto = require('crypto');

const MAILBOX_DIR = path.join(__dirname, 'mailbox');
const PROCESSED_DIR = path.join(__dirname, 'processed');
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Ensure directories exist
[MAILBOX_DIR, PROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Message handlers – agents register callbacks here
const handlers = new Map(); // type -> [callback]

function registerHandler(messageType, callback) {
  if (!handlers.has(messageType)) handlers.set(messageType, []);
  handlers.get(messageType).push(callback);
}

function processMessage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const msg = JSON.parse(content);
    
    // TTL check via watermark (Amendment 1 & 3)
    if (msg.timestamp && Date.now() - new Date(msg.timestamp).getTime() > TTL_MS) {
      console.log(`[ROUTER] Discarding stale message: ${filePath}`);
      fs.unlinkSync(filePath);
      return;
    }
    
    const typeHandlers = handlers.get(msg.type);
    if (typeHandlers) {
      typeHandlers.forEach(cb => cb(msg));
      console.log(`[ROUTER] Delivered ${msg.type} from ${msg.from} to ${typeHandlers.length} handler(s)`);
    } else {
      console.log(`[ROUTER] No handler for type: ${msg.type}`);
    }
    
    // Move to processed (optional – keep for audit)
    const dest = path.join(PROCESSED_DIR, path.basename(filePath));
    fs.renameSync(filePath, dest);
  } catch (err) {
    console.error(`[ROUTER] Error processing ${filePath}:`, err.message);
    // Move to error folder if needed
    const errorDir = path.join(__dirname, 'errors');
    if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir);
    fs.renameSync(filePath, path.join(errorDir, path.basename(filePath)));
  }
}

function purgeStaleMessages() {
  const files = fs.readdirSync(MAILBOX_DIR);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(MAILBOX_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const msg = JSON.parse(content);
      if (msg.timestamp && now - new Date(msg.timestamp).getTime() > TTL_MS) {
        console.log(`[ROUTER] Purged stale message: ${file}`);
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      // If can't parse, just delete after TTL based on file mtime
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > TTL_MS) {
        console.log(`[ROUTER] Purged unparseable stale message: ${file}`);
        fs.unlinkSync(filePath);
      }
    }
  }
}

// Native watcher with polling fallback (Amendment 3)
let pollingFallback = null;
let lastEventTime = Date.now();

function startRouter() {
  // Purge stale on startup
  purgeStaleMessages();
  setInterval(purgeStaleMessages, 60 * 1000);
  
  const watcher = chokidar.watch(MAILBOX_DIR, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
  });
  
  watcher.on('add', (filePath) => {
    lastEventTime = Date.now();
    processMessage(filePath);
  });
  
  watcher.on('change', (filePath) => {
    lastEventTime = Date.now();
    processMessage(filePath);
  });
  
  // Fallback: every 10s, if no FS events but files exist, switch to polling (Amendment 3)
  const fallbackInterval = setInterval(() => {
    const files = fs.readdirSync(MAILBOX_DIR);
    if (files.length > 0 && (Date.now() - lastEventTime > 10000)) {
      if (!pollingFallback) {
        console.log('[ROUTER] Fallback: switching to polling mode (500ms)');
        pollingFallback = setInterval(() => {
          const pollFiles = fs.readdirSync(MAILBOX_DIR);
          for (const f of pollFiles) {
            processMessage(path.join(MAILBOX_DIR, f));
          }
        }, 500);
      }
    } else if (files.length === 0 && pollingFallback) {
      console.log('[ROUTER] Returning to native FS events');
      clearInterval(pollingFallback);
      pollingFallback = null;
    }
  }, 10000);
  
  console.log('[ROUTER] Listening on', MAILBOX_DIR);
}

function sendMessage(to, type, payload) {
  const msg = {
    msg_id: crypto.randomBytes(8).toString('hex'),
    from: 'router',
    to,
    type,
    payload,
    timestamp: new Date().toISOString()
  };
  const filePath = path.join(MAILBOX_DIR, `${Date.now()}_${msg.msg_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(msg, null, 2));
  console.log(`[ROUTER] Sent ${type} to ${to}`);
  return msg.msg_id;
}

module.exports = { startRouter, registerHandler, sendMessage };

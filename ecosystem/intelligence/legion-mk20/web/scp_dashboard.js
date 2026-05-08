const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');

const app = express();
const DASHBOARD_PORT = 9000;
app.use(express.json());

// Load dashboard SCP definition
const dashboardSCP = JSON.parse(fs.readFileSync('./scp/dashboard.scp.json', 'utf8'));

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
console.log(`Gemini API Key: ${GEMINI_API_KEY ? 'present (length ' + GEMINI_API_KEY.length + ')' : 'MISSING'}`);
console.log(`Gemini Model: ${GEMINI_MODEL}`);

// Generate HTML from SCP definition (same as before, but for brevity we'll keep it simple)
function generateDashboardHTML() {
  // ... (same as before) ...
  // We'll use a minimal version to focus on chat
  return `<!DOCTYPE html>
<html>
<head><title>LEGION Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0a0e27; color:#fff; font-family: system-ui; padding:1rem;">
<h1>🔮 LEGION MK20 Dashboard</h1>
<div id="chat">
  <div id="messages" style="height:300px; overflow-y:auto; border:1px solid #333; padding:0.5rem;"></div>
  <input id="input" style="width:80%; padding:0.5rem;" placeholder="Ask me anything...">
  <button onclick="send()">Send</button>
</div>
<script>
  async function send() {
    const input = document.getElementById('input');
    const msg = input.value.trim();
    if(!msg) return;
    const messages = document.getElementById('messages');
    messages.innerHTML += '<div><b>You:</b> ' + msg + '</div>';
    input.value = '';
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: msg})
    });
    const data = await res.json();
    messages.innerHTML += '<div><b>Legion:</b> ' + data.response + '</div>';
    messages.scrollTop = messages.scrollHeight;
  }
</script>
</body>
</html>`;
}

app.get('/dashboard', (req, res) => {
  res.send(generateDashboardHTML());
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const context = await getSystemContext();
    const response = await callGemini(message, context);
    res.json({ response });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ response: `Error: ${err.message}` });
  }
});

async function getSystemContext() {
  try {
    const status = await proxyGet('/api/status');
    return { entropy: status.entropy, agents: status.agents };
  } catch(e) { return {}; }
}

function proxyGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3011${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function callGemini(message, context) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const systemPrompt = `You are Legion, assistant for LEGION trading system. Context: entropy ${context.entropy || '?'}, ${context.agents || '?'} agents. Answer concisely.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\nUser: ' + message }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
  };
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (resp) => {
      let raw = '';
      resp.on('data', chunk => raw += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(raw);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text);
          else reject(new Error('No text in response'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.listen(DASHBOARD_PORT, () => {
  console.log(`Dashboard running on port ${DASHBOARD_PORT}`);
});

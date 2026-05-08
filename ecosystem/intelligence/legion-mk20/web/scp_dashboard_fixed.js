const express = require('express');
const https = require('https');
const app = express();
const PORT = 9000;

app.use(express.json());

// Your Gemini API key
const GEMINI_API_KEY = "AIzaSyA681ZfzpSguklcXtJB8Kma8PRxZPR7XM8";
const GEMINI_MODEL = "gemini-3-flash-preview";

console.log(`Gemini API Key: ${GEMINI_API_KEY ? 'set' : 'missing'}`);

// Minimal HTML dashboard with chat
const html = `<!DOCTYPE html>
<html>
<head><title>LEGION AI Chat</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0a0e27; color:#fff; font-family: sans-serif; padding:1rem;">
<h1>🤖 Legion AI Assistant</h1>
<div id="chat" style="border:1px solid #333; border-radius:8px; padding:1rem; height:300px; overflow-y:auto;"></div>
<input id="input" style="width:80%; padding:0.5rem; margin-top:1rem;" placeholder="Ask me anything...">
<button onclick="send()">Send</button>
<script>
  const chatDiv = document.getElementById('chat');
  const input = document.getElementById('input');
  async function send() {
    const msg = input.value.trim();
    if (!msg) return;
    chatDiv.innerHTML += '<div><b>You:</b> ' + msg + '</div>';
    input.value = '';
    chatDiv.scrollTop = chatDiv.scrollHeight;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: msg})
    });
    const data = await res.json();
    chatDiv.innerHTML += '<div><b>Legion:</b> ' + data.response + '</div>';
    chatDiv.scrollTop = chatDiv.scrollHeight;
  }
  input.addEventListener('keypress', (e) => { if(e.key === 'Enter') send(); });
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(html));

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  try {
    const response = await callGemini(userMessage);
    res.json({ response });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.json({ response: `Sorry, I encountered an error: ${err.message}` });
  }
});

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text);
          else reject(new Error('No response from Gemini'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`✅ Gemini AI Chat running at http://localhost:${PORT}`);
});

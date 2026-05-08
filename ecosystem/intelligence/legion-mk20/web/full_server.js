const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();
const PORT = 9000;

app.use(express.json());

// Load Gemini's SCP definition
const geminiSCP = JSON.parse(fs.readFileSync('./scp/gemini_assistant.scp.json', 'utf8'));

// Gemini configuration
const GEMINI_API_KEY = "AIzaSyA681ZfzpSguklcXtJB8Kma8PRxZPR7XM8";
const GEMINI_MODEL = "gemini-3-flash-preview";

let systemContext = {};

function updateContext() {
  http.get('http://localhost:3011/api/status', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try { systemContext = { ...systemContext, ...JSON.parse(data) }; } catch(e) {}
    });
  }).on('error', () => {});
  
  http.get('http://localhost:3011/api/entropy', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try {
        const entropy = JSON.parse(data);
        systemContext.entropy_value = entropy.entropy;
        systemContext.entropy_status = entropy.status;
      } catch(e) {}
    });
  }).on('error', () => {});
  
  http.get('http://localhost:3011/api/agents', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try { systemContext.agents_list = JSON.parse(data); } catch(e) {}
    });
  }).on('error', () => {});
}

setInterval(updateContext, 10000);
updateContext();

// Build system prompt from SCP
function buildSystemPrompt() {
  const identity = geminiSCP.identity;
  const capabilities = geminiSCP.capabilities.map(c => `- ${c.name}: ${c.description}`).join('\n');
  const knowledge = geminiSCP.knowledge_base;
  const guidelines = geminiSCP.response_guidelines.join('\n');
  
  return `You are ${identity.name}, ${identity.role}. ${identity.personality}.

YOUR IDENTITY:
- Name: ${identity.name}
- Role: ${identity.role}
- Personality: ${identity.personality}
- Purpose: ${identity.purpose}

YOUR CAPABILITIES:
${capabilities}

YOUR KNOWLEDGE:
- System: ${knowledge.system_overview}
- Entropy: ${knowledge.entropy}
- Paper Mode: ${knowledge.paper_mode}
- Agents: ${knowledge.agents}
- Strategies: ${knowledge.strategies}
- Arbitrage: ${knowledge.arbitrage}
- Containment: ${knowledge.containment}

CURRENT SYSTEM CONTEXT:
- Entropy: ${systemContext.entropy_value || 0} / ${systemContext.threshold || 0.7} (${systemContext.entropy_status || 'NORMAL'})
- Agents running: ${systemContext.agents || Object.keys(systemContext.agents_list || {}).length || 'unknown'}
- Paper mode: ${systemContext.paper_mode || 'RUNNING'}
- SCP ID: ${systemContext.scp_id || 'LEGION-MK20-SCP'}

RESPONSE GUIDELINES:
${guidelines}

Now, answer the user's question naturally based on who you are and what you know.`;
}

app.get('/', (req, res) => {
  fs.readFile('./web/dashboard_full.html', 'utf8', (err, data) => {
    if (err) res.send('<h1>Dashboard loading...</h1>');
    else res.send(data);
  });
});

// API proxy endpoints (same as before)
app.get('/api/status', (req, res) => {
  http.get('http://localhost:3011/api/status', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => res.json(JSON.parse(data)));
  }).on('error', () => res.json({}));
});

app.get('/api/agents', (req, res) => {
  http.get('http://localhost:3011/api/agents', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => res.json(JSON.parse(data)));
  }).on('error', () => res.json([]));
});

app.get('/api/entropy', (req, res) => {
  http.get('http://localhost:3011/api/entropy', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => res.json(JSON.parse(data)));
  }).on('error', () => res.json({ entropy: 0, threshold: 0.7 }));
});

app.get('/api/arbitrage/prices', (req, res) => {
  http.get('http://localhost:3011/api/arbitrage/prices', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try { res.json(JSON.parse(data)); } catch(e) { res.json({ prices: {} }); }
    });
  }).on('error', () => res.json({ prices: {} }));
});

app.get('/api/reports', (req, res) => {
  http.get('http://localhost:3011/api/reports', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try { res.json(JSON.parse(data)); } catch(e) { res.json({ reports: [] }); }
    });
  }).on('error', () => res.json({ reports: [] }));
});

// Gemini chat endpoint with SCP-based system prompt
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  const systemPrompt = buildSystemPrompt();
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\nUser: ' + userMessage }] }
      ],
      generationConfig: { 
        temperature: geminiSCP.containment_procedures.temperature || 0.7, 
        maxOutputTokens: geminiSCP.containment_procedures.max_tokens || 800,
        topP: 0.9
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          try {
            const json = JSON.parse(data);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) resolve(text);
            else reject(new Error(json.error?.message || 'No response'));
          } catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
    res.json({ response });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.json({ response: `Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`✅ LEGION Full Dashboard running at http://localhost:${PORT}`);
  console.log(`   Gemini SCP loaded: ${geminiSCP.scp_id}`);
  console.log(`   Gemini knows its identity and capabilities`);
});

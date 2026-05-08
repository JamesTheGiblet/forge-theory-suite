const express = require('express');
const app = express();
const PORT = 9000;

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LEGION EV22</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { background: #0a0e27; color: #e2e8f0; font-family: system-ui; padding: 20px; }
        .card { background: #0f122e; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #1a1f4e; }
        h1 { color: #a78bfa; }
        .stat { font-size: 2rem; font-weight: bold; color: #a78bfa; }
        button { background: #4f46e5; border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer; }
        input { background: #1a1f4e; border: 1px solid #2a2f6e; padding: 10px; border-radius: 8px; color: white; width: 70%; }
        .chat-area { height: 300px; overflow-y: auto; border: 1px solid #1a1f4e; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .user-msg { background: #4f46e5; padding: 8px 12px; border-radius: 12px; margin: 8px 0; text-align: right; }
        .bot-msg { background: #1a1f4e; padding: 8px 12px; border-radius: 12px; margin: 8px 0; }
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { background: #0f122e; border: 1px solid #1a1f4e; border-radius: 12px; padding: 8px 16px; cursor: pointer; }
        .tab.active { background: #4f46e5; }
        .hidden { display: none; }
        .agent-item { background: #1a1f4e; border-radius: 8px; padding: 8px 12px; margin: 6px; display: inline-block; font-size: 13px; }
        .agent-class { font-size: 10px; color: #a78bfa; display: block; margin-top: 4px; }
    </style>
</head>
<body>
    <h1>⚡ LEGION EV22</h1>
    
    <div class="tabs">
        <div class="tab active" onclick="showTab('dashboard')">📊 Dashboard</div>
        <div class="tab" onclick="showTab('agents')">🤖 Agents</div>
    </div>

    <!-- DASHBOARD TAB -->
    <div id="dashboardTab">
        <div class="card">
            <div class="stat" id="entropyVal">--</div>
            <div>Entropy</div>
            <div style="margin-top: 10px;"><strong>Agents:</strong> <span id="agentCount">--</span></div>
            <div><strong>Mode:</strong> <span id="paperMode">--</span></div>
        </div>
        
        <div class="card">
            <h3>🤖 Legion Assistant</h3>
            <div class="chat-area" id="chatArea">
                <div class="bot-msg">Hello! Ask me about LEGION EV22.</div>
            </div>
            <input type="text" id="chatInput" placeholder="Ask me..." onkeypress="if(event.key==='Enter')sendMessage()">
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>

    <!-- AGENTS TAB -->
    <div id="agentsTab" class="hidden">
        <div class="card">
            <h3>🤖 Active Agents (31 total)</h3>
            <div id="agentsList">Loading agents...</div>
        </div>
    </div>

    <script>
        const API = 'http://localhost:3011';
        
        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('dashboardTab').classList.add('hidden');
            document.getElementById('agentsTab').classList.add('hidden');
            document.getElementById(tabName + 'Tab').classList.remove('hidden');
            if (tabName === 'agents') loadAgents();
        }
        
        async function loadStatus() {
            try {
                const res = await fetch(API + '/api/status');
                const data = await res.json();
                document.getElementById('entropyVal').innerText = data.entropy || 0;
                document.getElementById('agentCount').innerText = data.agents || 0;
                document.getElementById('paperMode').innerText = data.paper_mode || 'RUNNING';
            } catch(e) {
                document.getElementById('entropyVal').innerText = 'Error';
            }
        }
        
        async function loadAgents() {
            try {
                const res = await fetch(API + '/api/agents');
                const data = await res.json();
                document.getElementById('agentsList').innerHTML = data.map(a => 
                    '<div class="agent-item">' + a.name + '<span class="agent-class">' + (a.class || 'Euclid') + '</span></div>'
                ).join('');
            } catch(e) {
                document.getElementById('agentsList').innerHTML = 'Error loading agents';
            }
        }
        
        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const msg = input.value.trim();
            if (!msg) return;
            const chat = document.getElementById('chatArea');
            chat.innerHTML += '<div class="user-msg">👤 ' + escapeHtml(msg) + '</div>';
            input.value = '';
            chat.scrollTop = chat.scrollHeight;
            chat.innerHTML += '<div class="bot-msg">🤖 Thinking...</div>';
            chat.scrollTop = chat.scrollHeight;
            try {
                const res = await fetch(API + '/api/intelligence/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                chat.removeChild(chat.lastChild);
                chat.innerHTML += '<div class="bot-msg">🤖 ' + escapeHtml(data.response) + '</div>';
            } catch(e) {
                chat.removeChild(chat.lastChild);
                chat.innerHTML += '<div class="bot-msg">🤖 Error: ' + e.message + '</div>';
            }
            chat.scrollTop = chat.scrollHeight;
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        loadStatus();
        setInterval(loadStatus, 10000);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ LEGION EV22: http://localhost:${PORT}`);
});

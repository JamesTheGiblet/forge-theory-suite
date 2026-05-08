const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9000;

// Serve static files from web/editor
app.use(express.static(path.join(__dirname, 'web/editor')));

// Proxy all /api requests to the real backend
app.use('/api', (req, res) => {
    const backendUrl = `http://localhost:3011${req.url}`;
    
    const options = {
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const proxy = http.request(backendUrl, options, (backendRes) => {
        res.writeHead(backendRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        backendRes.pipe(res);
    });

    proxy.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.status(500).json({ error: 'API unavailable' });
    });

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            proxy.write(body);
            proxy.end();
        });
    } else {
        proxy.end();
    }
});

// Serve the modular dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web/editor/modular_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`✅ LEGION Dashboard running on http://localhost:${PORT}`);
    console.log(`   API proxy active: /api/* → http://localhost:3011/api/*`);
});

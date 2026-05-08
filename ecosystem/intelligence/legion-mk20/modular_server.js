const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9000;

// Serve static files from the editor directory (where tabs and HTML live)
app.use(express.static(path.join(__dirname, 'web/editor')));

// Proxy middleware for API calls
app.use('/api', (req, res) => {
    const apiUrl = `http://localhost:3011${req.url}`;
    const options = {
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const proxyReq = http.request(apiUrl, options, (proxyRes) => {
        res.setHeader('Content-Type', 'application/json');
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode).send(data);
        });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.status(500).json({ error: 'API unavailable' });
    });

    // If it's a POST request with a body, forward it
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        proxyReq.end();
    }
});

// Main route for dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web/editor/modular_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║         🎯 LEGION EV22 — MODULAR DASHBOARD                    ║`);
    console.log(`║                                                               ║`);
    console.log(`║  🚀 http://localhost:${PORT}                                   ║`);
    console.log(`║  📁 Tabs: dashboard.html | agents.html | gallery.html | settings.html`);
    console.log(`║  🔄 API proxy active: /api/* → http://localhost:3011/api/*   ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);
});

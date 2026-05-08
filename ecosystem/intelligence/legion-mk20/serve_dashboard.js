const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9000;

// Serve static files (CSS, JS, images) from editor directory
app.use(express.static(path.join(__dirname, 'web/editor')));

// Proxy all /api requests to the real backend
app.use('/api', (req, res) => {
    const backendUrl = `http://localhost:3011${req.url}`;
    const options = {
        method: req.method,
        headers: { 'Content-Type': 'application/json' }
    };
    const proxy = http.request(backendUrl, options, (backendRes) => {
        res.writeHead(backendRes.statusCode, { 'Content-Type': 'application/json' });
        backendRes.pipe(res);
    });
    proxy.on('error', () => res.status(500).json({ error: 'API unavailable' }));
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

// Serve the modular dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web/editor/modular_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`\n✅ LEGION EV22 Dashboard: http://localhost:${PORT}`);
    console.log(`   Modular dashboard should now load.`);
});

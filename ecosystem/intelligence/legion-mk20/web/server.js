const express = require('express');
const path = require('path');

const app = express();
const PORT = 9000;

app.use(express.static(path.join(__dirname, 'editor')));

app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'editor/legion-ev22-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║              LEGION EV22 — Complete Dashboard                    ║`);
    console.log(`║                                                               ║`);
    console.log(`║  🚀 Running at: http://localhost:${PORT}                       ║`);
    console.log(`║  📊 API: http://localhost:3011/api/status                     ║`);
    console.log(`║  🎮 Emergent Monitor: http://localhost:8080                    ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);
});

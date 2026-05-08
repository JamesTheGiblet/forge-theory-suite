const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const app = express();
app.use(express.json());

const LIVE_TRADING = process.env.LIVE_TRADING === 'true';

async function closeAllPositions() {
    console.log('[EMERGENCY] Closing all positions...');
    if (!LIVE_TRADING) {
        return { success: true, message: 'Paper mode – no action', closed: [] };
    }
    try {
        const { placeOrder, getBalance } = require('./engine/kraken_executor');
        const { getCurrentPrice } = require('./shared/kraken_adapter');
        const balance = await getBalance();
        const closed = [];
        for (const [asset, amount] of Object.entries(balance)) {
            if (asset !== 'USD' && amount > 0) {
                const price = await getCurrentPrice(`${asset}/USD`);
                const result = await placeOrder({ asset: `${asset}/USD` }, 'sell', amount);
                closed.push({ asset, amount, result });
                console.log(`[EMERGENCY] Sold ${amount} ${asset} at $${price}`);
            }
        }
        return { success: true, closed };
    } catch (err) {
        console.error('[EMERGENCY] Error:', err.message);
        return { success: false, error: err.message };
    }
}

app.post('/api/emergency/close_all', async (req, res) => {
    try {
        const result = await closeAllPositions();
        res.json({ status: 'ok', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/kill_switch', async (req, res) => {
    try {
        const closeResult = await closeAllPositions();
        // Send response BEFORE stopping PM2
        res.json({ status: 'killed', message: 'All trading stopped, positions closed', closeResult });
        // Then stop PM2 asynchronously
        setTimeout(() => {
            exec('pm2 stop all', (err) => {
                if (err) console.error('[KILL_SWITCH] Error stopping PM2:', err);
            });
        }, 100);
    } catch (err) {
        console.error('[KILL_SWITCH] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`[EMERGENCY] API on port ${PORT} (LIVE_TRADING=${LIVE_TRADING})`);
});

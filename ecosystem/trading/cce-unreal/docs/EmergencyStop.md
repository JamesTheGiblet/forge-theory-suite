# EMERGENCY STOP PROCEDURE

**USE THIS DOCUMENT IF:**

* The bot is buying/selling uncontrollably (looping).
* You see a massive drop in portfolio value (-20% in an hour).
* Kraken is reporting API errors but the bot keeps trying.
* You just want out. NOW.

---

### PHASE 1: KILL THE ROBOT

**Do not wait for a graceful shutdown. Cut the power.**

#### Option A: Dashboard Emergency Stop (Easiest)

1. Open your browser and go to `http://localhost:3000`
2. Click the big red **EMERGENCY STOP** button
3. Enter your stop token when prompted
4. Confirm the bot status shows **STOPPED**

#### Option B: If running via PM2 (Raspberry Pi / Server)

1. Open your terminal.
2. Run this command immediately:

   ```bash
   pm2 stop all
   ```

   *This stops every process managed by PM2.*

#### Option C: If running via Systemd (Auto-start service)

1. Run this command:

   ```bash
   sudo systemctl stop cce
   ```

#### Option D: If running in a Terminal Window

1. Click inside the terminal window.
2. Press `Ctrl + C` twice rapidly.
3. If it doesn't stop, close the entire window.

#### Option E: If running in a Windows Command Prompt

1. Click inside the black Command Prompt window
2. Press `Ctrl + C`
3. If nothing happens, click the X to close the window entirely
4. Open Task Manager (`Ctrl + Shift + Esc`), find `node.exe`, right-click → End Task

---

### PHASE 2: SECURE THE FUNDS (Manual Override)

The bot is dead. Now you must be the pilot.

1. **Log in to Kraken:** <https://www.kraken.com/sign-in>
2. **Check Open Orders:**
   * Go to **Trade** > **Orders**.
   * If you see any **Open** orders, click the **"x" (Cancel)** button next to them.
   * *Why?* The bot might have placed limit orders that haven't filled yet.
3. **Check Your Positions:**
   * Go to **Portfolio**.
   * Decide: Do you want to stay in crypto (BTC/ETH) or go to Cash (USD/USDC)?
   * **To exit to cash:** Go to **Trade**, select the pair (e.g., BTC/USD), select **Sell**, select **Market**, enter **100%**, and click **Sell**.

---

### PHASE 3: DIAGNOSE (Don't touch the crime scene)

Before you try to fix it, save the evidence.

1. **Export the Logs:**
   Run this to save the last 500 lines of logs to a file:

   ```bash
   pm2 logs --lines 500 --nostream > crash_log_$(date +%Y%m%d).txt
   ```

   Or if running locally, copy the `logs/reports.log` file to a safe place.
   **Windows alternative:** Open your project folder, navigate to `logs/` and copy `reports.log` to your Desktop.

---

### PHASE 4: DO NOT RESTART

**If the system failed in a way that required an emergency stop, do not turn it back on.**

1. Switch `CCE_DRY_RUN=true` in your `.env` file immediately.
2. Do not switch back to live trading until you have identified exactly why the failure occurred.

---

### PHASE 5: CONTACT SUPPORT

Once you are safe and funds are secured, email [your support address] with:

* Your crash log file attached
* What you saw happening before you stopped it
* Your current portfolio state on Kraken

Do not attempt to diagnose or fix the issue yourself before reaching out. Fresh eyes on a fresh log is the fastest path to resolution.

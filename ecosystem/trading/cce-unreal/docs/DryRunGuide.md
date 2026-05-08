# Try Before You Trust: The Dry Run Guide

**Don't trust us. Trust the code.**
Before you put £1 of real money into CCE, you should run it in "Dry Run" mode.

Think of this like a flight simulator. The software connects to the live crypto market, watches real prices, and makes real decisions—but it trades with **Monopoly money**.

### What you need

1. A computer (Windows, Mac, or Linux)
2. **Node.js** installed (It's free. [Download here](https://nodejs.org/))

---

### Step 1: Download the Engine

1. Check your email for the download link from Gumroad.
2. Download the ZIP file using your personal 7-day link.
3. Unzip the folder to your Desktop.

### Step 2: Enter Your Licence Key

1. Open the folder you unzipped.
2. Find the file named `.env.example`.
3. **Rename** it to `.env` (just `.env`, no extra words).
4. Open it with Notepad (Windows) or TextEdit (Mac).
5. Find this line:

   ```ini
   LICENCE_KEY=
   ```

   Paste your licence key from your Gumroad email after the equals sign. The engine will not start without a valid key.

### Step 3: The "Safety Switch"

In the same file, find this line:

   ```ini
   CCE_DRY_RUN=true
   ```

As long as this says `true`, your real funds are 100% safe. The software physically cannot execute a real trade.

### Step 4: Turn it On

1. Open your Command Prompt (Windows) or Terminal (Mac).
2. Type `cd` followed by a space, then drag the folder into the window to paste the path. Hit **Enter**.
3. Type this command to install the engine parts:

   ```bash
   npm install
   ```

4. Type this command to start the simulator:

   ```bash
   npm run dry-run
   ```

### Step 5: Watch it Work

You will see text appear on your screen. Look for these lines:

* `🚀 Starting CCE Engine`
* `🔄 CCE RUN #1`
* `✅ State: DORMANT (no change)`

**Now, wait.**
The system runs on a 4-hour heartbeat. It might not do anything interesting for days. This is normal. It is waiting for the "Champagne Tower" effect.

* **Check the logs:** You'll see it checking prices every 4 hours.
* **Check your balance:** You'll see your "Paper Portfolio" go up or down based on its decisions.

### Bonus: Open the Dashboard

Open your browser and go to `http://localhost:3000`
You'll see your paper portfolio, current state, and every decision the engine has made — all in real time.

### When to go Live?

We recommend running this for **at least 30 days**.

Only when you have watched it survive a market dip and protect your paper money should you consider switching `CCE_DRY_RUN` to `false`.

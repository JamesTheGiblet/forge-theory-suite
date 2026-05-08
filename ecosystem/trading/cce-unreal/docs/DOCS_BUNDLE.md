# CCE Customer Documentation Bundle

**Version:** 2.3.0
**Generated:** March 23, 2026

This document contains the complete set of customer-facing guides and email templates for the Cascade Compounding Engine.

---

## Platform Overview (v2.3.0)

CCE has grown from a single crypto engine into a full trading operating
system. The platform now runs 11 engines across three ecosystems:

**S.E — Strategic Engines** (patient, macro-driven)
- S.E Crypto (live), S.E Forex, S.E REIT, S.E Stocks, S.E Commodities, S.E EGP

**T.E — Tactical Engines** (active, mechanical)
- T.E Grid, T.E Momentum, T.E Breakout, T.E LCE (Liquidation Cascade)

**O.E — Observer Engines** (passive intelligence)
- O.E Observer, O.E Sentinel, O.E Strategist

The guides below focus on S.E Crypto — the core engine. Full
documentation for all engines is available in the repository.

---

---

## 1. How CCE Actually Works

*(File: `how it work.md`)*

# How CCE Actually Works

*(No jargon. No magic. Just a very patient robot.)*

### The Elephant in the Room

Let’s be honest: You’ve probably been burned before. Maybe it was a "cloud miner" on Facebook or a "trading guru" who promised 10% daily returns. You sent them money, and they disappeared.

**We are not that.**

* **We don't want your money.** You never send us a penny.
* **We don't promise daily profits.** In fact, sometimes this system does nothing for months.

If you are looking for a get-rich-quick scheme, please close this tab. If you want a disciplined tool to manage your own assets, keep reading.

---

### 1. The Concept: The "Champagne Tower"

Imagine a wedding champagne tower. You pour champagne into the top glass. It fills up, then overflows into the middle glasses, and finally spills into the bottom glasses.

Money in crypto works exactly the same way during a "Bull Run":

1. **The Top Glass (Bitcoin):** Money floods into Bitcoin first. It goes up.
2. **The Overflow (Major Coins):** When Bitcoin gets too expensive, traders move profits into Ethereum and Solana.
3. **The Splash (Small Coins):** Finally, money flows into risky, small coins for massive gains.
4. **The Cleanup:** The party ends, and prices crash.

**What CCE does:**
Most people try to guess which glass to fill. They usually guess wrong.
CCE is a robot that watches the tower 24/7. When it sees the top glass overflowing, it moves your bucket to the middle. When the middle overflows, it moves to the bottom. When the party ends, it takes your bucket and goes home (Cash).

### 2. Why This is Safer Than a "Facebook Miner"

The biggest fear in crypto is: *"Can I get my money back?"*

* **The Scam Way:** You send £200 to a stranger's website. You see fake numbers go up. When you try to withdraw, they block you.
* **The CCE Way:** You keep your money in **your own bank account** (your Kraken exchange account).

You download the CCE software and run it on **your own computer** (or a cheap Raspberry Pi).

* It connects to your account like a remote control.
* It has permission to **Trade** (buy/sell).
* It does **NOT** have permission to **Withdraw**.
* Even if the developer wanted to steal your funds, the code literally cannot do it.

### 3. The "Boring" Secret (Why it works)

Humans are emotional. We buy when we are excited (at the top) and sell when we are scared (at the bottom).

CCE is a **State Machine**. Think of it like a thermostat.

* If the room is cold (Bear Market), the heater stays **OFF**. It sits in 100% Cash/Stablecoin. It might sit there for 6 months. It doesn't care if you are bored.
* It only turns **ON** when the specific mathematical rules of the "Champagne Tower" are met.

### 4. The Risks (Real Talk)

We promised to be transparent. Here is the reality:

* **No Guarantees:** Historical testing shows the portfolio can drop up to 50% from its peak during a bear market before recovering. If seeing your balance halved would cause you to panic and switch it off, this tool is not for you.
* **Patience Required:** This is not a slot machine. You might install it and see **zero trades** for weeks because the market isn't ready.

### Summary

1. **You hold the funds.** (On Kraken).
2. **You run the code.** (On your device).
3. **It waits for the "Waterfall."** (Bitcoin -> Alts -> Cash).
4. **Try before you buy.** Before risking a penny, run it in "Dry Run" mode. It paper trades for as long as you want, so you can watch it work before committing real money.

**Ready to stop gambling and start compounding?**
[Button: Run the Demo Free]

---

## 2. Dry Run Guide

*(File: `DryRunGuide.md`)*

# Try Before You Trust: The Dry Run Guide

**Don't trust us. Trust the code.**
Before you put £1 of real money into CCE, you should run it in "Dry Run" mode.

Think of this like a flight simulator. The software connects to the live crypto market, watches real prices, and makes real decisions—but it trades with **Monopoly money**.

### What you need

1. A computer (Windows, Mac, or Linux)
2. **Node.js** installed (It's free. Download here)

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

---

## 3. Emergency Stop Procedure

*(File: `EmergencyStop.md`)*

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

---

## 4. Troubleshooting: Stuck in DORMANT

*(File: `Troubleshooting_Dormant.md`)*

# Help! My Bot is Stuck in "DORMANT"

**Symptom:** You started the CCE engine. It says `✅ State: DORMANT (no change)`. You waited 4 hours. You waited 2 days. It still says `DORMANT`.

**Diagnosis:** The system is working perfectly.

---

### 1. The "Broken Heater" Analogy

Imagine you buy a smart heater for your house. You set it to turn on only when the temperature drops below 10°C.

It is currently July. It is 25°C outside. The heater is off.

**Is the heater broken?**
No. It is saving you money on your electricity bill because heat isn't needed yet.

**CCE works the same way.**
The `DORMANT` state means "Safety Mode." The system has looked at the market, done the math, and decided: *"It is too dangerous to trade right now. I will sit on your cash."*

### 2. What is it waiting for?

The bot is not asleep; it is watching. It checks the market every 4 hours. It is waiting for **two green lights** to turn on at the same time:

1. **The Trend (Math):**
    Bitcoin's price must be **higher** than its average price over the last 20 days.
    * *Translation:* "Is the price actually going up?"

2. **The Vibe (Sentiment):**
    The "Fear & Greed Index" must be **above 60**.
    * *Translation:* "Are other people confident enough to buy?"

If **Trend** is down, or **Vibe** is fearful, the bot stays `DORMANT`.

### 3. How to check if it's right

You can verify the bot's decision yourself in 30 seconds:

1. **Check the Vibe:**
    Go to alternative.me/crypto/fear-and-greed-index/.
    * Is the number below 60? **Then the bot should be DORMANT.**

2. **Check the Trend:**
    Look at a Bitcoin chart. Is the price crashing or moving sideways?
    * **Then the bot should be DORMANT.**

### 4. "But I want it to trade NOW!"

We know it's boring to watch a terminal do nothing. But remember why you downloaded this.

* **Humans** trade because they are bored. They lose money.
* **CCE** trades because the math says so. It makes money.

**Do not try to force it.**
Switching off the bot during DORMANT and turning it back on manually is the number one way customers lose money. The system needs to see the full cycle to exit safely.
Let it protect your capital. When the "Champagne Tower" starts flowing, it will wake up instantly.

### 5. When DORMANT might actually be a problem

If you see any of these, something may need fixing:

**The heartbeat has stopped**
You should see `🔄 CCE RUN #` in your logs every 4 hours. If the number stopped incrementing, your process crashed. Fix:

```bash
pm2 restart cce-bot
# or
npm run dry-run
```

**Error messages in the logs**

```bash
pm2 logs cce-bot
```

Look for red text or lines containing `ERROR`. Copy the message and check the troubleshooting guide.

**It's been in DORMANT for over 6 months**
This happened in 2018 and 2022 — genuine multi-year bear markets. The system is doing its job. Check the Fear & Greed index. If it's been below 40 for months, the market isn't ready. Neither is CCE.

---

## 5. Glossary of States

*(File: `GlossaryOfStates.md`)*

# The 8 States of CCE: A Simple Glossary

The engine moves your money between 8 distinct "States" depending on the weather in the crypto market. Here is what each one actually means.

### 🐻 Defensive States (Safety First)

* **DORMANT (The Bunker):** The system sits in 100% cash because the market is dangerous (Bear Market), waiting for a confirmed uptrend.
* **EXTRACTION (The Eject Button):** The system sells everything immediately to Cash because a sudden market crash has been detected.
* **ANCHOR (The Safety Net):** The system holds 50% Cash and 50% Bitcoin to protect gains when the market gets choppy or uncertain.

### 🚀 Growth States (Making Money)

* **ACCUMULATION (The Toe-Dip):** The system buys a small amount of Bitcoin (25%) to test if the market is actually recovering before committing fully.
* **IGNITION (The Launch):** The system goes "All In" on Bitcoin (100%) because a strong bull run has been confirmed.

### 🌊 The Waterfall (Altcoin Season)

* **CASCADE 1 (The Major Rotation):** Bitcoin profits are moved into "safe" large coins like Ethereum and Solana to catch the second wave of growth.
* **CASCADE 2 (The Alt Season):** Capital rotates into a balanced mix of Bitcoin, Ethereum and Solana, positioned to capture maximum growth as alt season peaks.
* **SPILLWAY (The Exit Ramp):** The system starts moving money back into Bitcoin and Cash as the party winds down, locking in profits before the crash.

---

### What you'll see in your logs

```
✅ State: DORMANT (no change)
🔄 CCE RUN #47
💰 BTC Price: $67,996
😰 Fear & Greed: 8
```

---

## 6. First 24 Hours Email

*(File: `First24HoursEmail.md`)*

# Email: Welcome to the quietest revolution in crypto

**Subject:** Welcome to the quietest revolution in crypto

Hi [Name],

You just bought a robot that is designed to do nothing 90% of the time.

That might sound strange, but it is exactly why you are here. You are tired of staring at charts, tired of panic-selling, and tired of guessing.

**Your journey starts now.**

### Step 1: Don't trust us yet

We don't want you to risk a single penny of real money until you see how this works.

1. **Download the Engine** (Link in your Gumroad receipt).
2. **Open the "Dry Run Guide"** (It is the file named `DryRunGuide.md` inside the folder).
3. **Follow the steps** to turn on "Paper Trading" mode.

### Step 2: Watch the Dashboard

Once you have the engine running, open your browser to:
`http://localhost:3000`

This is your mission control. You will see:

* **The State:** Is it DORMANT (Safe) or IGNITION (Active)?
* **The Portfolio:** Watch your "Monopoly money" grow (or shrink) as the bot makes decisions.
* **The Logs:** See exactly *why* it made every decision.

### What to expect in the next 24 hours

Likely? **Nothing.**

If the market is choppy or bearish, the bot will stay in `DORMANT` state. It will check the prices every 4 hours, say "Nope, not safe yet," and go back to sleep.

**This is a feature, not a bug.**

Let it run. Let it watch. When the "Champagne Tower" overflows, it will be ready.

— The CCE Team

P.S. If you get stuck, reply to this email. We are real people, and we want you to succeed.

---

## 7. Windows Troubleshooting

*(File: `Troubleshooting_Windows.md`)*

# Windows Troubleshooting Guide

**"Computer says no?" Here is how to fix it.**

Windows tries very hard to protect you. Sometimes it protects you from software you actually want to run. Here are the common issues and how to solve them in 30 seconds.

### 1. The Blue "Windows protected your PC" Popup

**Symptom:** You double-click `start.bat` and get a blue window preventing the app from starting.
**Why:** We are an independent developer, not Microsoft. We haven't paid thousands of dollars for a corporate digital certificate, so Windows treats us as "Unknown."
**Fix:**

1. Click **"More info"** (the underlined text).
2. Click the **"Run anyway"** button that appears.
3. *You only have to do this once.*

### 2. Anti-Virus Deleted My File

**Symptom:** `cce-engine.exe` disappears, or you get a "Threat Detected" notification.
**Why:** The engine is built with a tool called `pkg`. Sometimes, aggressive anti-virus software (like McAfee, Norton, or Windows Defender) sees a new `.exe` file it doesn't recognize and assumes it's a virus. This is called a "False Positive."
**Fix:**

1. Open your Anti-Virus dashboard.
2. Look for **"Quarantine"** or **"Protection History"**.
3. Find the file `cce-engine.exe` and select **"Restore"** or **"Allow"**.
4. **Pro Tip:** Add the `cce-production` folder to your Anti-Virus "Exclusions" or "Whitelist" to prevent this from happening again.

### 3. Dashboard Won't Load (localhost:3000)

**Symptom:** The black window says the dashboard is running, but your browser says "Unable to connect."
**Why:** Windows Firewall might be blocking the connection.
**Fix:**

1. Press the **Windows Key** and type "Firewall".
2. Select **"Allow an app through Windows Firewall"**.
3. Click **"Change settings"** (top right).
4. Look for `cce-engine` or `Node.js JavaScript Runtime` in the list.
5. Check the boxes for both **Private** and **Public**.
6. Click **OK** and refresh the page.

### 4. The Black Window Closes Immediately

**Symptom:** You double-click `start.bat`, a black box flashes, and then disappears instantly.
**Why:** The program crashed, usually because it can't find its files.
**Fix:**

1. **Did you unzip it?** This is the #1 cause. You cannot run the bot from inside the zip file. Right-click the zip file and select **"Extract All"**.
2. **Are you running start.bat?** Do not run `cce-engine.exe` directly. The batch file handles the setup and keeps the window open if there is an error.
3. **Check the logs:** Open the `logs` folder and look for a text file. It will tell you what went wrong.

### 5. "Edit with Notepad" isn't working

**Symptom:** The setup script tries to open your config file, but nothing happens.
**Fix:**

1. Right-click the file named `.env`.
2. Select **"Open with"**.
3. Choose **Notepad**.

---

## 8. Nurture Email Sequence

*(File: `NurtureEmails.md`)*

# Nurture Sequence: From Dry Run to Live

**Trigger:** User downloaded the ZIP file 7 days ago.
**Goal:** Reassure them that "silence" from the bot is normal and build confidence in the logic.

---

### Email 1: Day 7

**Subject:** Is your robot sleeping?

Hi [Name],

It’s been a week since you downloaded the CCE engine.

If you have it running, you might be looking at your terminal thinking: *"Is this thing on?"*

You see `[STATE] DORMANT`. You see no trades. You see no profit.

**Good.**

This is a reminder that CCE is a **sniper, not a machine gun**. It doesn't shoot at everything that moves. It waits for the "Champagne Tower" to overflow.

If your logs show `🔄 CCE RUN #` every 4 hours and `✅ State: DORMANT (no change)`, the system is working perfectly. It is protecting your capital by doing nothing until the math says "Go."

Let it sleep. It will wake up when the market is ready.

Stay patient,
The CCE Team

---

### Email 2: Day 14

**Subject:** The "Boring" Secret to Wealth

Hi [Name],

You are two weeks into your Dry Run.

By now, you realize that real professional trading is 99% waiting and 1% action.

Most people lose money because they get bored. They buy a coin because it has a funny dog on it, just to feel something. They treat the market like a slot machine.

**CCE does not get bored.**

It is currently watching the "Top Glass" (Bitcoin). Until that glass overflows mathematically, the robot will sit on its hands.

* **If the market is crashing:** It stays in Cash/Stablecoins to keep you safe.
* **If the market is flat:** It waits.

You don't need to check it every day. Just check the `logs.txt` once a week to make sure your computer didn't go to sleep.

The overflow always comes eventually.

* The CCE Team

---

### Email 3: Day 21

**Subject:** Taking the training wheels off

Hi [Name],

You've been paper trading for three weeks. If you want to wait the full 30 days we recommend, that's smart — there's no rush.

If you have watched the system navigate the market and you understand the risks (remember: up to 50% drawdowns are possible in the short term), you might be ready to switch to Live Mode.

**How to go live:**

1. Open your `.env` file.
2. Change `CCE_DRY_RUN=true` to `false`.
3. Add your Kraken API Key and Secret (if you haven't already).
4. Restart the bot.

**Please start small.**

Do not bet the farm. Put in an amount you are comfortable watching drop by half, knowing the math is working to bring it back up.

Welcome to the waterfall.

* The CCE Team

---

### Email 4: First State Transition (Triggered)

**Subject:** Your robot just woke up

Hi [Name],

If you are watching your terminal right now, you may have just seen something change.

`DORMANT → ACCUMULATION`

This is the system seeing the first signs of the Champagne Tower filling. It has moved 25% of your paper portfolio into Bitcoin — cautiously, not all-in.

This is not a signal to panic or get excited. It is the math doing exactly what it was designed to do.

Watch what happens next.

— The CCE Team

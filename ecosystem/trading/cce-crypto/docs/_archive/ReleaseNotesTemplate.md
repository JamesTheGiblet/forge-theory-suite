# Release Notes Template

*(Use this template for all future updates sent to customers via email or Gumroad)*

# Update: [Version Number] — [Short, Human-Readable Title]

*(Released: [Date])*

### The "Too Long; Didn't Read"

* **Urgency:** [Low / Medium / Critical]
* **Action Required:** [Nothing / Restart Bot / Download New Version]
* **Strategy Change:** [No / Yes - Read Section 1]

---

### 1. What actually changed?

*(No jargon. Just the facts.)*

**[Headline for Change 1]**
[Explain the change using a real-world analogy. Do not say "Optimized state transition logic." Say "We made the robot less jumpy. It now waits for two confirmations before buying, like checking both ways before crossing the street."]

**[Headline for Change 2]**
[Explain the fix. Do not say "Fixed null pointer exception." Say "Fixed a bug where the bot would get confused if the internet cut out for exactly 1 second."]

### 2. The "Under the Hood" Stuff

*(For those who want the math)*

* **Strategy:** [Specific parameter changes, e.g. "Changed SMA period from 20 to 21"]
* **Tech:** [Specific code changes, e.g. "Updated CCXT library to v4.0"]

### 3. How to Update

**If you are running the Dry Run:**

1. Download the new ZIP from your Gumroad link.
2. Copy your `.env` file into the new folder.
3. Run `npm install` and `npm run dry-run`.

**If you are Live:**

1. Stop the bot: `pm2 stop cce-bot`
2. Backup your database: `cp data/cce-production.db data/backup.db`
3. Replace the files with the new version.
4. Run `npm install`.
5. Restart: `pm2 restart cce-bot`

### 4. Risk Update

[Honest statement: Does this make the bot safer, riskier, or the same? e.g., "This update makes the bot slightly more patient. You may see fewer trades, but they should be higher quality."]

---
**Thank you for trusting the code.**
— The CCE Team

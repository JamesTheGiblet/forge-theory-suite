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

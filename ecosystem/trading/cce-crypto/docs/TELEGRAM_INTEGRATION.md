# Telegram Integration
### CCE Platform — Notification System

---

## Setup

Add to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
Get your bot token:
Open Telegram → search @BotFather
Send /newbot → follow prompts
Copy the token
Get your chat ID:
Send any message to your bot
Visit https://api.telegram.org/bot<TOKEN>/getUpdates
Find "chat":{"id":...} — that's your chat ID
Message Prefixes
Every engine prefixes its Telegram messages:
[no prefix]   S.E Crypto
[FOREX]       S.E Forex
[RME]         S.E REIT
[CME]         S.E Stocks
[COMO]        S.E Commodities
[EGP]         S.E EGP
[GRID]        T.E Grid
[MOM]         T.E Momentum
[BRK]         T.E Breakout
[LCE]         T.E LCE
[OBS]         O.E Observer
[SEN]         O.E Sentinel
[STR]         O.E Strategist
[G.O]         Grand Orchestrator
[WEATHER]     Weather Engine
[FL]          Forensic Layer (weekly report)
[AUDIT]       System health alerts
[CSS]         Capital siphon events
Message Types
Type
When sent
State transition
Engine moves between states
Trade signal
Entry or exit detected (dry run or live)
Daily report
Every 24 engine cycles
Weekly F.L report
Monday 9am — top regrets and doubt patterns
AUDIT summary
Daily 8am — system health
CSS siphon
When profit is skimmed to reserves
G.O recommendation
When allocation suggestion is generated
Error alert
Cycle error or data feed failure
Test Telegram
From dashboard:
POST http://localhost:3000/api/telegram/send
{ "message": "🔔 Test from CCE" }
Or from terminal:
curl -X POST http://localhost:3000/api/telegram/send \
  -H "Content-Type: application/json" \
  -d '{"message":"🔔 Test from CCE"}'
Or tap Test Telegram button on the dashboard.
Example Messages
State transition:
[GRID] 🔄 DORMANT → ACTIVE
BTC: $66,420 | Centre: $66,526
Orders placed: 5 buys / 5 sells
Weekly F.L report:
[FL] Weekly Forensic Report
New lessons: 3
Top regret: MOM — early exit cost +2.3%
Top doubt pattern: fg:0-20 | vix:low → doubt 0.67
AUDIT daily:
[AUDIT] Daily Health Summary
✅ All systems nominal.
Engines: 13 running | Observer: 403 cycles
Giblets Creations · v2.4.0 · March 2026

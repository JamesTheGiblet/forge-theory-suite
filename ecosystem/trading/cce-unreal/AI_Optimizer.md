# AI-Enhanced Strategy Optimizer

**Turn your backtest results into actionable strategy improvements.**

Most optimizers just give you a spreadsheet of numbers. CCE's optimizer connects to Anthropic Claude to act like a quantitative analyst sitting next to you. It reads the results, finds the patterns you missed, and suggests exactly what to test next.

### 1. Prerequisites

You need an Anthropic API Key.

1. Get one at [console.anthropic.com](https://console.anthropic.com/).
2. Open your `.env` file.
3. Add this line:

    ```ini
    ANTHROPIC_API_KEY=sk-ant-...
    ```

### 2. Running the Optimizer

```bash
npm run optimize
```

### 3. What you will see

The system will run a series of simulations (or backtests) and then pause to "Ask AI".

**The Output:**
Instead of just `Sharpe: 1.5`, you get reasoning:
> "The best configurations all shared a `minDormantDays` > 45. This suggests the strategy needs more time to reset after a bear market. However, `ignitionTrailingStopPct` was too tight in the losing configs, causing premature exits."

**The Suggestions:**
The AI will output 3 specific configuration blocks (JSON) that you can copy/paste into your `proprietary.config.js` to test immediately.

### 4. Privacy Note

We send **statistical summaries only** (Sharpe ratios, drawdowns, parameter values) to Claude. We do **not** send your trade history, API keys, or proprietary logic code.

### 5. Troubleshooting

* **"No Claude key found":** Check your `.env` file.
* **"AI analysis failed":** Check your internet connection or API quota.
* **"Simulated Results":** By default, the optimizer runs in simulation mode. To optimize against real data, ensure your `backtest-results` folder is populated or configure the optimizer to run a full backtest loop.

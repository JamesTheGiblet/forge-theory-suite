# Weather Engine
### CCE Platform — Agricultural Commodity Signals

**Status:** 🟢 Live — 6H cycle via cce-bot
**Source:** `src/cce-weather-engine.js`
**API Key:** `WEATHER_API_KEY` in `.env` (OpenWeatherMap)

---

## Overview

The Weather Engine monitors meteorological conditions across four agricultural
regions and generates commodity trading signals based on temperature, humidity,
and precipitation forecasts.

It does not trade. It generates signals that feed into S.E Commodities analysis
and display on the dashboard weather widget.

---

## Monitored Locations

| Location | City | Commodities |
|----------|------|-------------|
| US Midwest | Chicago | Corn, Soybeans, Wheat |
| Brazil | São Paulo | Oranges |
| Southeast Asia | Bangkok | Rice |
| California | Fresno | Oranges |

---

## Signal Logic

| Commodity | Bullish Condition | Bearish Condition |
|-----------|------------------|------------------|
| Corn | Temp 25-30°C forecast | Extreme heat >35°C |
| Soybeans | Rain forecast | Humidity >85% |
| Wheat | Good moisture | Drought forecast |
| Oranges | Warm >25°C | Frost forecast <0°C |
| Rice | Normal conditions | Excessive rainfall + heat |

Signal range: `-1.0` (strongly bearish) to `+1.0` (strongly bullish)

---

## API Endpoint
GET /api/weather/signals
Response:
```json
{
  "signals": [
    {
      "commodity": "Soybeans",
      "signal": 0.3,
      "reason": "Good rainfall",
      "location": "US Midwest",
      "temp": 6.1,
      "condition": "Clouds",
      "humidity": 70
    }
  ]
}
Dashboard Widget
The Agricultural Weather Signals widget shows 6 commodity cards:
▲ Green = Bullish (signal > 0.2)
◆ Amber = Neutral
▼ Red = Bearish (signal < -0.2)
Updates every 60 minutes on the dashboard, every 6 hours in the engine.
Configuration
// config.js
weather: {
  enabled: true,  // default true
}

// .env
WEATHER_API_KEY=your_openweathermap_free_key
OpenWeatherMap free tier supports up to 1,000 calls/day.
The engine makes 8 calls per cycle (2 per location) × 4 cycles/day = 32 calls/day.
Giblets Creations · v2.4.0 · March 2026

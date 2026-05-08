#!/data/data/com.termux/files/usr/bin/python3
"""
CCE Capitulation Signal Monitor for Termux
ULTRA-LIGHT version - No external dependencies except requests!
"""

import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path
import sys

# ==================== TERMUX PATHS ====================
TERMUX_HOME = "/data/data/com.termux/files/home"
CONFIG = {
    'FNG_THRESHOLD': 25,
    'DOM_DROP_THRESHOLD': -1.5,
    'MAX_DISTANCE_FROM_MA200': 0.30,
    'MA50_PERIOD': 50,
    'MA200_PERIOD': 200,
    'DOMINANCE_PERIOD': 7,
    
    # File paths
    'STATE_FILE': f'{TERMUX_HOME}/cce/state.json',
    'LOG_FILE': f'{TERMUX_HOME}/cce/logs/cap_signal.log',
    'CACHE_DIR': f'{TERMUX_HOME}/cce/cache/',
    'DOM_HISTORY_FILE': f'{TERMUX_HOME}/cce/cache/dominance_history.json',
    'BTC_CACHE_FILE': f'{TERMUX_HOME}/cce/cache/btc_cache.json',
    
    # APIs
    'FNG_API': 'https://api.alternative.me/fng/?limit=1',
    'COINGECKO_API': 'https://api.coingecko.com/api/v3/global',
    'COINGECKO_BTC_API': 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=250&interval=daily',
}

# Create directories
for dir_path in [CONFIG['CACHE_DIR'], os.path.dirname(CONFIG['LOG_FILE'])]:
    os.makedirs(dir_path, exist_ok=True)

# ==================== SIMPLE LOGGING ====================
def log(message, level="INFO"):
    """Simple logging function"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"{timestamp} - {level} - {message}"
    
    # Print to console
    print(log_line)
    
    # Write to log file
    with open(CONFIG['LOG_FILE'], 'a') as f:
        f.write(log_line + '\n')

# ==================== SIMPLE HTTP REQUEST ====================
def fetch_json(url):
    """Fetch JSON from URL using urllib (no requests needed)"""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        log(f"Error fetching {url}: {e}", "ERROR")
        return None

# ==================== PURE PYTHON CALCULATIONS ====================
def calculate_sma(prices, period):
    """Simple Moving Average calculation"""
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / period

def calculate_all_smas(prices):
    """Calculate SMA for all periods"""
    sma50_list = []
    sma200_list = []
    
    for i in range(len(prices)):
        # SMA50
        if i < CONFIG['MA50_PERIOD'] - 1:
            sma50_list.append(None)
        else:
            sma50 = calculate_sma(prices[:i+1], CONFIG['MA50_PERIOD'])
            sma50_list.append(sma50)
        
        # SMA200
        if i < CONFIG['MA200_PERIOD'] - 1:
            sma200_list.append(None)
        else:
            sma200 = calculate_sma(prices[:i+1], CONFIG['MA200_PERIOD'])
            sma200_list.append(sma200)
    
    return sma50_list, sma200_list

# ==================== DATA FETCHERS ====================
def get_fear_greed():
    """Fetch Fear & Greed Index"""
    try:
        data = fetch_json(CONFIG['FNG_API'])
        if data and 'data' in data and len(data['data']) > 0:
            fng_value = int(data['data'][0]['value'])
            fng_class = data['data'][0]['value_classification']
            log(f"📊 Fear & Greed: {fng_value} - {fng_class}")
            return fng_value
    except Exception as e:
        log(f"Error parsing F&G: {e}", "ERROR")
    return None

def get_btc_dominance():
    """Fetch BTC dominance from CoinGecko"""
    try:
        data = fetch_json(CONFIG['COINGECKO_API'])
        if data and 'data' in data and 'market_cap_percentage' in data['data']:
            current_dom = float(data['data']['market_cap_percentage']['btc'])
            
            # Load history
            history = {}
            if os.path.exists(CONFIG['DOM_HISTORY_FILE']):
                with open(CONFIG['DOM_HISTORY_FILE'], 'r') as f:
                    history = json.load(f)
            
            # Add today's value
            today = datetime.now().strftime('%Y-%m-%d')
            history[today] = current_dom
            
            # Keep only last 30 days
            if len(history) > 30:
                oldest = sorted(history.keys())[0]
                del history[oldest]
            
            # Save history
            with open(CONFIG['DOM_HISTORY_FILE'], 'w') as f:
                json.dump(history, f)
            
            # Calculate 7-day change
            dates = sorted(history.keys())
            dom_change = 0.0
            if len(dates) >= CONFIG['DOMINANCE_PERIOD']:
                seven_days_ago = dates[-CONFIG['DOMINANCE_PERIOD']]
                old_dom = float(history[seven_days_ago])
                dom_change = current_dom - old_dom
                log(f"📊 BTC Dom: {current_dom:.2f}% (7d: {dom_change:+.2f}%)")
            else:
                log(f"📊 BTC Dom: {current_dom:.2f}% (need {CONFIG['DOMINANCE_PERIOD']-len(dates)} more days)")
            
            return {
                'current': current_dom,
                'change_7d': dom_change
            }
    except Exception as e:
        log(f"Error fetching dominance: {e}", "ERROR")
    return None

def get_btc_data():
    """Fetch BTC price data from CoinGecko"""
    try:
        data = fetch_json(CONFIG['COINGECKO_BTC_API'])
        if data and 'prices' in data:
            prices_data = data['prices']  # [[timestamp, price], ...]
            
            # Extract dates and prices
            dates = []
            prices = []
            
            for item in prices_data:
                timestamp = datetime.fromtimestamp(item[0]/1000)
                price = float(item[1])
                dates.append(timestamp.strftime('%Y-%m-%d'))
                prices.append(price)
            
            log(f"✅ Fetched {len(prices)} days of BTC data")
            
            # Calculate MAs
            sma50, sma200 = calculate_all_smas(prices)
            
            # Save to cache
            cache_data = {
                'dates': dates,
                'prices': prices,
                'sma50': sma50,
                'sma200': sma200,
                'last_update': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            with open(CONFIG['BTC_CACHE_FILE'], 'w') as f:
                json.dump(cache_data, f)
            
            return cache_data
        else:
            log("CoinGecko API returned invalid data", "WARNING")
            # Try cache
            if os.path.exists(CONFIG['BTC_CACHE_FILE']):
                with open(CONFIG['BTC_CACHE_FILE'], 'r') as f:
                    cache_data = json.load(f)
                log(f"📁 Using cached data from {cache_data.get('last_update', 'unknown')}")
                return cache_data
    except Exception as e:
        log(f"Error fetching BTC data: {e}", "ERROR")
        
        # Try cache as last resort
        if os.path.exists(CONFIG['BTC_CACHE_FILE']):
            with open(CONFIG['BTC_CACHE_FILE'], 'r') as f:
                cache_data = json.load(f)
            log(f"📁 Using cached data (error fallback)")
            return cache_data
    
    return None

# ==================== SIGNAL CALCULATION ====================
def check_conditions(btc_data, fng_value, dom_data):
    """Check all 4 signal conditions"""
    
    conditions = {
        'extreme_fear': False,
        'dom_drop': False,
        'bear_structure': False,
        'not_overextended': False
    }
    
    if not btc_data or len(btc_data['prices']) < CONFIG['MA200_PERIOD']:
        log("Insufficient BTC data", "ERROR")
        return conditions, 0, 1.0, {}
    
    # Get latest values
    current_price = btc_data['prices'][-1]
    ma50 = btc_data['sma50'][-1]
    ma200 = btc_data['sma200'][-1]
    
    log(f"BTC Price: ${current_price:,.2f}")
    
    # Condition 1: Extreme Fear
    if fng_value is not None:
        conditions['extreme_fear'] = fng_value < CONFIG['FNG_THRESHOLD']
        log(f"C1 - Extreme Fear: {conditions['extreme_fear']} ({fng_value})")
    
    # Condition 2: Dominance Drop
    if dom_data and 'change_7d' in dom_data:
        conditions['dom_drop'] = dom_data['change_7d'] < CONFIG['DOM_DROP_THRESHOLD']
        log(f"C2 - DOM Drop: {conditions['dom_drop']} ({dom_data['change_7d']:+.2f}%)")
    
    # Condition 3: Bear Structure
    if ma200 is not None and ma50 is not None:
        price_below_ma200 = current_price < ma200
        ma50_below_ma200 = ma50 < ma200
        conditions['bear_structure'] = price_below_ma200 and ma50_below_ma200
        
        log(f"C3 - Bear Structure: {conditions['bear_structure']}")
        log(f"  Price: ${current_price:,.0f} | MA200: ${ma200:,.0f}")
        if ma50 is not None:
            log(f"  MA50: ${ma50:,.0f} | MA50 < MA200: {ma50_below_ma200}")
    
    # Condition 4: Not Overextended
    if ma200 is not None and ma200 > 0:
        pct_of_ma200 = (current_price / ma200) * 100
        lower_bound = (1 - CONFIG['MAX_DISTANCE_FROM_MA200']) * 100
        conditions['not_overextended'] = pct_of_ma200 > lower_bound
        log(f"C4 - Not Overextended: {conditions['not_overextended']} ({pct_of_ma200:.1f}%)")
        pct_display = pct_of_ma200
    else:
        pct_display = None
    
    # Calculate score and multiplier
    score = sum(1 for v in conditions.values() if v)
    multiplier = {4: 3.0, 3: 2.0, 2: 1.5, 1: 1.0, 0: 1.0}.get(score, 1.0)
    
    # Details for state file
    details = {
        'current_price': current_price,
        'ma200': ma200,
        'ma50': ma50,
        'fng_value': fng_value,
        'dom_current': dom_data['current'] if dom_data else None,
        'dom_change_7d': dom_data['change_7d'] if dom_data else None,
        'pct_of_ma200': pct_display
    }
    
    return conditions, score, multiplier, details

def update_state_file(conditions, score, multiplier, details):
    """Write signal state to state.json"""
    
    state = {
        'capSignal': {
            'score': score,
            'multiplier': multiplier,
            'conditionsMet': [
                conditions['extreme_fear'],
                conditions['dom_drop'],
                conditions['bear_structure'],
                conditions['not_overextended']
            ],
            'details': details,
            'lastUpdated': datetime.now().isoformat(),
            'timestamp': int(time.time())
        }
    }
    
    # Load existing state to preserve other data
    if os.path.exists(CONFIG['STATE_FILE']):
        try:
            with open(CONFIG['STATE_FILE'], 'r') as f:
                existing = json.load(f)
                existing.update(state)
                state = existing
        except:
            pass
    
    # Write new state
    try:
        with open(CONFIG['STATE_FILE'], 'w') as f:
            json.dump(state, f, indent=2)
        log(f"✅ State updated: score={score}, multiplier={multiplier}x")
    except Exception as e:
        log(f"Error writing state: {e}", "ERROR")

def main():
    """Main function"""
    log("="*50)
    log("🚀 CCE Capitulation Signal Monitor")
    log(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Fetch all data
    fng = get_fear_greed()
    dom = get_btc_dominance()
    btc = get_btc_data()
    
    if btc is None:
        log("Cannot proceed without BTC data", "ERROR")
        return
    
    # Check conditions
    conditions, score, multiplier, details = check_conditions(btc, fng, dom)
    
    # Update state file
    update_state_file(conditions, score, multiplier, details)
    
    # Log summary
    log(f"🎯 Signal Score: {score}/4 | Multiplier: {multiplier}x")
    log(f"Conditions: {conditions}")
    
    log("✅ Monitor cycle complete")
    log("="*50)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("👋 Shutting down...")
    except Exception as e:
        log(f"Fatal error: {e}", "ERROR")
        import traceback
        traceback.print_exc()

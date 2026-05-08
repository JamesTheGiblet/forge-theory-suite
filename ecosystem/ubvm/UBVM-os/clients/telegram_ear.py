#!/usr/bin/env python3
"""
UBVM buddai/telegram_ear script
Long-polls the Telegram API for new messages and emits 'buddai.message.received'.
"""
import sys, os, time, json
import urllib.request
ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root
import interpreter

def main():
    UBVM_HOME = os.environ['UBVM_HOME']
    d = interpreter.build_dispatch(ubvm_home=UBVM_HOME, verbose=False)
    ctx = interpreter.build_context({'scp_id': 'buddai/telegram_ear'})

    token = os.environ.get("UBVM_TELEGRAM_BOT_TOKEN")
    if not token or token == "your_bot_token_here":
        print("[!] Please set UBVM_TELEGRAM_BOT_TOKEN to run the Telegram ear.")
        return

    print("==========================================")
    print(" BuddAI Telegram Ear — Organism Input Layer")
    print("==========================================")
    print("Listening for Telegram messages...\n")

    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?timeout=30&offset={offset}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                
            for result in data.get("result", []):
                offset = result["update_id"] + 1
                msg = result.get("message", {}).get("text")
                sender = result.get("message", {}).get("from", {}).get("first_name", "Someone")
                
                if msg:
                    # Emit event for each new message
                    d['emit_event']({
                        'event': 'buddai.message.received',
                        'payload': {'message': f"[{sender} via Telegram] {msg}"}
                    }, ctx)
                    print(f"  [>] Queued Telegram message from {sender}.")

        except Exception as e:
            time.sleep(5) # Wait before retrying on network error
            continue

if __name__ == '__main__':
    main()
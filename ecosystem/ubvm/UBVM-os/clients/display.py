#!/usr/bin/env python3
"""
UBVM display.py
Live terminal dashboard for the Universal Behavioural Virtual Machine.
"""

import os
import time
import json
from datetime import datetime
import textwrap

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def read_tail(path, lines=5):
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.readlines()
    return [l.strip() for l in content[-lines:] if l.strip()]

def get_best_strategy(ubvm_home):
    path = os.path.join(ubvm_home, 'strategies', 'selected', 'current_best.json')
    if not os.path.exists(path):
        return "No strategy selected yet."
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        name = data.get("strategy_name", "unknown")
        fitness = data.get("fitness_score", 0.0)
        return f"{name} (Fitness: {fitness})"
    except Exception:
        return "Error reading current_best.json"

def get_latest_buddai_thought(ubvm_home):
    mem_dir = os.path.join(ubvm_home, 'data', 'buddai_memory')
    if not os.path.exists(mem_dir):
        return "BuddAI is dormant."
    try:
        files = sorted([f for f in os.listdir(mem_dir) if f.endswith('.json')])
        if not files:
            return "BuddAI is dormant."
        latest = os.path.join(mem_dir, files[-1])
        with open(latest, 'r', encoding='utf-8', errors='replace') as f:
            data = json.load(f)
        content = data.get("content", "...")
        return textwrap.fill(content, width=70, subsequent_indent="  ")
    except Exception:
        return "Error reading BuddAI memory."

def run_display():
    ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    queue_path = os.path.join(ubvm_home, 'logs', 'events', 'queue.jsonl')
    log_path = os.path.join(ubvm_home, 'logs', 'ubvm.log')

    try:
        while True:
            clear_screen()
            now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            print("==========================================================================")
            print(f" UBVM Live Dashboard                                  {now}")
            print("==========================================================================")
            
            print(f"\n[ CURRENT BEST STRATEGY ]\n  {get_best_strategy(ubvm_home)}")
            
            print(f"\n[ BUDDAI LATEST THOUGHT ]\n  {get_latest_buddai_thought(ubvm_home)}")
            
            print(f"\n[ RECENT EVENTS (Event Bus) ]")
            events = read_tail(queue_path, 8)
            for line in events:
                try:
                    e = json.loads(line)
                    print(f"  {e.get('ts')} | {e.get('event').ljust(25)} | {e.get('source')}")
                except json.JSONDecodeError:
                    pass

            print(f"\n[ SYSTEM LOGS ]")
            for line in read_tail(log_path, 8):
                print(f"  {line}")
                
            print("\n==========================================================================")
            print(" Press Ctrl+C to exit")
            time.sleep(2)
    except KeyboardInterrupt:
        clear_screen()

if __name__ == "__main__":
    run_display()
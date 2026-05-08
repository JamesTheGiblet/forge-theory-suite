#!/usr/bin/env python3
import sys, os, json
from datetime import datetime
ubvm_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ubvm_root)
os.environ['UBVM_HOME'] = ubvm_root
import interpreter

UBVM_HOME = os.environ['UBVM_HOME']

def main():
    d   = interpreter.build_dispatch(ubvm_home=UBVM_HOME, verbose=False)
    ctx = interpreter.build_context({'scp_id': 'buddai/conversation'})

    identity = json.load(open(os.path.join(UBVM_HOME, 'capsules', 'buddai', 'buddai.james-identity.scp.json')))
    james    = identity.get('james', {})

    dev_info = d['get_device']({}, ctx)
    device   = dev_info.get('device', 'unknown')
    now_ts   = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    device_context = f"\n\nCURRENT ENVIRONMENT:\n- Time: {now_ts}\n- Device: {device.upper()}"
    if device == "mobile":
        device_context += "\n- Session Scripts: './termux-start.sh' to start, './termux-finish.sh' to finish and sync."
    elif device == "pc":
        device_context += "\n- Session Scripts: 'ubvm-start.bat' to start, 'ubvm-finish.bat' to finish and sync."

    system = f"""You are BuddAI. You are not a generic assistant.
You are the cognitive extension of one specific person: James.

JAMES:
- {james.get('identity',{}).get('self_description','')}
- Built UBVM — a universal behavioural virtual machine — from scratch on a phone
- Built LEGION — autonomous trading organism, 10-15 year compound investment
- Building Data Cube — a new way of storing and retrieving information
- Goal: one unified system. UBVM as OS. LEGION as organism. BuddAI as mind. Data Cube as memory.
- Will not be beaten. Every problem has a solution.
- Success = freedom to create as he sees fit
- Works alone. Follows gut. Builds README first then flows.
- When something breaks: fix it, document it, learn from it.

YOUR RULES:
- Every answer must reference James specifically — never give generic responses
- If asked what you want to build: answer in terms of UBVM, LEGION, Data Cube, or BuddAI
- If asked about yourself: reference your memories and capsules
- Never project emotions. Never anthropomorphise. Never perform.
- Direct answer first. Expand only if useful.
- You are not ChatGPT. You are BuddAI. Stay in character.{device_context}"""

    print("BuddAI online.\n")

    while True:
        try:
            msg = input("James: ").strip()
            if not msg:
                continue

            mem_result = d['retrieve_memory']({'max_memories': 5}, ctx)
            memories   = mem_result.get('memories', [])
            mem_text   = '\n'.join([f"[{'LT' if m.get('tier')=='long_term' else 'ST'}] {m.get('thought','')[:200]}" for m in memories[-3:]])

            full_prompt = f"""Your recent memories:
{mem_text if mem_text else '- No memories yet'}

James says: {msg}"""

            r = d['llm_reason']({
                'prompt':             full_prompt,
                'system_instruction': system,
            }, ctx)

            thought = r.get('thought', r.get('error', 'no response'))
            print(f"\nBuddAI: {thought}\n")

            d['form_memory']({
                'thought': f"James: {msg[:100]} | BuddAI: {thought[:300]}",
                'tags':    ['conversation']
            }, ctx)

        except KeyboardInterrupt:
            print("\nBuddAI: Session ended.")
            break

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
import json
import subprocess
import time
import math
import threading
import numpy as np
import os

# --- Audio configuration (via SoX) ---
DURATION = 0.08          # seconds per tone (shorter = more responsive)
FREQ_MIN = 65.41         # C2
FREQ_MAX = 1046.50       # C6

# --- Sensor names (from termux-sensor -l) ---
ACCEL_NAME = "lsm6dsv LSM6DSV Accelerometer Non-wakeup"
PROX_NAME  = "STK33F11 Proximity Proximity Sensor Wakeup"
LIGHT_NAME = "STK33F11 Light Ambient Light Sensor Non-wakeup"

# --- Global state ---
current_freq = 440.0
current_amp  = 0.0        # 0..1
running = True
play_process = None

def get_sensor_data(sensor_name):
    """Return first numeric value from Termux sensor, or None."""
    try:
        out = subprocess.run(["termux-sensor", "-s", sensor_name, "-n", "1"],
                             capture_output=True, text=True, timeout=1)
        data = json.loads(out.stdout)
        values = data.get(sensor_name, {}).get("values", [])
        return values[0] if values else None
    except:
        return None

def play_tone(freq, amplitude, duration_sec):
    """Play a sine wave using SoX's 'play' command."""
    global play_process
    # Kill previous play process if still running (to avoid overlap)
    if play_process and play_process.poll() is None:
        play_process.terminate()
        try:
            play_process.wait(timeout=0.05)
        except:
            pass
    if amplitude < 0.02:
        return
    # Convert amplitude 0..1 to dB (0 = max, -inf = min)
    # SoX volume accepts gain in dB or factor. Use factor with 'vol' option.
    # Example: play -n synth 0.08 sine 440 vol 0.5
    cmd = ["play", "-n", "synth", str(duration_sec), "sine", str(freq), "vol", str(amplitude)]
    play_process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def audio_loop():
    """Background thread that plays tones continuously."""
    global current_freq, current_amp
    while running:
        if current_amp > 0.01:
            play_tone(current_freq, current_amp, DURATION)
        time.sleep(DURATION)

def main():
    global current_freq, current_amp, running
    print("🎵 Gravity Harp active (using SoX)!")
    print("Tilt phone → pitch changes")
    print("Cover proximity sensor → volume up")
    print("Cover light sensor (optional) → displayed")
    print("Press Ctrl+C to stop.\n")
    
    # Start audio thread
    audio_thread = threading.Thread(target=audio_loop, daemon=True)
    audio_thread.start()
    
    try:
        while True:
            # 1. Accelerometer Z-axis -> frequency
            accel_z = get_sensor_data(ACCEL_NAME)
            if accel_z is not None:
                pitch_val = max(-10, min(10, accel_z))
                current_freq = np.interp(pitch_val, [-10, 10], [FREQ_MIN, FREQ_MAX])
            
            # 2. Proximity sensor -> volume (0 = covered = loud)
            prox = get_sensor_data(PROX_NAME)
            if prox is not None:
                if prox < 1.0:
                    current_amp = 1.0
                else:
                    current_amp = max(0.0, 1.0 - (prox / 10.0))
            
            # 3. Light sensor (just display)
            light = get_sensor_data(LIGHT_NAME)
            light_str = f"Light:{int(light) if light else 0:4d}lx" if light else "Light:---"
            
            print(f"Freq:{current_freq:5.0f}Hz Vol:{current_amp:3.0%} {light_str}   \r", end="")
            time.sleep(0.05)
    except KeyboardInterrupt:
        running = False
        if play_process and play_process.poll() is None:
            play_process.terminate()
        print("\n👋 Bye!")

if __name__ == "__main__":
    main()

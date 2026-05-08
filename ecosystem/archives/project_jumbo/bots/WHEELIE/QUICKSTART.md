# 🔭 WHEELIE Quick Start Guide

**Get your robot running in 15 minutes!**

---

## Prerequisites

✅ Hardware assembled (see HARDWARE_GUIDE.md)  
✅ Computer with USB port  
✅ Internet connection (for downloads)

---

## Step 1: Install PlatformIO (5 min)

### Option A: VS Code Extension (Recommended)

```bash
1. Install VS Code: https://code.visualstudio.com/
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Search "PlatformIO IDE"
5. Click Install
6. Restart VS Code
```

### Option B: Command Line

```bash
# Python 3.6+ required
pip install -U platformio

# Verify installation
pio --version
```

---

## Step 2: Open Project (1 min)

```bash
# Navigate to WHEELIE directory
cd /path/to/project-jumbo/bots/WHEELIE

# Open in VS Code
code .

# Or if using command line only
pio run
```

**In VS Code:**

- You should see PlatformIO icon in left sidebar
- Project structure in file explorer
- PlatformIO toolbar at bottom

---

## Step 3: Copy Source Code (1 min)

**Copy the main.cpp to the src folder:**

```bash
# From project root
cp universal/main.cpp bots/WHEELIE/src/main.cpp
```

**Or manually:**

1. Open `universal/main.cpp`
2. Copy all content
3. Create/open `bots/WHEELIE/src/main.cpp`
4. Paste content
5. Save

---

## Step 4: Install Dependencies (2 min)

PlatformIO will automatically install libraries when you first build.

**Manual installation (optional):**

```bash
cd bots/WHEELIE

# Install all dependencies from platformio.ini
pio lib install

# Or install individually
pio lib install "Adafruit VL53L0X"
pio lib install "Adafruit NeoPixel"
```

**Check installed libraries:**

```bash
pio lib list
```

---

## Step 5: Build Project (1 min)

### VS Code

- Click **checkmark icon** (✓) in bottom toolbar
- Or press `Ctrl+Alt+B`

### Command Line

```bash
pio run
```

**Expected output:**

```
Processing wheelie (platform: espressif32; board: esp32dev; framework: arduino)
...
Building .pio/build/wheelie/firmware.bin
RAM:   [=         ]  12.3% (used 40256 bytes from 327680 bytes)
Flash: [====      ]  42.7% (used 559937 bytes from 1310720 bytes)
========================= [SUCCESS] Took 23.45 seconds =========================
```

✅ **If successful:** Proceed to Step 6  
❌ **If errors:** See [Troubleshooting](#troubleshooting)

---

## Step 6: Connect ESP32 (1 min)

1. **Connect USB cable** between ESP32 and computer
2. **Verify connection:**

```bash
# List connected devices
pio device list
```

**Expected output:**

```
/dev/ttyUSB0
------------
Hardware ID: USB VID:PID=10C4:EA60
Description: CP2102 USB to UART Bridge Controller
```

**Note your port:** (e.g., `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbserial-1420`)

---

## Step 7: Upload Firmware (2 min)

### VS Code

- Click **arrow icon** (→) in bottom toolbar
- Or press `Ctrl+Alt+U`

### Command Line

```bash
pio run -t upload
```

**Expected output:**

```
Configuring upload protocol...
AVAILABLE: esptool
CURRENT: upload_protocol = esptool
Looking for upload port...
Auto-detected: /dev/ttyUSB0
Uploading .pio/build/wheelie/firmware.bin
esptool.py v3.3
...
Wrote 559937 bytes (359215 compressed) at 0x00010000 in 31.9 seconds
Hash of data verified.

Leaving...
Hard resetting via RTS pin...
========================= [SUCCESS] Took 38.12 seconds =========================
```

✅ **Upload successful!**

⚠️ **If upload fails:**

```bash
# Try holding BOOT button during upload
# Or reduce upload speed
pio run -t upload --upload-port /dev/ttyUSB0 --upload-speed 115200
```

---

## Step 8: Open Serial Monitor (1 min)

### VS Code

- Click **plug icon** (🔌) in bottom toolbar
- Or press `Ctrl+Alt+S`

### Command Line

```bash
pio device monitor
```

**Expected output:**

```

╔═══════════════════════════════════════╗
║  🤖 EVOLVING SENTRY ROBOT SYSTEM 🧬  ║
║        WITH EMERGENT LANGUAGE 🗣️      ║
╚═══════════════════════════════════════╝

📖 Loading persistent memory...
Generation: 0
Fitness: 0.0

✅ Sensor initialized
✅ Motors initialized
✅ Communication system initialized (buzzer)

🗣️ Creating default vocabulary...
🆕 Created new communication signal!
  Context: 0 | Valence: -40 | Pattern length: 4
🆕 Created new communication signal!
  Context: 1 | Valence: 60 | Pattern length: 3
🆕 Created new communication signal!
  Context: 2 | Valence: -80 | Pattern length: 5
🆕 Created new communication signal!
  Context: 3 | Valence: 30 | Pattern length: 4
🆕 Created new communication signal!
  Context: 4 | Valence: 20 | Pattern length: 3

🧬 Current Evolution Status:
  Generation: 0
  Fitness Score: 0.00
  Strategies Learned: 0
  Vocabulary Size: 5

🗣️ Initializing communication protocol...
🧠 State: Frustration=0 Confidence=50 Curiosity=50
📡 SIGNAL: 1245Hz/180ms 1456Hz/210ms 1334Hz/190ms 

💡 Waiting for motion to begin evolution...
```

✅ **If you see this: SUCCESS!** 🎉

---

## Step 9: Test the Robot (5 min)

### Test 1: Wake Up

- Wave your hand above the robot
- **Expected:** Serial monitor shows "MOTION DETECTED! Waking up..."
- **Expected:** Robot LEDs light up
- **Expected:** Motors start running

### Test 2: Obstacle Detection

- Place your hand in front of the robot
- **Expected:** Robot stops
- **Expected:** Serial monitor shows "OBSTACLE DETECTED"
- **Expected:** Robot backs up and turns

### Test 3: Evolution

- Let robot run for 60 seconds
- **Expected:** Serial monitor shows "EVOLUTION CYCLE TRIGGERED"
- **Expected:** Parameters change
- **Expected:** Fitness score updates

---

## Step 10: Let It Evolve! 🧬

**Your robot is now autonomously evolving!**

```
✅ Place on floor in open area
✅ Let run for 1+ hours
✅ Observe behavior changes
✅ Watch Serial Monitor for evolution progress
✅ Note fitness improvements
✅ Document personality emergence
```

**Monitor evolution:**

```bash
# Keep serial monitor open
# Watch for:
# - Generation counter increasing
# - Fitness score improving
# - Vocabulary size growing
# - Behavior patterns changing
```

---

## Troubleshooting

### Issue: "Library not found"

```bash
# Solution 1: Force library install
pio lib install

# Solution 2: Clean and rebuild
pio run -t clean
pio run

# Solution 3: Delete cache
rm -rf .pio
pio run
```

### Issue: "Port not found"

```bash
# Windows: Install drivers
# CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
# CH340: http://www.wch.cn/downloads/CH341SER_ZIP.html

# Linux: Add user to dialout group
sudo usermod -a -G dialout $USER
# Logout and login again

# Mac: Install drivers from manufacturer
# Then: ls /dev/cu.*
```

### Issue: "Upload failed"

```bash
# Solution 1: Hold BOOT button during upload

# Solution 2: Reduce upload speed
# Edit platformio.ini:
upload_speed = 115200

# Solution 3: Specify port manually
# Edit platformio.ini:
upload_port = COM3  # Or /dev/ttyUSB0
```

### Issue: "VL53L0X not found"

```bash
# Check wiring:
# VCC → 3.3V (NOT 5V!)
# GND → GND
# SCL → GPIO 22
# SDA → GPIO 21

# Test I2C bus:
# Upload I2C scanner sketch
# Should find device at 0x29
```

### Issue: "Brownout detector triggered"

```bash
# Power issue - solutions:
# 1. Use fresh batteries
# 2. Add 470µF capacitor across battery terminals
# 3. Check buck converter output is 5.0V
# 4. Ensure star grounding is correct
```

### Issue: "Motors don't spin"

```bash
# Check:
# 1. Motor driver VM connected to battery+
# 2. Motor driver GND connected to star ground
# 3. GPIO pins connected correctly (26,25,32,33)
# 4. Motors spin freely by hand
# 5. Upload motor test sketch (see HARDWARE_GUIDE.md)
```

---

## Useful Commands

```bash
# Build project
pio run

# Upload firmware
pio run -t upload

# Open serial monitor
pio device monitor

# Build + Upload + Monitor (all in one)
pio run -t upload && pio device monitor

# Clean build files
pio run -t clean

# List connected devices
pio device list

# List installed libraries
pio lib list

# Update libraries
pio lib update

# Check for updates
pio upgrade

# Build with debug environment
pio run -e wheelie_debug

# Build for testing
pio run -e wheelie_test
```

---

## Next Steps

Once WHEELIE is running:

1. ✅ **Document Generation 0 parameters** (baseline)
2. ✅ **Let evolve for 50+ generations** (~1 hour)
3. ✅ **Record fitness progression**
4. ✅ **Observe vocabulary development**
5. ✅ **Note behavioral changes**
6. 🔜 **Build SPEEDY bot** (speed specialist)
7. 🔜 **Implement ESP-NOW swarm communication**
8. 🔜 **Add LLM strategic planning layer**

---

## Getting Help

**Documentation:**

- 📘 [HARDWARE_GUIDE.md](../../HARDWARE_GUIDE.md) - Build instructions
- 🏗️ [ARCHITECTURE.md](../../ARCHITECTURE.md) - System design
- 🧬 [EVOLUTION.md](../../EVOLUTION.md) - How evolution works
- 🗣️ [EMERGENT_LANGUAGE.md](../../EMERGENT_LANGUAGE.md) - Communication system

**Community:**

- 💬 GitHub Discussions
- 🎮 Discord server
- 🐦 Twitter: #ProjectJumbo

**Debugging:**

- Check serial monitor output
- Verify wiring with multimeter
- Test components individually
- Ask in community forums

---

## Success Checklist

- [ ] PlatformIO installed
- [ ] Project opens in VS Code
- [ ] Code compiles without errors
- [ ] ESP32 detected by computer
- [ ] Firmware uploads successfully
- [ ] Serial monitor shows boot sequence
- [ ] Motion sensor triggers wake-up
- [ ] VL53L0X detects obstacles
- [ ] Motors respond to obstacles
- [ ] LEDs show emotional states
- [ ] Buzzer emits signals
- [ ] Evolution cycles trigger every 60s
- [ ] Fitness score calculated
- [ ] Vocabulary grows over time
- [ ] Parameters mutate and adapt

**All checked?** 🎉 **CONGRATULATIONS! WHEELIE IS ALIVE!** 🤖🧬

---

*Last Updated: October 2025*  
*Project Jumbo Team*

*"From code to consciousness in 15 minutes."*

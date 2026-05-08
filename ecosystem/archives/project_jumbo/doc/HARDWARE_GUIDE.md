# 🔧 Hardware Build Guide

**Project Jumbo: Building Your Own Evolving Robot**

This comprehensive guide will walk you through building a fully autonomous, evolving robot from scratch. No prior robotics experience required—just patience, attention to detail, and a willingness to learn.

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Tools Required](#tools-required)
4. [Bill of Materials](#bill-of-materials)
5. [Component Selection Guide](#component-selection-guide)
6. [Assembly Instructions](#assembly-instructions)
7. [Wiring Guide](#wiring-guide)
8. [Testing & Validation](#testing--validation)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Modifications](#advanced-modifications)
11. [Safety Guidelines](#safety-guidelines)

---

## Introduction

### What You'll Build

By the end of this guide, you'll have constructed a **fully autonomous robot** capable of:

- ✅ Navigating obstacles independently
- ✅ Evolving its behavior through natural selection
- ✅ Developing its own communication language
- ✅ Learning from experience across power cycles
- ✅ Expressing emotions through light and sound

**Build time:** 4-6 hours (first time), 2-3 hours (experienced)  
**Skill level:** Beginner to Intermediate  
**Cost:** ~$50-60 USD per bot

### Two Bot Options

This guide covers building **WHEELIE** (the baseline scout). The concepts apply to all bots with minor variations:

```
WHEELIE (This Guide)          SPEEDY (Advanced)
┌──────────────────┐          ┌──────────────────┐
│ VL53L0X Laser    │          │ HC-SR04 Ultra    │
│ RCWL-0516 Radar  │          │ MPU-6050 IMU     │
│ Standard chassis │          │ Compact chassis  │
│ Buzzer included  │          │ No buzzer        │
│ ★★☆☆☆ Difficulty │          │ ★★★★☆ Difficulty │
└──────────────────┘          └──────────────────┘
```

---

## Prerequisites

### Skills Needed

**Essential:**

- ✅ Basic soldering (connecting wires to headers)
- ✅ Using a screwdriver
- ✅ Following wiring diagrams
- ✅ Installing software on your computer

**Helpful but not required:**

- 🔵 Reading electronics schematics
- 🔵 Using a multimeter
- 🔵 Debugging hardware issues

**Don't worry!** This guide assumes you're learning as you go.

### Knowledge Prerequisites

- Basic understanding of electricity (voltage, current, ground)
- Familiarity with Arduino/ESP32 (helpful but not required)
- Ability to read and follow instructions carefully

### Before You Start

**Read this entire guide once** before beginning. Understanding the full build process helps you:

- Order the right components
- Anticipate potential issues
- Plan your workspace
- Budget your time appropriately

---

## Tools Required

### Essential Tools

```
┌─────────────────────────────────────────────────────┐
│ MUST HAVE                                           │
├─────────────────────────────────────────────────────┤
│ ☑ Soldering iron (15-30W with fine tip)            │
│ ☑ Solder (60/40 or 63/37 rosin-core, 0.8mm)        │
│ ☑ Wire strippers (20-30 AWG)                        │
│ ☑ Small Phillips screwdriver (#1 or #0)            │
│ ☑ Small flat-head screwdriver                      │
│ ☑ Needle-nose pliers                                │
│ ☑ Wire cutters (flush-cut preferred)               │
│ ☑ USB Micro-B cable (for ESP32 programming)        │
│ ☑ Computer (Windows/Mac/Linux)                     │
│ ☑ Hot glue gun + glue sticks                       │
└─────────────────────────────────────────────────────┘
```

### Highly Recommended

```
┌─────────────────────────────────────────────────────┐
│ STRONGLY SUGGESTED                                  │
├─────────────────────────────────────────────────────┤
│ ☐ Digital multimeter (basic, $10-20)               │
│ ☐ Helping hands / PCB holder                       │
│ ☐ Solder wick or desoldering pump                  │
│ ☐ Isopropyl alcohol (90%+) for flux cleanup        │
│ ☐ Heat shrink tubing (various sizes)               │
│ ☐ Electrical tape                                  │
│ ☐ Small flashlight or headlamp                    │
│ ☐ Breadboard (for testing before soldering)       │
└─────────────────────────────────────────────────────┘
```

### Nice to Have

```
┌─────────────────────────────────────────────────────┐
│ OPTIONAL (but make life easier)                    │
├─────────────────────────────────────────────────────┤
│ ○ Magnifying glass / helping hands with magnifier │
│ ○ Soldering station with temperature control      │
│ ○ Third-hand tool with clips                      │
│ ○ Label maker or masking tape + marker            │
│ ○ Component organizer / small parts bins          │
│ ○ Anti-static wrist strap                         │
│ ○ Tweezers (fine point)                           │
│ ○ Portable power bank (for field testing)         │
└─────────────────────────────────────────────────────┘
```

---

## Bill of Materials

### Complete Parts List (WHEELIE)

**Total Cost: ~$50-60 USD**

| # | Component | Specifications | Qty | Unit Price | Total | Source |
|---|-----------|----------------|-----|------------|-------|--------|
| 1 | **ESP32 Dev Board** | ESP32-D0WD-V3, 38-pin | 1 | $8 | $8 | AliExpress, Amazon |
| 2 | **Motor Driver** | DRV8833 or TB6612 | 1 | $5 | $5 | Amazon, SparkFun |
| 3 | **TT Gear Motors** | 3-6V DC, 1:48 ratio | 2 | $5 | $10 | AliExpress, Pololu |
| 4 | **VL53L0X Sensor** | I2C ToF laser sensor | 1 | $8 | $8 | Adafruit, Amazon |
| 5 | **RCWL-0516** | Microwave motion sensor | 1 | $3 | $3 | Amazon, eBay |
| 6 | **NeoPixel LEDs** | WS2812B, individual | 2 | $1.50 | $3 | Adafruit, AliExpress |
| 7 | **Battery Holder** | 4xAA with wires | 1 | $8 | $8 | Amazon, SparkFun |
| 8 | **Buck Converter** | LM2596 or similar | 1 | $3 | $3 | Amazon, AliExpress |
| 9 | **Power Switch** | DPDT 6-pin rocker | 1 | $2 | $2 | Amazon, Digi-Key |
| 10 | **Passive Buzzer** | 5V, with driver | 1 | $2 | $2 | Amazon, SparkFun |
| 11 | **2WD Chassis Kit** | With wheels, caster | 1 | $8 | $8 | Amazon, AliExpress |
| 12 | **Jumper Wires** | 22AWG, M-M, M-F | 40 | - | $5 | Amazon (pack) |
| 13 | **Headers** | 2.54mm pitch | - | - | (included) | With ESP32 |
| 14 | **Resistors** | 220Ω (for LEDs) | 6 | - | $1 | Amazon (pack) |
| 15 | **AA Batteries** | Alkaline or NiMH | 4 | $1 | $4 | Anywhere |
| | | | | **TOTAL** | **~$60** | |

### Optional Accessories

| Component | Purpose | Cost |
|-----------|---------|------|
| **Breadboard** | Testing circuits before soldering | $5 |
| **USB Power Bank** | Field testing without batteries | $10 |
| **3D Printed Mounts** | Custom sensor brackets | $3 (filament) |
| **Velcro Straps** | Cable management | $3 |
| **Project Box** | ESP32 enclosure | $5 |

---

## Component Selection Guide

### ESP32 Dev Board

**What to look for:**

```
✅ ESP32-WROOM-32 or ESP32-D0WD-V3
✅ 38-pin breakout (most common)
✅ Built-in USB-to-serial (CP2102 or CH340)
✅ Reset + Boot buttons
✅ 3.3V regulator onboard
✅ VIN pin (accepts 5V input)
```

**Avoid:**

- ❌ ESP32-CAM (wrong form factor, no GPIO breakout)
- ❌ Bare ESP32 modules without breakout board
- ❌ Boards without USB programming interface

**Recommended brands:**

- DOIT DevKit V1 (most common)
- Espressif official boards
- HiLetgo ESP32 Dev Board

### Motor Driver

**Two good options:**

#### Option 1: DRV8833 (Recommended)

```
✅ Dual H-bridge
✅ 2A per channel
✅ 2.7V-10.8V input
✅ Built-in protection
✅ PWM control
✅ Smaller footprint
```

#### Option 2: TB6612FNG

```
✅ Dual H-bridge
✅ 1.2A per channel (sufficient)
✅ 4.5V-13.5V input
✅ Standby pin
✅ PWM control
✅ Widely available
```

**Avoid:**

- ❌ L298N (inefficient, bulky, gets hot)
- ❌ Single-channel drivers
- ❌ Drivers without PWM support

### Motors

**TT Gear Motors - specifications:**

```
Voltage: 3V-6V DC
Gear ratio: 1:48 (good speed/torque balance)
Speed: ~200 RPM at 6V
Stall current: ~250mA
Shaft: 3mm D-shaft or round
Includes: Mounting bracket, wire leads
```

**Quality check:**

- Spin freely when powered
- No grinding or catching
- Wires securely attached
- Gears mesh smoothly

### VL53L0X Laser Sensor

**Specifications:**

```
Protocol: I2C
Range: 30mm - 2000mm
Accuracy: ±3mm
Field of view: 25°
Update rate: Up to 50Hz
Voltage: 2.8V-3.3V (needs level shifting or 3.3V supply)
```

**Important:** Get the **breakout board** version with onboard regulator!

**Recommended:**

- Adafruit VL53L0X (best quality, documentation)
- GY-VL53L0XV2 module (budget option)

### RCWL-0516 Motion Sensor

**Specifications:**

```
Detection: Microwave radar (Doppler effect)
Range: ~7 meters
Detection angle: 360° (omnidirectional)
Voltage: 4V-28V
Output: Digital HIGH when motion detected
Trigger: 2-3 seconds duration
```

**Advantages over PIR:**

- ✅ Works through plastic/thin walls
- ✅ No false triggers from temperature changes
- ✅ Wider detection range
- ✅ Faster response time

### NeoPixel (WS2812B) LEDs

**Individual LED specifications:**

```
Type: WS2812B (integrated driver)
Voltage: 5V DC
Protocol: One-wire serial
Brightness: Adjustable in code
Colors: 16.7 million (24-bit RGB)
Form factor: 5050 SMD package
```

**Get the "individual" LEDs, not strips!**

**Wiring:**

- VCC → 5V
- GND → GND
- DIN → GPIO pin
- DOUT → (unused for single LED)

### Buck Converter

**LM2596 specifications:**

```
Input: 4.5V-40V DC
Output: 1.25V-37V DC (adjustable)
Efficiency: ~92%
Current: Up to 3A
Includes: Potentiometer for voltage adjustment
Size: ~43mm × 21mm
```

**Pre-purchase setup:**

1. Adjust output to 5.0V using multimeter
2. Test under load (power something)
3. Verify stable output

### Power Switch

**DPDT 6-pin rocker switch:**

```
Configuration: DPDT (Double Pole Double Throw)
Pins: 6 (2 inputs, 4 outputs)
Rating: 3A @ 250V AC or 6A @ 125V AC (overkill for our 6V)
Mounting: Panel mount, snap-in
```

**Why DPDT?**

- Switch **both** positive and negative rails
- Prevents parasitic draw
- Cleaner power isolation

---

## Assembly Instructions

### Step-by-Step Build Process

**Estimated time:** 4-6 hours (first build)

```
Assembly Overview:
┌─────────────────────────────────────────────┐
│ Phase 1: Preparation (30 min)              │
│ Phase 2: Chassis Assembly (45 min)         │
│ Phase 3: Power System (60 min)             │
│ Phase 4: ESP32 & Motor Driver (45 min)     │
│ Phase 5: Sensors (60 min)                  │
│ Phase 6: Final Assembly (60 min)           │
│ Phase 7: Testing (30 min)                  │
└─────────────────────────────────────────────┘
```

---

### Phase 1: Preparation (30 min)

#### 1.1: Organize Your Workspace

```
Workspace Layout:
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Soldering Station]    [Computer]              │
│                                                  │
│  [Parts Bins]           [Assembly Area]         │
│                         (clean, flat surface)   │
│                                                  │
│  [Tools]                [Testing Area]          │
│                         (powered breadboard)    │
└──────────────────────────────────────────────────┘
```

**Checklist:**

- [ ] Clear, clean work surface
- [ ] Good lighting
- [ ] Ventilation (for soldering)
- [ ] All components present (check BOM)
- [ ] All tools within reach
- [ ] Fire extinguisher nearby (seriously!)

#### 1.2: Component Inspection

**Check each component:**

```
ESP32:        [ ] Pins straight [ ] No bent pins [ ] USB port clean
Motor Driver: [ ] Chips present [ ] No burn marks [ ] Pins intact
Motors:       [ ] Spin freely [ ] Wires attached [ ] Gears smooth
VL53L0X:      [ ] Lens clean [ ] Pins straight [ ] Module flat
RCWL-0516:    [ ] No cracks [ ] Components present [ ] Pins intact
NeoPixels:    [ ] LEDs visible [ ] Pins clean [ ] No damage
Buck Conv.:   [ ] Pot turns [ ] No shorts [ ] Heatsink present
Switch:       [ ] Clicks firmly [ ] All pins present [ ] Mounts secure
Buzzer:       [ ] Grill intact [ ] Pins clean [ ] Polarity marked
Chassis:      [ ] Complete [ ] Hardware included [ ] Wheels turn
```

**If ANY component fails inspection:** Don't use it! Contact supplier for replacement.

#### 1.3: Pre-Solder Preparation

**Components needing headers/wires:**

| Component | Action |
|-----------|--------|
| ESP32 | Solder header pins (if not pre-soldered) |
| Motor Driver | Solder header pins or wires (see below) |
| VL53L0X | Solder header pins (straight, not angled) |
| RCWL-0516 | Solder header pins or direct wires |
| NeoPixels | Solder 3-4" wire leads (AWG 22-24) |
| Buzzer | Solder wire leads if no connector |

**Soldering tips:**

1. Heat pad + pin together (3-5 seconds)
2. Apply solder to joint (not iron tip)
3. Remove solder, then iron
4. Joint should be shiny, cone-shaped
5. Let cool naturally (don't blow on it)

---

### Phase 2: Chassis Assembly (45 min)

#### 2.1: Chassis Base Construction

**2WD Robot Chassis typical contents:**

```
Parts:
┌────────────────────────────────────┐
│ • Chassis plate (acrylic/plastic)  │
│ • 2× TT motor mounts                │
│ • 2× TT motors                      │
│ • 2× Wheels (press-fit)             │
│ • 1× Ball caster assembly           │
│ • Screws/nuts/standoffs             │
│ • Battery holder (sometimes)        │
└────────────────────────────────────┘
```

**Assembly steps:**

```
Step 1: Mount Motors
┌────────────────────────────────────────┐
│     [Motor]    [Chassis]    [Motor]    │
│        │          │            │        │
│    ┌───┴───┐  ┌───┴───┐  ┌───┴───┐    │
│    │ Mount │──│ Plate │──│ Mount │    │
│    └───────┘  └───────┘  └───────┘    │
│                                        │
│ Use: 4× M3 screws per motor           │
│ Ensure: Motor shafts parallel to      │
│         chassis bottom                 │
└────────────────────────────────────────┘

Step 2: Install Ball Caster
┌────────────────────────────────────────┐
│  Front of chassis (opposite motors)    │
│                                        │
│         ┌─────────┐                    │
│         │ [Caster]│                    │
│         └────┬────┘                    │
│              │                         │
│      ┌───────┴───────┐                │
│      │ [Chassis]     │                │
│      └───────────────┘                │
│                                        │
│ Use: Included mounting hardware        │
│ Height: Adjust so chassis is level    │
│        when wheels installed           │
└────────────────────────────────────────┘

Step 3: Attach Wheels
┌────────────────────────────────────────┐
│  Press wheels onto motor shafts        │
│                                        │
│    [Wheel]                  [Wheel]    │
│       ║                        ║       │
│    ═══╬═══                  ═══╬═══    │
│    [Motor]                  [Motor]    │
│                                        │
│ Ensure: Wheels press-fit securely     │
│         Same depth on both sides       │
│         No wobble when spinning        │
└────────────────────────────────────────┘
```

**Critical alignment check:**

```
Side View:
           ┌────── Must be level ──────┐
           │                           │
    [Wheel]│     [Chassis]      [Wheel]│
       ╱   │         │             ╱   │
      ◯────┴─────────┴────────────◯────┘
                     │
                 [Caster]

If not level: Adjust caster height or motor mounting
```

#### 2.2: Battery Holder Mounting

**Option A: Underneath chassis (recommended)**

```
Bottom View:
┌─────────────────────────────────────┐
│                                     │
│   [Motor]         [Motor]           │
│                                     │
│          [Battery Holder]           │
│          ┌─────────────┐            │
│          │ ╔═══════╗   │            │
│          │ ║ 4×AA  ║   │            │
│          │ ╚═══════╝   │            │
│          └─────────────┘            │
│                                     │
│            [Caster]                 │
└─────────────────────────────────────┘

Mounting: Double-sided foam tape or zip ties
Ensures: Low center of gravity, stable
```

**Option B: Top mount**

- Easier battery changes
- Higher center of gravity (less stable)
- Use velcro straps for quick removal

---

### Phase 3: Power System (60 min)

**⚠️ CRITICAL SECTION ⚠️**  
**Mistakes here can damage components or cause fire. Read carefully!**

#### 3.1: Understanding the Power Distribution

```
Power Flow Diagram:
┌──────────────┐
│  4×AA (6V)   │
│   Battery    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ DPDT Switch  │ ← Master ON/OFF
└──────┬───────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
  ┌─────────┐      ┌─────────┐      ┌─────────┐
  │  Buck   │      │ Motor   │      │  ⭐ STAR │
  │ Conv.   │      │ Driver  │      │  GROUND │
  │ 6V→5V   │      │  (VM)   │      │  POINT  │
  └────┬────┘      └─────────┘      └────┬────┘
       │                 │                │
       ▼                 ▼                │
  ┌─────────┐      ┌─────────┐           │
  │  ESP32  │      │ Motors  │           │
  │  (VIN)  │      │ (Power) │           │
  └─────────┘      └─────────┘           │
       │                 │                │
       └─────────────────┴────────────────┘
            All grounds connect to ⭐
```

**Why this topology?**

1. **Isolated power domains:** Logic (ESP32) separate from motors
2. **Star grounding:** Prevents ground loops and motor noise
3. **Clean switching:** DPDT switches both rails

#### 3.2: DPDT Switch Wiring

**⚠️ THIS IS THE MOST CRITICAL STEP ⚠️**

```
DPDT Switch Pin Layout (view from terminals):
┌────────────────────────────────┐
│                                │
│   1 ○     3 ○     5 ○          │  ← Output Row 1
│           ▲                    │
│   2 ○     4 ○     6 ○          │  ← Output Row 2
│     ▲           ▲              │
└────────────────────────────────┘
     │           │
   Input 1    Input 2
```

**Wiring configuration:**

```
Connections:
Pin 1: Battery POSITIVE (+)
Pin 2: Battery NEGATIVE (-)

Pin 3: Buck Converter VIN+ 
Pin 4: Buck Converter VIN-

Pin 5: Motor Driver VM
Pin 6: ⭐ STAR GROUND POINT

When switch is ON:
  1→3: Battery + → Buck Converter +
  2→4: Battery - → Buck Converter -
  1→5: Battery + → Motor Driver VM
  2→6: Battery - → Star Ground
```

**Step-by-step soldering:**

1. **Strip wire ends:** 5mm of bare wire
2. **Tin the wires:** Apply solder to bare wire
3. **Tin the switch pins:** Light coat of solder
4. **Heat pin + wire:** 3-5 seconds
5. **Apply to joint:** Should flow instantly
6. **Inspect:** Shiny, cone-shaped, no cold solder joints

**Strain relief:**

- Hot glue wires near switch body
- Leave 1cm of slack before glue
- Don't glue the pins themselves

#### 3.3: Buck Converter Setup

**⚠️ MUST BE DONE BEFORE CONNECTING TO ESP32! ⚠️**

```
Setup Procedure:
┌───────────────────────────────────────┐
│ 1. Connect 6V input (battery or PSU) │
│    DO NOT connect output yet!        │
│                                       │
│ 2. Measure output with multimeter    │
│    • Red probe → VOUT+                │
│    • Black probe → VOUT-              │
│                                       │
│ 3. Adjust potentiometer              │
│    • Clockwise = increase voltage    │
│    • Counterclockwise = decrease     │
│                                       │
│ 4. Target: 5.0V ± 0.1V               │
│    (4.9V-5.1V is acceptable)         │
│                                       │
│ 5. Disconnect input, verify stable   │
│    Reconnect, measure again          │
│    Should still be 5.0V              │
└───────────────────────────────────────┘
```

**Common mistake:** Connecting output before adjusting voltage!

- **Result:** ESP32 damaged by overvoltage (7-8V is common default)

**Adjustment tips:**

- Very small turns (1/8 rotation at a time)
- Wait 2-3 seconds for voltage to stabilize
- Measure multiple times to confirm

#### 3.4: Star Ground Implementation

**What is star grounding?**

```
BAD (Ground Loop):
Motor GND ──┬── ESP32 GND
            │
Motor Driver GND ── Buck GND
            │
        Battery -

  ↑ Ground currents interfere with each other!
  ↑ Motor noise corrupts sensor readings!


GOOD (Star Ground):
            ⭐ STAR POINT (Battery -)
             ╱│╲
            ╱ │ ╲
           ╱  │  ╲
          ╱   │   ╲
         ╱    │    ╲
  Motor  Buck  ESP32  Sensors
   GND   GND   GND     GND

  ↑ All grounds meet at ONE point only
  ↑ No ground loops = no noise
```

**Implementation:**

1. **Identify star point:** Battery negative terminal
2. **Run separate wires:** Each subsystem gets its own ground wire to star
3. **No daisy-chaining:** Grounds must not connect to each other, only to star
4. **Wire gauge:** 22 AWG minimum for motor grounds, 24-26 AWG for logic

**Physical layout:**

```
Use a terminal block or solder junction at battery negative:
┌────────────────────────────────────┐
│  [Battery -] ← Star Ground Point   │
│      ║                              │
│  Terminal Block or Solder Junction │
│      ║                              │
│  ╔═══╬═══╬═══╬═══╬═══╬═══╗         │
│  ║   ║   ║   ║   ║   ║   ║         │
│  ║   ║   ║   ║   ║   ║   ║         │
│  1   2   3   4   5   6   7         │
│  │   │   │   │   │   │   │         │
│  │   │   │   │   │   │   └─> Buzzer GND
│  │   │   │   │   │   └─────> NeoPixel GND (both)
│  │   │   │   │   └─────────> VL53L0X GND
│  │   │   │   └─────────────> RCWL GND
│  │   │   └─────────────────> ESP32 GND
│  │   └─────────────────────> Motor Driver GND
│  └─────────────────────────> Buck Converter GND
└────────────────────────────────────┘
```

---

### Phase 4: ESP32 & Motor Driver (45 min)

#### 4.1: ESP32 Mounting

**Mounting options:**

**Option A: Standoffs (recommended)**

```
Top View:
┌───────────────────────────────┐
│  ○                         ○  │ ← Standoffs (M3, 10mm)
│                               │
│        [ESP32 Board]          │
│  ╔═══════════════════════╗    │
│  ║  [USB]            [ANT]║   │
│  ╚═══════════════════════╝    │
│                               │
│  ○                         ○  │ ← Secure to chassis
└───────────────────────────────┘

Advantages:
  ✅ Secure
  ✅ Professional
  ✅ Good airflow
  ✅ Easy to remove
```

**Option B: Double-sided foam tape**

```
Advantages:
  ✅ Quick
  ✅ No drilling
  ✅ Vibration dampening

Disadvantages:
  ⚠️ Hard to remove
  ⚠️ Can come loose
```

**Mounting location:**

- **Top of chassis** (preferred): Easy access to USB port
- **Between wheels**: Lower center of gravity, harder to program

#### 4.2: Motor Driver Placement

**Placement considerations:**

```
Ideal Location: Close to motors, close to ESP32
┌──────────────────────────────────────┐
│                                      │
│  [ESP32]                             │
│     ↓ (short wires)                  │
│  [Motor Driver]                      │
│     ↓ (short wires)                  │
│  [Motor]         [Motor]             │
│                                      │
└──────────────────────────────────────┘

Why?
- Shorter motor wires = less noise
- Shorter logic wires = more reliable
- Compact design
```

**Secure motor driver:**

- Double-sided foam tape (easy)
- Hot glue corners (permanent)
- Standoffs (professional)

#### 4.3: Motor Driver to Motors Wiring

**⚠️ Polarity matters!** (for direction consistency)

```
Motor Driver Outputs:
┌────────────────────┐
│ DRV8833 or TB6612  │
│                    │
│ A1  A2    B1  B2   │
│  ↓   ↓     ↓   ↓   │
└──┼───┼─────┼───┼───┘
   │   │     │   │
   └─Left──┘ └─Right─┘
     Motor     Motor
```

**Wire connections:**

| Motor Driver Pin | Connection | Wire Color (if marked) |
|-----------------|------------|------------------------|
| AOUT1 (A1) | Left Motor Wire 1 | Red (usually) |
| AOUT2 (A2) | Left Motor Wire 2 | Black (usually) |
| BOUT1 (B1) | Right Motor Wire 1 | Red (usually) |
| BOUT2 (B2) | Right Motor Wire 2 | Black (usually) |

**Testing polarity:**

```cpp
// Later in code, both motors should spin same direction:
// Forward: Both spin to move bot forward
// If one spins backward, swap its two wires
```

**Strain relief:** Hot glue where wires attach to motor driver.

#### 4.4: ESP32 to Motor Driver Wiring

**Pin connections:**

| ESP32 GPIO | Motor Driver Pin | Function |
|-----------|-----------------|----------|
| GPIO 26 | AIN1 | Left Motor PWM 1 |
| GPIO 25 | AIN2 | Left Motor PWM 2 |
| GPIO 32 | BIN1 | Right Motor PWM 1 |
| GPIO 33 | BIN2 | Right Motor PWM 2 |
| GND | GND | ⭐ To Star Ground |
| (none) | VM | Connect to battery+ via switch |

**Use color-coded jumper wires:**

```
Suggested color scheme:
GPIO 26 → AIN1: Yellow
GPIO 25 → AIN2: Orange
GPIO 32 → BIN1: Green
GPIO 33 → BIN2: Blue
GND: Black (always!)
```

**Wire routing:**

- Keep wires as short as practical
- Avoid running parallel to motor wires (noise)
- Bundle with zip ties or tape
- Label with masking tape if needed

---

### Phase 5: Sensors (60 min)

#### 5.1: VL53L0X Laser Sensor

**Mounting location:**

```
Front of Robot (optimal):
     ┌─────────────┐
     │  [VL53L0X]  │ ← Facing forward
     │     ║║      │
     └─────╨╨──────┘
         Chassis
```

**Why front center?**

- Sees obstacles directly ahead
- 25° field of view covers forward path
- Easy to interpret readings

**Mounting methods:**

**Option A: 3D printed bracket** (best)

```
Side view:
     [Sensor]
        │
    ┌───┴───┐
    │Bracket│
    └───┬───┘
        │
    [Chassis]
```

**Option B: Hot glue** (quick)

- Apply to sensor edges only (not lens!)
- Ensure level and straight

**Option C: Double-sided tape** (temporary)

- For initial testing
- Replace with permanent mount later

**Wiring:**

| VL53L0X Pin | ESP32 Pin | Wire Color |
|-------------|-----------|------------|
| VCC | 3.3V | Red |
| GND | GND (⭐star) | Black |
| SCL | GPIO 22 | Yellow |
| SDA | GPIO 21 | Green |

**⚠️ CRITICAL:** VL53L0X is 3.3V only!

- Use 3.3V power pin, NOT 5V
- GPIO 21/22 are 3.3V safe on ESP32

**I2C pull-ups:**

- Usually included on breakout board
- If not: Add 4.7kΩ resistors from SCL/SDA to 3.3V

**Wire length:**

- Keep under 15cm for I2C reliability
- Twist SCL and SDA together to reduce interference

#### 5.2: RCWL-0516 Motion Sensor

**Mounting location:**

```
Top of Chassis (best):
┌─────────────────────────┐
│                         │
│     [RCWL-0516]         │ ← Facing up/outward
│    (Components Up)      │
│                         │
│      [ESP32 below]      │
│                         │
└─────────────────────────┘
```

**Why top mount?**

- 360° detection not blocked by chassis
- Detects motion around entire robot
- Easy to access

**Orientation:**

- Component side UP (away from chassis)
- Flat against mounting surface

**Wiring:**

| RCWL-0516 Pin | ESP32 Pin | Wire Color |
|---------------|-----------|------------|
| VIN | 5V (from buck) | Red |
| GND | GND (⭐star) | Black |
| OUT | GPIO 27 | Purple/White |
| CDS | (leave unconnected) | - |

**Note:** Some RCWL modules have 3 pins, some have 4. The 4th (CDS) is for light sensing—ignore it.

**Sensitivity adjustment:**

- Some modules have a potentiometer
- Turn clockwise = more sensitive
- Start at mid-position, adjust if needed

#### 5.3: NeoPixel RGB LEDs

**LED placement:**

```
Front of Robot (recommended):
┌─────────────────────────────┐
│                             │
│  ◉               ◉          │ ← NeoPixels
│ Left            Right       │
│  LED             LED        │
│                             │
│       [Chassis]             │
└─────────────────────────────┘

Visible from front and sides
```

**Each NeoPixel has 4 pins:**

```
NeoPixel Pinout:
┌────────────┐
│   [LED]    │
│            │
│ VCC GND    │
│ DIN DOUT   │
└─┬───┬──────┘
  │   │
  │   └─── Not used (single LED)
  └─────── Data input
```

**Wiring (LEFT LED):**

| NeoPixel Pin | Connection | Wire Color |
|--------------|------------|------------|
| VCC | 5V (from buck) | Red |
| GND | GND (⭐star) | Black |
| DIN | GPIO 4 | Yellow |
| DOUT | (not connected) | - |

**Wiring (RIGHT LED):**

| NeoPixel Pin | Connection | Wire Color |
|--------------|------------|------------|
| VCC | 5V (from buck) | Red |
| GND | GND (⭐star) | Black |
| DIN | GPIO 15 | Orange |
| DOUT | (not connected) | - |

**⚠️ Important notes:**

1. **Power:** NeoPixels need 5V, not 3.3V
2. **Data signal:** 3.3V from ESP32 GPIO works fine (threshold is ~2.7V)
3. **Capacitor:** Technically should add 100-1000µF cap across VCC/GND, but works without for 1-2 LEDs
4. **Resistor:** Can add 220-470Ω resistor in series with DIN for protection (optional)

**Mounting:**

- Hot glue to chassis (LED facing outward)
- Clear LED lens should be visible
- Avoid covering LED with glue

#### 5.4: Passive Buzzer

**Mounting location:**

```
Underside of Chassis (good):
┌─────────────────────────┐
│                         │
│  [Top Components]       │
│                         │
└────────┬────────────────┘
         │ Chassis
         │
      [Buzzer] ← Facing down

Sound escapes underneath, not blocked
```

**Alternative: Top mount**

- Louder for humans
- Takes up valuable top space

**Wiring:**

| Buzzer Pin | Connection | Wire Color |
|------------|------------|------------|
| + (positive) | GPIO 13 | Purple |
| - (negative) | GND (⭐star) | Black |

**⚠️ Polarity matters!** Passive buzzers have polarity:

- Look for + marking on buzzer
- Usually red wire = positive, black = negative
- Reversing won't damage it, but won't make sound

**Optional: Transistor driver**

```
If buzzer is too quiet, add NPN transistor:
GPIO 13 ──[1kΩ]──┬─ NPN Base
                 │
              Buzzer+
                 │
              Buzzer-
                 │
               GND

This amplifies signal for louder sound.
```

---

### Phase 6: Final Assembly (60 min)

#### 6.1: Cable Management

**Why it matters:**

- Prevents shorts
- Avoids wheels snagging wires
- Looks professional
- Makes troubleshooting easier

**Techniques:**

**1. Wire bundling:**

```
Use zip ties or velcro straps:
┌────────────────────────┐
│  ═══Bundled Wires═══   │ ← Zip tie here
│         ║              │
│         ║              │ ← And here
│      Components        │
└────────────────────────┘
```

**2. Wire routing:**

```
Good:                    Bad:
┌──────────────┐        ┌──────────────┐
│ Wire follows │        │ Wire crosses │
│ chassis edge │        │ open space   │
│      ═══╗    │        │    ╔═══╗     │
│         ║    │        │    ║   ║     │
│      ═══╝    │        │    ╚═══╝     │
└──────────────┘        └──────────────┘
  ✅ Clean              ❌ Snagging risk
```

**3. Labeling:**

```
Label wires at both ends:
[ESP32 GPIO4] ════ [Left LED DIN]

Use:
- Masking tape + marker
- Label maker
- Heat shrink + permanent marker
```

#### 6.2: Structural Reinforcement

**Critical connections to secure:**

1. **Motor wires to driver:** Hot glue strain relief
2. **Power switch:** Glue wires near switch body
3. **Sensor modules:** Ensure firmly mounted
4. **Battery holder:** Double-check mounting

**Test before final assembly:**

- Shake chassis gently
- All components should be firm
- No rattling or loose parts

#### 6.3: Access Considerations

**Things you'll need to access:**

| Component | Frequency | Solution |
|-----------|-----------|----------|
| USB port (ESP32) | Very often | Keep clear, top-mounted |
| Power switch | Often | Accessible from side |
| Batteries | Moderate | Tool-free access |
| Buck converter pot | Rare | Can be buried |
| Sensors | Rare | Can be permanent |

**Common mistake:** Mounting ESP32 with USB port against chassis!

#### 6.4: Final Visual Inspection

**Checklist:**

```
POWER SYSTEM:
[ ] Buck converter set to 5.0V (measured with multimeter)
[ ] DPDT switch wired correctly (Pin 1 = Battery+)
[ ] Star ground established at battery-
[ ] All grounds terminate at star point
[ ] No power wires crossing motor wires

ESP32 & MOTOR DRIVER:
[ ] ESP32 USB port accessible
[ ] Motor driver pins correct (see wiring diagram)
[ ] All GPIO connections verified
[ ] No bent pins on ESP32

SENSORS:
[ ] VL53L0X facing forward, level
[ ] RCWL-0516 facing up/out
[ ] NeoPixels visible from front
[ ] Buzzer not blocked

MOTORS:
[ ] Motor wires strain-relieved
[ ] Wheels spin freely
[ ] Chassis level when on flat surface
[ ] Caster ball moves smoothly

GENERAL:
[ ] No exposed wire ends
[ ] No shorts visible
[ ] All screws tight
[ ] Cable management complete
[ ] Labels applied (if used)
```

---

### Phase 7: Testing (30 min)

**⚠️ DO NOT SKIP TESTING!**

Testing in this order prevents damage:

#### 7.1: Power System Test (CRITICAL)

**Test 1: Voltage verification**

```
Setup:
1. Insert batteries (or connect 6V power supply)
2. Switch OFF
3. Multimeter in DC voltage mode

Measure:
Location                Expected    Your Reading
─────────────────────────────────────────────────
Battery terminals       6.0V ±0.5V  __________
Buck output (off)       0.0V        __________
Switch ON:
Buck output             5.0V ±0.1V  __________
ESP32 VIN pin           5.0V ±0.1V  __________
ESP32 3.3V pin          3.3V ±0.1V  __________
Motor driver VM         6.0V ±0.5V  __________

✅ All readings good? Proceed.
❌ Any reading wrong? FIX BEFORE CONTINUING.
```

**Test 2: Current draw (idle)**

```
Setup:
1. Multimeter in series with battery+ (10A mode)
2. Switch ON
3. No motors running

Expected: <100mA (ESP32 boot + sensors)
Your reading: __________

⚠️ If >200mA idle: Something is shorted!
```

**Test 3: Short circuit check**

```
Setup:
1. Switch OFF
2. Multimeter in continuity/resistance mode

Measure (all should be >1MΩ):
Battery+ to chassis: __________
Battery- to chassis: __________  
5V rail to GND: __________

🔊 If continuity beeps: SHORT! Find and fix it!
```

#### 7.2: ESP32 Programming Test

**Test 1: USB connection**

```
1. Connect ESP32 to computer via USB
2. Open Arduino IDE (or PlatformIO)
3. Select board: "ESP32 Dev Module"
4. Select port: (should auto-detect)
5. Upload "Blink" example

Expected: Built-in LED blinks
Result: __________

⚠️ If upload fails:
  - Check USB cable (some are power-only!)
  - Install CP2102 or CH340 drivers
  - Press and hold BOOT button during upload
```

**Test 2: GPIO control**

```cpp
// Test GPIO pins are working
void setup() {
  pinMode(26, OUTPUT);  // Left motor pin
  pinMode(25, OUTPUT);
  pinMode(32, OUTPUT);  // Right motor pin
  pinMode(33, OUTPUT);
  pinMode(4, OUTPUT);   // Left LED
  pinMode(15, OUTPUT);  // Right LED
  pinMode(13, OUTPUT);  // Buzzer
  pinMode(27, INPUT);   // Motion sensor
}

void loop() {
  // Cycle through each GPIO
  digitalWrite(26, HIGH);
  delay(500);
  digitalWrite(26, LOW);
  
  digitalWrite(25, HIGH);
  delay(500);
  digitalWrite(25, LOW);
  
  // ... etc for each pin
  
  // Check motion sensor
  Serial.println(digitalRead(27));
  delay(1000);
}

✅ Each GPIO should show activity
❌ If pin doesn't work: Check wiring to that pin
```

#### 7.3: Sensor Tests

**Test 1: VL53L0X Laser**

```cpp
#include "Adafruit_VL53L0X.h"

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  if (!lox.begin()) {
    Serial.println("❌ VL53L0X not found!");
    while(1);
  }
  Serial.println("✅ VL53L0X initialized");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measure;
  lox.rangingTest(&measure, false);
  
  if (measure.RangeStatus != 4) {
    Serial.print("Distance: ");
    Serial.print(measure.RangeMilliMeter);
    Serial.println(" mm");
  } else {
    Serial.println("Out of range");
  }
  delay(100);
}

Expected: Distance readings change when you wave hand
Result: __________
```

**Test 2: RCWL-0516 Motion**

```cpp
void setup() {
  Serial.begin(115200);
  pinMode(27, INPUT);
}

void loop() {
  int motion = digitalRead(27);
  Serial.print("Motion: ");
  Serial.println(motion ? "DETECTED" : "None");
  delay(100);
}

Expected: Prints "DETECTED" when you move near robot
Result: __________
```

**Test 3: NeoPixels**

```cpp
#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel left_led(1, 4, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel right_led(1, 15, NEO_GRB + NEO_KHZ800);

void setup() {
  left_led.begin();
  right_led.begin();
}

void loop() {
  // Red
  left_led.setPixelColor(0, left_led.Color(50, 0, 0));
  right_led.setPixelColor(0, right_led.Color(50, 0, 0));
  left_led.show();
  right_led.show();
  delay(1000);
  
  // Green
  left_led.setPixelColor(0, left_led.Color(0, 50, 0));
  right_led.setPixelColor(0, right_led.Color(0, 50, 0));
  left_led.show();
  right_led.show();
  delay(1000);
  
  // Blue
  left_led.setPixelColor(0, left_led.Color(0, 0, 50));
  right_led.setPixelColor(0, right_led.Color(0, 0, 50));
  left_led.show();
  right_led.show();
  delay(1000);
}

Expected: LEDs cycle Red → Green → Blue
Result: __________
```

**Test 4: Buzzer**

```cpp
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  // Play ascending tones
  for (int freq = 500; freq <= 2000; freq += 100) {
    tone(13, freq, 200);
    delay(250);
    noTone(13);
    delay(50);
  }
  delay(1000);
}

Expected: Ascending beep sequence
Result: __________
```

#### 7.4: Motor Tests

**⚠️ IMPORTANT: Remove wheels or elevate robot for motor tests!**

**Test 1: Individual motor control**

```cpp
void setup() {
  pinMode(26, OUTPUT);
  pinMode(25, OUTPUT);
  pinMode(32, OUTPUT);
  pinMode(33, OUTPUT);
  
  // Setup PWM channels
  ledcSetup(0, 5000, 8);
  ledcSetup(1, 5000, 8);
  ledcSetup(2, 5000, 8);
  ledcSetup(3, 5000, 8);
  
  ledcAttachPin(26, 0);
  ledcAttachPin(25, 1);
  ledcAttachPin(32, 2);
  ledcAttachPin(33, 3);
}

void loop() {
  // Test left motor forward
  Serial.println("Left motor forward");
  ledcWrite(0, 200);  // GPIO 26
  ledcWrite(1, 0);    // GPIO 25
  delay(2000);
  
  // Stop
  ledcWrite(0, 0);
  ledcWrite(1, 0);
  delay(1000);
  
  // Test left motor backward
  Serial.println("Left motor backward");
  ledcWrite(0, 0);
  ledcWrite(1, 200);
  delay(2000);
  
  // Stop
  ledcWrite(0, 0);
  ledcWrite(1, 0);
  delay(1000);
  
  // Test right motor forward
  Serial.println("Right motor forward");
  ledcWrite(2, 200);  // GPIO 32
  ledcWrite(3, 0);    // GPIO 33
  delay(2000);
  
  // Stop
  ledcWrite(2, 0);
  ledcWrite(3, 0);
  delay(1000);
  
  // Test right motor backward
  Serial.println("Right motor backward");
  ledcWrite(2, 0);
  ledcWrite(3, 200);
  delay(2000);
  
  // Stop all
  ledcWrite(0, 0);
  ledcWrite(1, 0);
  ledcWrite(2, 0);
  ledcWrite(3, 0);
  delay(3000);
}

Expected: Each motor spins in both directions
Result:
  Left forward: __________
  Left backward: __________
  Right forward: __________
  Right backward: __________

⚠️ If motor spins wrong direction:
  Swap its two wires at motor driver
```

**Test 2: Synchronized motion**

```cpp
// Put wheels back on, place on floor

void setup() {
  // ... same PWM setup as above ...
}

void loop() {
  // Forward
  Serial.println("Moving forward");
  ledcWrite(0, 200);  // Left forward
  ledcWrite(1, 0);
  ledcWrite(2, 200);  // Right forward
  ledcWrite(3, 0);
  delay(2000);
  
  // Stop
  ledcWrite(0, 0);
  ledcWrite(1, 0);
  ledcWrite(2, 0);
  ledcWrite(3, 0);
  delay(1000);
}

Expected: Robot moves forward in straight line
Result: __________

⚠️ If robot curves:
  - Mismatched motor directions (swap wires)
  - Motors not identical speed (normal, software compensates)
  - Wheels/caster binding
```

**Test 3: Current draw (motors running)**

```cpp
// Measure current with multimeter in series

Idle (no motors): <100mA
Both motors 50% speed: ~300-500mA
Both motors 100% speed: ~800-1200mA

Your readings: __________

⚠️ If >1500mA: Motors stalling or shorted!
```

#### 7.5: Integration Test

**Upload the full WHEELIE firmware:**

```
1. Flash main.cpp to ESP32
2. Open Serial Monitor (115200 baud)
3. Observe boot sequence
4. Check for errors

Expected output:
╔═══════════════════════════════════════╗
║  🤖 EVOLVING SENTRY ROBOT SYSTEM 🧬  ║
║        WITH EMERGENT LANGUAGE 🗣️      ║
╚═══════════════════════════════════════╝

📖 Loading persistent memory...
Generation: 0
Fitness: 0.0
✅ Sensor initialized
✅ Motors initialized
✅ Communication system initialized
🗣️ Creating default vocabulary...
💡 Waiting for motion to begin evolution...

✅ If you see this: BUILD SUCCESSFUL!
```

**Final functional test:**

```
1. Place robot on floor
2. Wave hand to trigger motion sensor
3. Robot should wake up and start moving
4. Place obstacle in front
5. Robot should detect, avoid obstacle
6. LEDs should show emotional state
7. Buzzer should emit signals

If all works: 🎉 BUILD COMPLETE! 🎉
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: ESP32 Won't Program

**Symptoms:**

- Upload fails with "Failed to connect" error
- COM port not detected

**Solutions:**

```
✅ Check USB cable
  - Try different cable (some are power-only!)
  - Try different USB port on computer

✅ Check drivers
  - CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
  - CH340: http://www.wch-ic.com/downloads/CH341SER_ZIP.html

✅ Manual reset during upload
  1. Click "Upload" in IDE
  2. When "Connecting..." appears
  3. Hold BOOT button on ESP32
  4. Press and release RESET button
  5. Release BOOT when upload starts

✅ Check board settings
  Board: "ESP32 Dev Module"
  Upload Speed: 115200 (try lower if fails)
  Flash Frequency: 80MHz
  Flash Mode: QIO
  Flash Size: 4MB
  Partition Scheme: Default
```

#### Issue 2: VL53L0X Sensor Not Found

**Symptoms:**

- "Failed to boot VL53L0X" error
- Readings always show 8190mm or 0mm

**Solutions:**

```
✅ Check wiring
  VCC → 3.3V (NOT 5V!)
  GND → Star ground
  SCL → GPIO 22
  SDA → GPIO 21

✅ Check I2C bus
  Upload I2C scanner sketch:
  
  #include <Wire.h>
  
  void setup() {
    Serial.begin(115200);
    Wire.begin();
    Serial.println("Scanning I2C bus...");
    
    for (byte addr = 1; addr < 127; addr++) {
      Wire.beginTransmission(addr);
      if (Wire.endTransmission() == 0) {
        Serial.print("Device found at 0x");
        Serial.println(addr, HEX);
      }
    }
  }
  
  void loop() {}
  
  Expected: Should find device at 0x29
  If not found: Wiring issue or dead sensor

✅ Pull-up resistors
  - Some ESP32 boards need external 4.7kΩ resistors
  - SCL to 3.3V: 4.7kΩ
  - SDA to 3.3V: 4.7kΩ
```

#### Issue 3: Motors Don't Spin

**Symptoms:**

- No movement when code runs
- Motors hum but don't turn

**Solutions:**

```
✅ Check power
  - Measure VM on motor driver: Should be ~6V
  - Measure battery: Should be >5V (replace if low)
  - Check switch is ON

✅ Check motor connections
  - Motor wires firmly attached to driver outputs
  - No cold solder joints
  - Continuity from motor to driver

✅ Check GPIO signals
  - Verify PWM channels setup correctly
  - Use multimeter on GPIO pins (should vary 0-3.3V)
  - Upload simple motor test sketch (see Phase 7.4)

✅ Check motor driver
  - Some drivers have enable/standby pins
  - Check datasheet for your specific chip
  - Enable pin may need to be HIGH

✅ Mechanical check
  - Motors spin freely by hand?
  - Wheels not binding on chassis?
  - Gears not stripped?
```

#### Issue 4: Random Resets / Brownouts

**Symptoms:**

- ESP32 resets during motor operation
- Serial output shows "Brownout detector triggered"

**Cause:** Voltage drop when motors start

**Solutions:**

```
✅ Add bulk capacitor
  - 470-1000µF electrolytic cap
  - Across battery terminals
  - Polarity matters! (+) to Battery+, (-) to Battery-

✅ Check battery
  - Fresh batteries: ~6.2V
  - Weak batteries: <5.5V (replace)
  - Rechargeable NiMH: 4×1.2V = 4.8V (might be too low)

✅ Use better batteries
  - Alkaline: Good
  - NiMH: OK if freshly charged
  - Lithium (AA size): Best, but expensive

✅ Buck converter capacity
  - Some cheap buck converters can't handle current spikes
  - Use quality LM2596 module
  - Or add 100µF capacitor on output

✅ Star grounding
  - Ensure star ground is properly implemented
  - Motor ground separate path to star
```

#### Issue 5: Motor Noise Causes Sensor Errors

**Symptoms:**

- VL53L0X readings jump wildly when motors run
- ESP32 resets during motor operation
- I2C communication failures

**Cause:** Electrical noise from motors

**Solutions:**

```
✅ Verify star grounding
  - THIS IS THE #1 FIX
  - All grounds must meet at ONE point only
  - No ground loops

✅ Add capacitors to motors
  - 0.1µF ceramic cap across motor terminals
  - Reduces RF noise

✅ Separate power domains
  - Buck converter for logic (5V)
  - Battery direct to motor driver (6V)
  - No sharing of power rails

✅ Twist motor wires
  - Helps cancel magnetic fields
  - Reduces radiated noise

✅ Physical separation
  - Keep sensor wires away from motor wires
  - Route on opposite sides of chassis
```

#### Issue 6: NeoPixels Don't Light

**Symptoms:**

- LEDs stay dark
- Only first LED works in chain

**Solutions:**

```
✅ Check power
  - NeoPixels need 5V, not 3.3V
  - Verify 5V at LED VCC pin

✅ Check data pin
  - DIN must be connected to GPIO
  - Not DOUT (that's output for next LED)

✅ Library compatibility
  - Use Adafruit_NeoPixel library
  - Correct initialization:
    Adafruit_NeoPixel led(1, GPIO_PIN, NEO_GRB + NEO_KHZ800);

✅ Brightness
  - Default might be too dim
  - Add: led.setBrightness(50); // 0-255

✅ Dead LED
  - Test with different LED
  - NeoPixels can be damaged by ESD
```

#### Issue 7: Buzzer Silent or Continuous Tone

**Symptoms:**

- No sound from buzzer
- Buzzer makes continuous tone

**Solutions:**

```
✅ Passive vs Active buzzer
  - PASSIVE: Needs tone() function (variable frequency)
  - ACTIVE: Just apply voltage (fixed frequency)
  - Project Jumbo needs PASSIVE

✅ Check polarity
  - Passive buzzers have polarity (+/-)
  - Reverse won't damage, but won't work

✅ Test with simple code
  tone(13, 1000);  // Should make 1000Hz tone
  delay(1000);
  noTone(13);

✅ Volume too low
  - Add transistor amplifier (see Phase 5.4)
  - Some buzzers are just quiet

✅ GPIO conflict
  - GPIO 13 might be used by something else
  - Try different GPIO pin
```

#### Issue 8: RCWL-0516 Always Triggers

**Symptoms:**

- Motion sensor output always HIGH
- Robot won't sleep

**Solutions:**

```
✅ Interference
  - Keep away from WiFi antennas
  - Keep away from motors when running
  - Shield with aluminum foil (grounded)

✅ Adjust sensitivity
  - Turn potentiometer counterclockwise
  - Some modules don't have adjustment

✅ Add delay in code
  - Ignore first 30 seconds after boot
  - Sensor needs stabilization time

✅ Wrong module
  - Ensure it's RCWL-0516, not PIR sensor
  - PIR won't work well for this application
```

### When All Else Fails

**Systematic debugging:**

```
1. Isolate subsystems
   - Test each component individually
   - Breadboard before soldering

2. Check solder joints
   - Use magnifier
   - Look for cold solder, bridges, cracks

3. Verify voltages
   - Battery: 6V
   - Buck output: 5V
   - ESP32 3.3V pin: 3.3V
   - Motor driver VM: 6V

4. Check continuity
   - All grounds to star: <1Ω
   - GPIO pins to destination: <5Ω
   - Power rails: No shorts to ground

5. Simplify
   - Start with minimal working sketch
   - Add complexity incrementally
   - Identify where problem starts

6. Ask for help
   - Post in Project Jumbo discussions
   - Include: Photos, wiring diagram, error messages
   - ESP32 forums are very helpful
```

---

## Advanced Modifications

### Upgrade Path

Once basic WHEELIE is working:

#### Mod 1: Upgraded Power

**18650 Li-ion batteries:**

```
Advantages:
  ✅ Higher capacity (2500-3500mAh vs ~2000mAh AA)
  ✅ Rechargeable
  ✅ Lighter weight
  ✅ Higher voltage (3.7V × 2 = 7.4V nominal)

Required changes:
  - 18650 battery holder (2 cell)
  - TP4056 charge module (for charging)
  - Battery protection circuit (BMS)
  - Voltage monitoring circuit

Cost: +$15-20
```

#### Mod 2: IMU for Dead Reckoning

**Add MPU-6050:**

```
Enables:
  ✅ Actual velocity tracking
  ✅ Rotation angle measurement
  ✅ Collision detection (sudden decel)
  ✅ Tilt sensing

Wiring:
  VCC → 3.3V
  GND → Star ground
  SCL → GPIO 22 (shared with VL53L0X)
  SDA → GPIO 21 (shared with VL53L0X)

Note: I2C bus can support multiple devices!

Cost: +$5
```

#### Mod 3: Better Obstacle Detection

**Add HC-SR04 ultrasonic:**

```
Advantages:
  ✅ Wider field of view (15-30° vs VL53L0X 25°)
  ✅ Cheaper ($2 vs $8)
  ✅ Longer range (up to 4m)

Disadvantages:
  ⚠️ Lower accuracy (±3cm vs ±3mm)
  ⚠️ Affected by acoustics
  ⚠️ Slower update rate

Wiring:
  VCC → 5V
  GND → Star ground
  TRIG → GPIO 13
  ECHO → GPIO 16 (direct, or voltage divider for safety)

Cost: +$2 (or replace VL53L0X)
```

#### Mod 4: Add Computer Vision

**ESP32-CAM integration:**

```
Enables:
  ✅ Object recognition
  ✅ Color tracking
  ✅ Line following
  ✅ Visual SLAM

Implementation:
  - Separate ESP32-CAM module
  - Communicates with main ESP32 via serial or ESP-NOW
  - Runs TensorFlow Lite models
  - Streams video to web interface

Cost: +$10
Complexity: ★★★★★
```

#### Mod 5: Gripper Arm (GRABBER bot)

**SG90 servo + 3D printed gripper:**

```
Enables:
  ✅ Object manipulation
  ✅ Tool use
  ✅ Environmental modification

Hardware:
  - 2× SG90 micro servo ($3 each)
  - 3D printed gripper mechanism
  - Current sensor for grip detection

Wiring:
  Servo 1 (shoulder): GPIO 12
  Servo 2 (gripper): GPIO 14
  Current sensor: Analog pin (GPIO 34)

Cost: +$15
```

---

## Safety Guidelines

### Electrical Safety

```
⚡ ALWAYS:
  ✅ Disconnect power before wiring changes
  ✅ Check for shorts with multimeter before power-on
  ✅ Use proper gauge wire for current load
  ✅ Insulate all connections (heat shrink or tape)
  ✅ Keep liquids away from electronics

⚡ NEVER:
  ❌ Touch components while powered
  ❌ Connect/disconnect while motors running
  ❌ Exceed component voltage ratings
  ❌ Use damaged batteries
  ❌ Short circuit battery directly (fire hazard!)
```

### Soldering Safety

```
🔥 SOLDERING IRON:
  ✅ Use in ventilated area
  ✅ Use stand when not holding
  ✅ Don't touch tip (400°C!)
  ✅ Clean tip regularly
  ✅ Unplug when finished
  ✅ Keep fire extinguisher nearby

🔥 SOLDER FUMES:
  ✅ Rosin-core solder fumes are toxic
  ✅ Use fume extractor or fan
  ✅ Don't breathe directly
  ✅ Wash hands after soldering
```

### Battery Safety

```
🔋 BATTERY HANDLING:
  ✅ Use fresh, quality batteries
  ✅ Don't mix old and new batteries
  ✅ Remove batteries if storing >1 month
  ✅ Dispose properly (recycling center)
  ✅ Check polarity before installing

🔋 LITHIUM BATTERIES (if upgrading):
  ⚠️ Can catch fire if shorted
  ⚠️ Can explode if overcharged
  ⚠️ Use protected cells
  ⚠️ Use proper charger
  ⚠️ Never puncture or crush
```

### Operational Safety

```
🤖 ROBOT OPERATION:
  ✅ Test in safe, clear area first
  ✅ Don't operate near stairs/ledges
  ✅ Keep away from pets/small children
  ✅ Don't run unsupervised for extended periods
  ✅ Power off when not in use

⚠️ ROBOT CAN:
  - Move unexpectedly (motion-triggered wake)
  - Emit loud sounds (buzzer)
  - Have sharp edges (screws, chassis)
  - Trap small fingers (gears)
```

### Workshop Safety

```
🔨 GENERAL:
  ✅ Wear safety glasses when cutting/drilling
  ✅ Use proper tools for the job
  ✅ Keep work area clean and organized
  ✅ Don't work when tired or distracted
  ✅ Ask for help if unsure

🔨 CHILDREN:
  ✅ Adult supervision required
  ✅ Age-appropriate tools only
  ✅ Teach proper safety procedures
  ✅ Start with simple tasks
  ✅ Gradually increase complexity
```

---

## Conclusion

### What You've Built

**Congratulations!** If you've completed this guide, you now have:

✅ A fully autonomous robot  
✅ On-board evolution capability  
✅ Emergent language system  
✅ Learned strategy memory  
✅ Emotional expression  
✅ True artificial life  

**This is not a toy. This is a research platform.**

### Next Steps

```
1. Upload WHEELIE firmware (see code repository)
2. Let it evolve for 50+ generations (~1 hour)
3. Observe personality emergence
4. Document vocabulary development
5. Share your results!
```

### Join the Community

```
🌐 Project Jumbo Community:
  - GitHub Discussions
  - Discord server (link in README)
  - YouTube build videos
  - Twitter: #ProjectJumbo

📝 Share your build:
  - Photos of your robot
  - Evolution data logs
  - Modifications you made
  - Challenges you faced

🤝 Help others:
  - Answer questions
  - Contribute code improvements
  - Suggest new features
  - Report bugs
```

### The Journey Continues

**Building WHEELIE is just the beginning:**

- **Week 2:** Build SPEEDY (speed specialist)
- **Week 4:** Implement ESP-NOW swarm communication
- **Week 8:** Add LLM strategic planning
- **Week 12:** 5-bot swarm operating autonomously

**The robots will surprise you.**

They'll develop behaviors you didn't program.  
They'll communicate in ways you didn't anticipate.  
They'll teach you about emergence, intelligence, and life itself.

**Welcome to Project Jumbo.**

---

*Document Version: 1.0*  
*Last Updated: October 2025*  
*Author: Project Jumbo Team*

*"Every bot built is a step toward understanding intelligence."*

---

**Ready to build?**  
**Get your parts, clear your workspace, and let's create artificial life! 🤖🧬**

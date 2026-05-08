# Speedy Configuration and Development Log

## Comprehensive Equipment List

This is the complete bill of materials for the speed-optimized scout robot, designed to maximize velocity while maintaining evolutionary intelligence.

| Component | Model/Type | Purpose & Rationale |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32-D0WD-V3 Dev Board | Dual-core processor for parallel motion tracking and navigation, with integrated Wi-Fi for swarm coordination. |
| **Motor Driver** | DRV8833/TB6612-style | High-efficiency MOSFET H-bridge driver, minimizing power loss at high speeds. |
| **Motors** | 2x DC "TT" Gear Motors (Higher RPM variant) | Same as WHEELIE but optimized for speed over torque. Standard kit maintains parts compatibility across the swarm. |
| **Distance Sensor** | HC-SR04 Ultrasonic | Wide-angle (15-30°) detection cone for peripheral awareness at speed. Faster binary decisions than precision measurements. |
| **Motion Sensor** | MPU-6050 IMU | **SPEEDY's specialty**: 3-axis accelerometer + 3-axis gyroscope for real-time velocity tracking, collision detection, and stability monitoring. |
| **RGB LEDs** | 2x 4-pin Common Anode RGB LEDs | Visual emotional expression and status indication, identical to WHEELIE for swarm consistency. |
| **Power Source** | 4x AA Battery Pack | Same 6V power supply as WHEELIE for parts standardization. |
| **Voltage Regulator**| Buck Converter | Steps 6V down to stable 5V for ESP32 VIN pin. |
| **Power Switch** | DPDT 6-Pin Switch | Master power distribution with clean circuit isolation. |
| **Chassis & Wheels**| Compact 2WD Chassis | **Lighter and smaller** than WHEELIE's chassis - reduced weight for maximum speed. Front-wheel drive with rear caster. |

### Key Design Differences from WHEELIE

| Feature | WHEELIE | SPEEDY | Rationale |
|---------|---------|--------|-----------|
| **Primary Sensor** | VL53L0X (Laser I2C) | HC-SR04 (Ultrasonic) | Wide cone for peripheral vision at speed; no I2C bus contention with MPU-6050 |
| **Specialty Sensor** | RCWL-0516 (Motion) | MPU-6050 (IMU) | Motion tracking for velocity optimization and collision detection |
| **Chassis** | Standard 2WD | Compact 2WD | Lighter = faster acceleration |
| **Operation Mode** | Sentry (sleep/wake) | Always Active | Speed-focused, no power-saving mode |
| **Buzzer** | Yes (GPIO 13) | No | GPIO freed for HC-SR04, reduces weight |
| **Role** | Baseline Scout | Speed Specialist | Complementary swarm roles |

***

## Detailed Wiring Plan

This configuration prioritizes the MPU-6050 on the I2C bus for continuous high-speed motion tracking, with HC-SR04 on dedicated GPIO for parallel processing.

| From | To Pin | To |
| :--- | :--- | :--- |
| **Power Distribution** | | |
| 4xAA Battery (+) | DPDT Switch (Center Pins, Jumpered) | N/A |
| DPDT Switch (Output A) | Buck Converter (`VIN+`) | Powers the ESP32 |
| DPDT Switch (Output B) | Motor Driver (`VM`) | Powers the motors |
| Buck Converter (`VOUT+`) | ESP32 (`VIN`) | Regulated 5V for the board |
| **⭐ Star Ground Point** | **(Battery Negative)** | All grounds meet here to prevent motor noise |
| From Star Ground | Buck Converter (`VIN-` & `VOUT-`) | Ground for logic power |
| From Star Ground | Motor Driver (`GND`) | Ground for motor power |
| From Star Ground | ESP32 (`GND`) | Ground reference for logic |
| **Motor Control (ESP32)** | | |
| `GPIO 26` | Motor Driver (`IN1` - Left Motor) | PWM Control |
| `GPIO 25` | Motor Driver (`IN2` - Left Motor) | PWM Control |
| `GPIO 32` | Motor Driver (`IN3` - Right Motor)| PWM Control |
| `GPIO 33` | Motor Driver (`IN4` - Right Motor)| PWM Control |
| **Sensor Control (ESP32)** | | |
| `3.3V` | MPU-6050 (`VCC`) | Power for IMU |
| `GPIO 22` (SCL) | MPU-6050 (`SCL`) | I2C Clock - **PRIORITY DEVICE** |
| `GPIO 21` (SDA) | MPU-6050 (`SDA`) | I2C Data - **PRIORITY DEVICE** |
| `5V` (from Buck) | HC-SR04 (`VCC`) | Power for ultrasonic sensor |
| `GPIO 13` | HC-SR04 (`TRIG`) | Trigger pulse |
| `GPIO 16` | HC-SR04 (`ECHO`) | Echo return signal |
| **RGB LED Control (ESP32)** | | |
| `GPIO 2` | Left LED - Red (via 220Ω resistor) | PWM Channel 4 |
| `GPIO 4` | Left LED - Green (via 220Ω resistor) | PWM Channel 5 |
| `GPIO 5` | Left LED - Blue (via 220Ω resistor) | PWM Channel 6 |
| `GPIO 12` | Right LED - Red (via 220Ω resistor) | PWM Channel 7 |
| `GPIO 15` | Right LED - Green (via 220Ω resistor) | PWM Channel 8 |
| `GPIO 14` | Right LED - Blue (via 220Ω resistor) | PWM Channel 9 |
| **LED Common Anode** | `5V` or `3.3V` | Power for RGB LEDs (depends on LED spec) |

### GPIO Allocation Summary

| GPIO | Function | Notes |
|------|----------|-------|
| 2, 4, 5 | Left RGB LED (R, G, B) | PWM channels 4-6 |
| 12, 14, 15 | Right RGB LED (R, G, B) | PWM channels 7-9 |
| 13 | HC-SR04 Trigger | Freed from buzzer duty |
| 16 | HC-SR04 Echo | New assignment |
| 21 | I2C SDA (MPU-6050) | High-priority, continuous polling |
| 22 | I2C SCL (MPU-6050) | High-priority, continuous polling |
| 25, 26 | Left Motor PWM | PWM channels 0-1 |
| 32, 33 | Right Motor PWM | PWM channels 2-3 |

***

## Strategic Design Philosophy

### Speed-First Optimization

SPEEDY's entire design revolves around maximizing velocity while maintaining evolutionary intelligence:

1. **Lighter Chassis**: Reduced mass = faster acceleration and higher top speed
2. **Wide-Angle Sensing**: HC-SR04's cone vision detects obstacles approaching from sides at speed
3. **Real-Time Motion Feedback**: MPU-6050 provides actual velocity data, not just PWM duty cycle
4. **No Sleep Mode**: Always active, always fast-responding
5. **Minimal Sensor Load**: Only essential sensors to reduce processing overhead

### What the MPU-6050 Enables

The 6-axis IMU unlocks speed-specific capabilities:

**Accelerometer (3-axis):**

- Track **actual velocity** by integrating acceleration data
- Detect **sudden collisions** (rapid deceleration events)
- Monitor **surface friction changes** (drift detection)
- Calculate **real distance traveled** for fitness scoring

**Gyroscope (3-axis):**

- Measure **angular velocity** during turns
- Optimize **turn sharpness** without tipping
- Detect **wheel slip** (commanded vs. actual rotation)
- Enable **drift correction** in real-time

### Genome Parameters for SPEEDY

SPEEDY's evolutionary genome includes speed-specific parameters:

```cpp
struct SpeedyGenome {
  // Standard parameters (inherited from WHEELIE)
  int motorSpeed = 240;          // Start higher than WHEELIE
  int turnSpeed = 180;
  int backupDuration = 400;      // Shorter - faster reactions
  int turnDuration = 250;        // Quicker turns
  
  // Speed-specific parameters
  int maxSafeSpeed = 255;        // Speed where stability maintained
  int collisionThreshold = 50;   // Accel change indicating crash (m/s²)
  float driftTolerance = 0.15;   // Acceptable path deviation
  int emergencyBrakeDecel = 200; // How hard to brake on obstacle
  
  // Standard evolution metadata
  unsigned long successCount = 0;
  unsigned long failureCount = 0;
  float fitnessScore = 0.0;
  unsigned long generation = 0;
};
```

### Fitness Function for SPEEDY

Speed-optimized fitness prioritizes velocity and efficiency:

```cpp
void calculateSpeedyFitness() {
  // Standard metrics
  float successRate = obstaclesCleared / obstaclesEncountered;
  float escapeRate = trapEscapes / timesTrapped;
  
  // Speed-specific metrics
  float avgVelocity = totalDistanceTraveled / totalTime; // From MPU-6050
  float efficiency = distanceTraveled / energyUsed;      // Distance per watt
  float stabilityScore = 1.0 - (crashCount / totalManeuvers);
  
  // Weighted combination (speed emphasized)
  fitnessScore = 
    (successRate * 0.30) +
    (avgVelocity * 0.35) +    // Speed is king
    (efficiency * 0.20) +
    (stabilityScore * 0.15);
}
```

***

## Hurdles to Overcome

Lessons learned from WHEELIE applied to SPEEDY's development:

### Anticipated Challenges

1. **I2C Bus Contention**: MPU-6050 requires continuous high-speed polling. HC-SR04 on separate GPIO prevents I2C conflicts that would occur with VL53L0X.

2. **High-Speed Stability**: At higher speeds, small obstacles can cause crashes. The gyroscope will detect instability (tilt) before disaster, allowing emergency braking.

3. **Stopping Distance**: At 235+ motor speed, reaction time becomes critical. HC-SR04's 30ms cycle time + 50ms processing = ~3-5cm traveled before response. Evolution must optimize `emergencyBrakeDecel`.

4. **Turn Dynamics**: Front-wheel drive can understeer at speed. Evolution may need to *increase* turn duration (counterintuitive) or add multi-stage turns (brake → turn → accelerate).

5. **Battery Drain**: Higher speeds = more current draw. Voltage monitoring may be needed to adjust speed as batteries deplete.

### Solutions from WHEELIE Experience

✅ **Star Grounding**: Already proven to eliminate motor noise  
✅ **EEPROM Persistence**: Genome survives power cycles  
✅ **Strategy Library**: 20-slot memory works well  
✅ **Emotional States**: Proven framework, no changes needed  
✅ **RGB LED Expression**: Visual feedback is valuable  

***

## Code Evolution Plan

SPEEDY will follow a similar development trajectory to WHEELIE, but accelerated:

### Version 1: Foundation (MPU-6050 Integration)

- Validate MPU-6050 I2C communication
- Read accelerometer and gyroscope raw data
- Test HC-SR04 ultrasonic sensor independently
- Verify motor control at high speeds

### Version 2: Motion Tracking

- Integrate acceleration data → velocity calculation
- Implement collision detection (sudden deceleration)
- Add basic obstacle avoidance with HC-SR04
- Test stopping distance at various speeds

### Version 3: Evolutionary Base

- Port WHEELIE's genome structure
- Add speed-specific parameters
- Implement speed-focused fitness function
- Enable mutation and selection

### Version 4: Advanced Dynamics

- Gyroscope-based turn optimization
- Drift detection and correction
- Emergency braking based on IMU data
- Stability monitoring

### Version 5: Swarm Integration

- ESP-NOW communication with WHEELIE
- Speed-based role assignment (fast scout)
- Coordinate with slower bots
- Share discovered obstacles

***

## Expected Behavioral Differences

Based on WHEELIE's evolution, we predict SPEEDY will develop:

| Trait | WHEELIE | SPEEDY (Predicted) |
|-------|---------|-------------------|
| **Top Speed** | 235 PWM | **255 PWM** (maxed out) |
| **Obstacle Threshold** | 175mm | **120mm** (closer detection due to speed) |
| **Turn Style** | Smooth arcs | **Sharp flicks** (minimize time not moving forward) |
| **Risk Tolerance** | Moderate | **High** (aggressive, fast recovery) |
| **Communication Style** | Melodic, varied | **Short, rapid bursts** (less time for signaling) |
| **Emotional Expression** | Balanced | **High confidence, low frustration** (speed builds confidence) |

### Personality Hypothesis

**If WHEELIE became aggressive and GRABBER became cautious based on their roles, SPEEDY should become:**

- **Reckless**: Prioritizes speed over caution
- **Opportunistic**: Takes risks WHEELIE wouldn't
- **Impatient**: Short backup times, quick decisions
- **Confident**: High-speed successes reinforce boldness

**This will be tested empirically through evolution!** 🧬

***

## Success Metrics

SPEEDY will be considered successful when:

- ✅ **Top speed ≥ 2x WHEELIE's average** (target: 1.5+ m/s)
- ✅ **Collision detection working** (stops within 2cm of unexpected obstacles)
- ✅ **Fitness score > 0.70** by generation 30
- ✅ **Distinct personality** from WHEELIE (measured by parameter divergence)
- ✅ **Stable at max speed** (no uncontrolled crashes)
- ✅ **Swarm coordination** (communicates with WHEELIE effectively)

***

## Timeline

**Phase 1 (Week 1-2):** Hardware assembly and sensor validation  
**Phase 2 (Week 3-4):** Basic motion tracking and obstacle avoidance  
**Phase 3 (Week 5-6):** Evolutionary genome implementation  
**Phase 4 (Week 7-8):** Advanced dynamics and stability  
**Phase 5 (Week 9+):** Swarm integration and testing  

**Target: Operational SPEEDY bot within 8-10 weeks**

***

## Research Questions

SPEEDY will help answer:

1. **Does speed alone drive personality?** Will SPEEDY become reckless just from moving fast?
2. **Can evolution optimize for conflicting goals?** (Speed vs. safety)
3. **How does velocity affect learning?** Do faster bots learn different strategies?
4. **What's the upper limit?** How fast can a bot go before evolution can't compensate?

**The answers will shape the rest of the swarm.** 🚀

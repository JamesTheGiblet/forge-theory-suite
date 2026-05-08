# Wheelie Configuration and Development Log

## Comprehensive Equipment List

This is the final bill of materials for the operational robot, detailing each component and its strategic role in the system.

| Component | Model/Type | Purpose & Rationale |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32-D0WD-V3 Dev Board | The robot's brain, chosen for its dual-core processor and integrated Wi-Fi, which are essential for future swarm communication. |
| **Motor Driver** | DRV8833/TB6612-style | A modern, high-efficiency dual H-bridge driver using MOSFETs. It controls the motors with minimal power loss and heat generation. |
| **Motors** | 2x DC "TT" Gear Motors | The robot's muscles, providing locomotion with a good balance of speed and torque. |
| **Distance Sensor** | VL53L0X ToF Laser Sensor | The robot's primary "eyes" for navigation. This high-precision laser sensor provides fast, accurate distance readings. |
| **Motion Sensor** | RCWL-0516 Microwave Radar | A secondary sensory system that detects movement, enabling advanced behaviors like the "sentry mode." |
| **Power Source** | 4x AA Battery Pack | Provides ~6V to power the entire system. AA cells were chosen for their good current delivery for the motors. |
| **Voltage Regulator**| Buck Converter | Steps the 6V from the batteries down to a stable 5V to safely power the ESP32's `VIN` pin. |
| **Power Switch** | DPDT 6-Pin Switch | Acts as a master power switch, cleanly distributing power to the motor driver and buck converter from a single source. |
| **Chassis & Wheels**| 2WD Rover Chassis | A standard two-wheel-drive frame with a caster wheel, providing a stable and agile platform. |

***

### Detailed Wiring Plan

This plan reflects the final, robust configuration, incorporating the star ground principle for maximum electrical stability.

| From | To Pin | To |
| :--- | :--- | :--- |
| **Power Distribution** | | |
| 4xAA Battery (+) | DPDT Switch (Center Pins, Jumpered) | N/A |
| DPDT Switch (Output A) | Buck Converter (`VIN+`) | Powers the ESP32 |
| DPDT Switch (Output B) | Motor Driver (`VM`) | Powers the motors |
| Buck Converter (`VOUT+`) | ESP32 (`VIN`) | Regulated 5V for the board |
| **Star Ground Point** | **(Battery Negative)** | All points below connect here |
| From Star Ground | Buck Converter (`VIN-` & `VOUT-`) | Ground for logic power |
| From Star Ground | Motor Driver (`GND`) | Ground for motor power |
| From Star Ground | ESP32 (`GND`) | Ground reference for logic |
| **Motor Control (ESP32)** | | |
| `GPIO 26` | Motor Driver (`IN1` - Left Motor) | PWM Control |
| `GPIO 25` | Motor Driver (`IN2` - Left Motor) | PWM Control |
| `GPIO 32` | Motor Driver (`IN3` - Right Motor)| PWM Control |
| `GPIO 33` | Motor Driver (`IN4` - Right Motor)| PWM Control |
| **Sensor Control (ESP32)** | | |
| `3.3V` | VL53L0X (`VCC`) | Power for laser sensor |
| `GPIO 22` (SCL) | VL53L0X (`SCL`) | I2C Clock |
| `GPIO 21` (SDA) | VL53L0X (`SDA`) | I2C Data |
| `5V` (from Buck) | RCWL-0516 (`VIN`) | Power for motion sensor |
| `GPIO 27` | RCWL-0516 (`OUT`) | Motion detection signal |

***

### Hurdles Overcome

The project's success was defined by systematically identifying and solving several key challenges:

1. **Component Misidentification:** We initially planned for an older L298N motor driver but correctly identified the hardware as a more modern, efficient MOSFET driver, which required a completely different and simpler control strategy.
2. **Voltage Level Safety:** We identified that the initial ultrasonic sensor's 5V signal was incompatible with the ESP32's 3.3V pins, leading to the implementation of a voltage divider to prevent hardware damage.
3. **GPIO Limitations:** An attempt to use `GPIO 34/35` for motor control failed. We correctly diagnosed that these are **input-only** pins and selected suitable output-capable pins instead.
4. **Power System Design:** We designed a safe and robust power distribution system, moving from a complex dual-battery idea to a simple single-battery setup. We selected the correct DPDT switch and implemented a **star ground** configuration to prevent electrical noise from the motors from interfering with the sensitive microcontroller.
5. **Library Dependency Errors:** We troubleshot several `UnknownPackageError` issues in PlatformIO, correcting typos in the `platformio.ini` file to successfully install the necessary sensor library.

***

### Code Evolution

The robot's software underwent a dramatic transformation, evolving from a simple test script into a complex artificial life simulation.

* **Version 1: Foundation:** The project began with a simple "Blink" sketch to validate the PlatformIO development environment. This was followed by isolated scripts to test the motor driver and the original ultrasonic sensor independently.
* **Version 2: Reactive Obstacle Avoidance:** The sensor and motor scripts were merged to create the first autonomous behavior. The robot would drive forward until an obstacle was detected, then execute a hard-coded backup and turn maneuver.
* **Version 3: Sensory Upgrade:** The code was refactored to replace the ultrasonic sensor with the more precise **VL53L0X laser sensor**, requiring the integration of a new library and a switch to the I2C communication protocol. The motor control logic was also significantly improved to use four PWM channels for more fluid control.
* **Version 4: Sentry Mode:** The **RCWL-0516 motion sensor** was added. The code evolved to include a "state machine," allowing the robot to remain in a dormant "sentry mode" and "wake up" only when motion was detected.
* **Version 5: The Emergence of Life:** The final and most significant version transcended simple logic. This firmware introduced:
  * An **Evolutionary Genome** where behavioral parameters could mutate over time.
  * A **Learned Strategy Library** stored in persistent EEPROM memory.
  * A **Natural Selection** process where a fitness function determines if mutations are beneficial.
  * An **Emotional State Model** to simulate frustration and confidence.
  * An **Emergent Language** system, allowing the robot to invent and evolve its own tonal signals to communicate its internal state and experiences.

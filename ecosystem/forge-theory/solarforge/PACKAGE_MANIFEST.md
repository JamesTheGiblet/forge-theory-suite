# 📦 Package Manifest

This document provides a technical overview of the Solar System Asteroid Monitor project.

## 🔧 Technical Implementation

### Architecture

The application is a single-page web application built with vanilla JavaScript and the Three.js library for WebGL rendering. It does not require a backend and runs entirely in the client's browser.

```txt
Solar System Monitor
├── Three.js Rendering Engine (via CDN)
├── WebGL Graphics Pipeline
├── Real-time Physics & Animation Loop
├── Interactive UI & Control Logic (HTML/CSS/JS)
└── Celestial Body Data (Embedded JS Object)
```

### Core Components

- **Rendering Engine**: Utilizes **Three.js (r128)** for all 3D rendering tasks, including geometry creation, materials, lighting, and scene management.
- **Physics Simulation**: A simplified N-body simulation where planets and asteroids follow pre-defined orbital paths. The simulation loop updates object positions based on their orbital period and the simulation's time speed.
- **Collision Detection**: Implemented as a proximity check. The distance between asteroids and planets is calculated each frame, and a visual warning is triggered if the distance falls below a set threshold.
- **Data Structure**: All celestial body data (planets, asteroids) is stored in a structured JavaScript object within the main HTML file for simplicity.

```javascript
// Example Data Structure
const celestialBody = {
    name: "Earth",
    radius: 6371,           // in km
    distance: 1.0,          // in AU
    orbitalPeriod: 365.26,  // in Earth days
    color: 0x2233FF,        // Hex color for rendering
    // ... and other properties
};
```

## 🛠️ Development

### File Structure

The entire application is self-contained within a single HTML file.

```txt
solar-system-monitor/
└── solarforge.html         # Main application file (HTML, CSS, and JS)
```

### Dependencies

- **Three.js r128**: The only external dependency, loaded via a CDN.

### Browser Compatibility

| Browser | WebGL Support | Performance |
|---------|---------------|-------------|
| Chrome 70+ | ✅ Excellent | 🚀 High |
| Firefox 65+ | ✅ Excellent | 🚀 High |
| Safari 12+ | ✅ Good | ⚡ Medium |
| Edge 79+ | ✅ Excellent | 🚀 High |

## 📜 License

This project is licensed under the MIT License. Third-party assets like Three.js are subject to their own licenses (MIT). Planetary data from sources like NASA is in the public domain.

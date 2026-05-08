# 🤝 CONTRIBUTING TO FORGE THEORY

Thank you for your interest in contributing to Forge Theory! This document provides guidelines for contributing to the ecosystem.

═══════════════════════════════════════════════════════════════════════════════

## 📜 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Ways to Contribute](#-ways-to-contribute)
3. [Getting Started](#-getting-started)
4. [Development Guidelines](#️-development-guidelines)
5. [Creating New Forges](#-creating-new-forges)
6. [Testing Requirements](#-testing-requirements)
7. [Submission Process](#-submission-process)
8. [Community](#-community)

═══════════════════════════════════════════════════════════════════════════════

## 🌟 Code of Conduct

### Our Philosophy

Forge Theory is built on anti-gatekeeping principles. We believe:

- **Knowledge should be free** - No paywalls, no premium features
- **Beginners are welcome** - Everyone starts somewhere
- **Questions are good** - No question is "stupid"
- **Sharing makes us stronger** - Open source benefits everyone
- **Clarity over cleverness** - Readable code beats clever tricks

### Our Standards

**We encourage:**

- ✅ Respectful, constructive communication
- ✅ Patient, thoughtful explanations
- ✅ Celebrating others' contributions
- ✅ Helping newcomers get started
- ✅ Clear, documented code
- ✅ Sharing knowledge freely

**We don't tolerate:**

- ❌ Harassment or discrimination
- ❌ Dismissive or condescending language
- ❌ Gatekeeping or elitism
- ❌ Deliberately obfuscated code
- ❌ Uncommented "clever" solutions
- ❌ "RTFM" responses without helpful direction

### Enforcement

Violations may result in:

1. **Warning** - First offense, clear explanation
2. **Temporary ban** - Repeated issues, time to reflect
3. **Permanent ban** - Serious violations, protecting community

═══════════════════════════════════════════════════════════════════════════════

## 💡 Ways to Contribute

### 🐛 Bug Reports

Found a bug? Help us fix it:

1. **Check existing issues** - May already be reported
2. **Create detailed report** - Use issue template
3. **Include reproduction steps** - How to trigger the bug
4. **Provide environment info** - Browser, OS, version
5. **Add screenshots** - Visual bugs need visuals

**Good Bug Report Template:**

```markdown
**Description:** Brief description of the bug

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:** What should happen

**Actual Behavior:** What actually happens

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Forge: LifeForge v1.2

**Screenshots:** [if applicable]
```

---

### ✨ Feature Requests

Have an idea? Share it:

1. **Check existing requests** - May already be suggested
2. **Explain the use case** - Why is this needed?
3. **Describe the feature** - What should it do?
4. **Consider implementation** - Any ideas how?

**Good Feature Request Template:**

```markdown
**Feature:** Brief description

**Problem it solves:** Why do we need this?

**Proposed solution:** How should it work?

**Alternatives considered:** Other approaches?

**Additional context:** Any other information?
```

---

### 📝 Documentation

Improve docs:

- **Fix typos** - Grammar and spelling matter
- **Clarify explanations** - Make complex things simple
- **Add examples** - Show, don't just tell
- **Write tutorials** - Help others learn
- **Translate content** - Reach more people
- **Create videos** - Some learn better visually

---

### 💻 Code Contributions

Write code:

- **Fix bugs** - Make things work better
- **Add features** - Enhance existing Forges
- **Optimize performance** - Make things faster
- **Improve UI/UX** - Make things more intuitive
- **Refactor code** - Make things cleaner
- **Add tests** - Make things more reliable

---

### 🎨 Creative Contributions

Create content:

- **Design assets** - Icons, logos, banners
- **Create presets** - Interesting starting configurations
- **Record demos** - Show Forges in action
- **Write articles** - Explain concepts
- **Make art** - Using Forge tools
- **Compose music** - With MelodyForge

---

### 🔬 Research Contributions

Advance the science:

- **Academic papers** - Publish research using Forges
- **Use cases** - Share how you're using Forges
- **Data analysis** - Study emergent patterns
- **Theory development** - Advance emergence understanding
- **Educational curricula** - Teach with Forges

═══════════════════════════════════════════════════════════════════════════════

## 🚀 Getting Started

### Prerequisites

**Required:**

- Git basics (clone, commit, push, pull)
- Text editor or IDE
- Web browser (Chrome, Firefox, Safari, or Edge)
- Basic HTML/CSS/JavaScript knowledge

**Optional but helpful:**

- Canvas API familiarity
- Understanding of emergence concepts
- Experience with specific domains (physics, biology, etc.)

### Setting Up

```bash
# 1. Fork the repository on GitHub
# (Click the "Fork" button)

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/FORGE_NAME.git
cd FORGE_NAME

# 3. Add upstream remote
git remote add upstream https://github.com/JamesTheGiblet/FORGE_NAME.git

# 4. Create a branch
git checkout -b feature/your-feature-name

# 5. Make your changes
# (Edit files in your text editor)

# 6. Test locally
# (Open .html files in browser)

# 7. Commit your changes
git add .
git commit -m "Add: descriptive message about changes"

# 8. Push to your fork
git push origin feature/your-feature-name

# 9. Create Pull Request
# (On GitHub, click "New Pull Request")
```

### First Contribution Ideas

**Good first issues for beginners:**

🌱 **Easy:**

- Fix typos in documentation
- Add code comments
- Improve README formatting
- Add color scheme options
- Create example presets

🌿 **Medium:**

- Add keyboard shortcuts
- Improve mobile responsiveness
- Create tutorial content
- Add sound effects
- Implement save/load features

🌳 **Challenging:**

- Optimize rendering performance
- Port to other languages
- Add new visualization modes
- Implement new features
- Create new Forges

Look for issues labeled:

- `good first issue`
- `help wanted`
- `documentation`
- `beginner friendly`

═══════════════════════════════════════════════════════════════════════════════

## 🛠️ Development Guidelines

### The Zero-Dependency Philosophy

**CRITICAL:** All Forges must work with zero external dependencies.

**Allowed:**
✅ Vanilla JavaScript (ES6+)
✅ HTML5
✅ CSS3
✅ Canvas API
✅ Web Audio API
✅ Web Workers
✅ Built-in browser APIs

**NOT Allowed:**
❌ npm packages
❌ External libraries (jQuery, React, etc.)
❌ CDN dependencies
❌ Build tools (webpack, etc.)
❌ Preprocessors (SASS, TypeScript, etc.)

**Why?**

- **Permanence** - Code works forever, no dependency rot
- **Transparency** - Everything is visible and understandable
- **Education** - No black boxes, learn by reading
- **Accessibility** - Works anywhere with a browser

### Code Style

#### JavaScript

```javascript
// ✅ GOOD: Clear, self-documenting code

/**
 * Calculate the distance between two points
 * @param {number} x1 - First point X coordinate
 * @param {number} y1 - First point Y coordinate
 * @param {number} x2 - Second point X coordinate
 * @param {number} y2 - Second point Y coordinate
 * @returns {number} Distance between points
 */
function calculateDistance(x1, y1, x2, y2) {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

// ❌ BAD: Clever but unclear
const d = (a,b,c,e) => Math.hypot(c-a,e-b);
```

**JavaScript Guidelines:**

- Use `const` and `let`, never `var`
- Use descriptive variable names
- Add comments explaining WHY, not WHAT
- One function = one responsibility
- Keep functions short (< 50 lines ideally)
- Use ES6+ features (arrow functions, destructuring, etc.)

#### HTML

```html
<!-- ✅ GOOD: Semantic, accessible HTML -->
<main class="simulation-container">
    <section class="controls" aria-label="Simulation controls">
        <button 
            id="startBtn" 
            class="control-btn"
            aria-label="Start simulation">
            Start
        </button>
    </section>
    <canvas 
        id="canvas" 
        class="simulation-canvas"
        aria-label="Simulation visualization">
    </canvas>
</main>

<!-- ❌ BAD: Non-semantic, inaccessible -->
<div class="x">
    <div class="y">
        <div onclick="go()">Start</div>
    </div>
    <canvas id="c"></canvas>
</div>
```

**HTML Guidelines:**

- Use semantic elements (`<main>`, `<section>`, `<article>`)
- Include ARIA labels for accessibility
- Descriptive IDs and classes
- Proper document structure
- Valid HTML5

#### CSS

```css
/* ✅ GOOD: Organized, maintainable CSS */

/* === VARIABLES === */
:root {
    --primary-color: #3498db;
    --background-color: #1a1a1a;
    --border-radius: 8px;
}

/* === LAYOUT === */
.simulation-container {
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
}

/* === COMPONENTS === */
.control-btn {
    background: var(--primary-color);
    border: none;
    border-radius: var(--border-radius);
    padding: 12px 24px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* ❌ BAD: No organization, unclear */
.x{background:#3498db;border:0;padding:12px 24px}
.x:hover{transform:translateY(-2px)}
```

**CSS Guidelines:**

- Use CSS variables for themes
- Organize by sections
- Mobile-first responsive design
- Clear class names
- Avoid !important
- Add comments for complex rules

### File Structure

```txt
forge-name/
├── index.html              # Main entry point
├── README.md               # Documentation
├── LICENSE                 # MIT License
├── assets/                 # Optional: images, etc.
│   ├── images/
│   └── sounds/
├── src/                    # Optional: for complex Forges
│   ├── main.js
│   ├── simulation.js
│   └── renderer.js
└── docs/                   # Optional: additional documentation
    ├── tutorial.md
    └── api.md
```

**Single-file Forges** (preferred for simple projects):

```html
forge-name/
├── forge-name.html         # Everything in one file
├── README.md
└── LICENSE
```

### Performance Best Practices

```javascript
// ✅ GOOD: Efficient animation loop
let lastTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;

function animate(currentTime) {
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= frameTime) {
        update(deltaTime);
        render();
        lastTime = currentTime - (deltaTime % frameTime);
    }
    
    requestAnimationFrame(animate);
}

// ✅ GOOD: Object pooling
class ParticlePool {
    constructor(size) {
        this.particles = Array.from(
            { length: size }, 
            () => new Particle()
        );
        this.activeCount = 0;
    }
    
    spawn(x, y) {
        if (this.activeCount < this.particles.length) {
            const particle = this.particles[this.activeCount];
            particle.reset(x, y);
            this.activeCount++;
            return particle;
        }
        return null;
    }
}

// ✅ GOOD: Spatial partitioning
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = Array(this.cols * this.rows).fill(null).map(() => []);
    }
    
    // Only check nearby cells for collisions
    getNearby(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        const nearby = [];
        
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const c = col + i;
                const r = row + j;
                if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                    nearby.push(...this.grid[r * this.cols + c]);
                }
            }
        }
        
        return nearby;
    }
}
```

**Performance Checklist:**

- [ ] Use `requestAnimationFrame` for animations
- [ ] Implement object pooling for frequently created/destroyed objects
- [ ] Use spatial partitioning for collision detection
- [ ] Minimize canvas state changes (save/restore, style changes)
- [ ] Batch rendering operations
- [ ] Use appropriate data structures (Maps for lookups, Arrays for iteration)
- [ ] Profile with browser DevTools
- [ ] Test on lower-end devices

### Accessibility Guidelines

```javascript
// ✅ GOOD: Keyboard navigation
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            toggleSimulation();
            // Announce to screen readers
            announceToScreenReader('Simulation ' + 
                (isRunning ? 'started' : 'paused'));
            break;
        case 'r':
        case 'R':
            resetSimulation();
            announceToScreenReader('Simulation reset');
            break;
    }
});

function announceToScreenReader(message) {
    const announcement = document.getElementById('sr-announcement');
    announcement.textContent = message;
}
```

```html
<!-- ✅ GOOD: Screen reader support -->
<div 
    id="sr-announcement" 
    class="sr-only" 
    aria-live="polite" 
    aria-atomic="true">
</div>

<button 
    id="startBtn"
    aria-label="Start simulation"
    aria-pressed="false">
    Start
</button>

<canvas 
    id="canvas"
    role="img"
    aria-label="Live simulation showing particle interactions">
</canvas>
```

```css
/* ✅ GOOD: Screen reader only class */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
```

**Accessibility Checklist:**

- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on controls
- [ ] Screen reader announcements for state changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Text alternatives for visual content
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Respects prefers-reduced-motion

═══════════════════════════════════════════════════════════════════════════════

## 🎨 Creating New Forges

Want to create a brand new Forge? Follow this guide:

### Conceptual Framework

**A good Forge demonstrates:**

1. **Simple rules** - Core mechanics are understandable
2. **Emergent behavior** - Complex patterns arise from rules
3. **Interactive** - Users can observe and manipulate
4. **Educational** - Teaches something about emergence
5. **Novel** - Explores a new domain or perspective

### Forge Template

Use this as your starting point:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YourForge - Forge Theory</title>
    <style>
        /* === RESET & VARIABLES === */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-color: #3498db;
            --secondary-color: #2ecc71;
            --background: #1a1a1a;
            --text: #ecf0f1;
            --canvas-bg: #2c3e50;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--background);
            color: var(--text);
            overflow: hidden;
        }
        
        /* === LAYOUT === */
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        /* === HEADER === */
        header {
            padding: 1rem;
            background: rgba(0,0,0,0.3);
            border-bottom: 2px solid var(--primary-color);
        }
        
        h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        .tagline {
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        /* === CONTROLS === */
        .controls {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: rgba(0,0,0,0.2);
            flex-wrap: wrap;
        }
        
        .control-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        button {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        /* === CANVAS === */
        #canvas {
            flex: 1;
            background: var(--canvas-bg);
        }
        
        /* === INFO PANEL === */
        .info {
            position: absolute;
            top: 80px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            padding: 1rem;
            border-radius: 8px;
            min-width: 200px;
        }
        
        .stat {
            display: flex;
            justify-content: space-between;
            margin: 0.5rem 0;
        }
        
        .stat-label {
            opacity: 0.7;
        }
        
        /* === ACCESSIBILITY === */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }
        
        /* === MOBILE === */
        @media (max-width: 768px) {
            h1 {
                font-size: 1.2rem;
            }
            
            .controls {
                padding: 0.5rem;
                gap: 0.5rem;
            }
            
            button {
                padding: 0.4rem 0.8rem;
                font-size: 0.9rem;
            }
            
            .info {
                font-size: 0.9rem;
                padding: 0.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header>
            <h1>⚡ YourForge</h1>
            <p class="tagline">Where [simple rule] creates [emergent behavior]</p>
        </header>
        
        <!-- Controls -->
        <section class="controls" aria-label="Simulation controls">
            <button id="startBtn" aria-pressed="false">Start</button>
            <button id="resetBtn">Reset</button>
            
            <div class="control-group">
                <label for="speedSlider">Speed:</label>
                <input 
                    type="range" 
                    id="speedSlider" 
                    min="1" 
                    max="10" 
                    value="5"
                    aria-label="Simulation speed">
                <span id="speedValue">5</span>
            </div>
        </section>
        
        <!-- Canvas -->
        <canvas 
            id="canvas" 
            aria-label="Simulation visualization">
        </canvas>
        
        <!-- Info Panel -->
        <aside class="info" aria-label="Simulation statistics">
            <div class="stat">
                <span class="stat-label">Parameter 1:</span>
                <span id="stat1">0</span>
            </div>
            <div class="stat">
                <span class="stat-label">Parameter 2:</span>
                <span id="stat2">0</span>
            </div>
        </aside>
        
        <!-- Screen Reader Announcements -->
        <div 
            id="sr-announcement" 
            class="sr-only" 
            aria-live="polite" 
            aria-atomic="true">
        </div>
    </div>

    <script>
        // ============================================
        // YOURFORGE - Part of Forge Theory
        // ============================================
        // A simulation demonstrating emergence through [concept]
        // 
        // Learn more: https://github.com/JamesTheGiblet/forge_theory
        // ============================================

        // === CONFIGURATION ===
        const CONFIG = {
            // Add your configuration parameters
            particleCount: 100,
            attractionForce: 0.5,
            // etc...
        };

        // === GLOBAL STATE ===
        let canvas, ctx;
        let isRunning = false;
        let entities = [];
        let lastTime = 0;

        // === INITIALIZATION ===
        function init() {
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext('2d');
            
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            
            setupControls();
            reset();
        }

        function resizeCanvas() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }

        function setupControls() {
            document.getElementById('startBtn').addEventListener('click', toggleSimulation);
            document.getElementById('resetBtn').addEventListener('click', reset);
            
            // Keyboard controls
            document.addEventListener('keydown', handleKeyPress);
        }

        function handleKeyPress(e) {
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    toggleSimulation();
                    break;
                case 'r':
                case 'R':
                    reset();
                    break;
            }
        }

        // === SIMULATION LOGIC ===
        function toggleSimulation() {
            isRunning = !isRunning;
            const btn = document.getElementById('startBtn');
            btn.textContent = isRunning ? 'Pause' : 'Start';
            btn.setAttribute('aria-pressed', isRunning);
            
            if (isRunning) {
                lastTime = performance.now();
                requestAnimationFrame(animate);
            }
            
            announceToScreenReader(`Simulation ${isRunning ? 'started' : 'paused'}`);
        }

        function reset() {
            // Reset simulation state
            entities = [];
            // Initialize your entities/particles/agents here
            
            render();
            announceToScreenReader('Simulation reset');
        }

        function update(deltaTime) {
            // Update simulation state
            // This is where your emergence rules go
            
            // Update statistics display
            updateStats();
        }

        function render() {
            // Clear canvas
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--canvas-bg');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Render your simulation
            // Draw entities, particles, etc.
        }

        function animate(currentTime) {
            if (!isRunning) return;
            
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            update(deltaTime);
            render();
            
            requestAnimationFrame(animate);
        }

        // === UTILITY FUNCTIONS ===
        function updateStats() {
            // Update info panel with current statistics
            document.getElementById('stat1').textContent = '...';
            document.getElementById('stat2').textContent = '...';
        }

        function announceToScreenReader(message) {
            const announcement = document.getElementById('sr-announcement');
            announcement.textContent = message;
        }

        // === START ===
        window.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
```

### README Template for New Forges

```markdown
# YourForge

**Part of the [Forge Theory](https://github.com/JamesTheGiblet/forge_theory) ecosystem**

> Where [simple rule] creates [emergent behavior]

## 🌟 What Is This?

[Brief description of what emerges and why it's interesting]

## ⚡ Quick Start

```bash
# Clone repository
git clone https://github.com/JamesTheGiblet/yourforge.git
cd yourforge

# Open in browser
open yourforge.html
```

Or visit: [Live Demo](https://yourforge.example.com)

## 🎯 What You'll Learn

- **Concept 1:** [Brief explanation]
- **Concept 2:** [Brief explanation]
- **Concept 3:** [Brief explanation]

## 🎮 How to Use

1. **Start:** Click "Start" or press Space
2. **Observe:** Watch [what emerges]
3. **Experiment:** Adjust parameters
4. **Learn:** Notice how [patterns form]

## 🔧 Controls

| Control | Description |
|---------|-------------|
| Space / Enter | Start/pause simulation |
| R | Reset simulation |
| Parameter X | Controls [what it does] |

## 📚 The Science

### The Rule

[Explain the simple rule]

### What Emerges

[Explain the complex behavior that emerges]

### Why It Matters

[Connect to real-world phenomena]

## 🎓 Educational Use

Perfect for teaching:

- [Subject area 1]
- [Subject area 2]
- [Subject area 3]

**Suggested Activities:**

1. [Activity idea]
2. [Activity idea]
3. [Activity idea]

## 🔗 Related Forges

- **[ForgeA](link)** - Related concept
- **[ForgeB](link)** - Builds on this
- **[ForgeC](link)** - Alternative perspective

## 🛠️ Technical Details

**Built with:**

- Vanilla JavaScript (ES6+)
- HTML5 Canvas
- Zero external dependencies

**Performance:**

- Optimized for 60fps
- Handles [N] entities smoothly
- Mobile-friendly

## 📖 Further Reading

- [Paper/Article 1]
- [Paper/Article 2]
- [Book recommendation]

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/JamesTheGiblet/forge_theory/blob/main/CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🌟 Part of Forge Theory

Explore emergence across all domains at [Forge Theory](https://github.com/JamesTheGiblet/forge_theory)

```txt

### Submission Checklist

Before submitting your new Forge:

**Code Quality:**
- [ ] Zero external dependencies
- [ ] Clear, commented code
- [ ] Follows style guidelines
- [ ] No console errors
- [ ] Works in all major browsers

**Documentation:**
- [ ] Complete README
- [ ] Clear explanation of emergence
- [ ] Usage instructions
- [ ] Educational context
- [ ] Related Forges linked

**Accessibility:**
- [ ] Keyboard controls work
- [ ] Screen reader support
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Mobile responsive

**Performance:**
- [ ] Runs at 60fps (or explains why not)
- [ ] No memory leaks
- [ ] Efficient algorithms
- [ ] Tested on lower-end devices

**Testing:**
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested on mobile
- [ ] Tested with keyboard only

═══════════════════════════════════════════════════════════════════════════════

## 📚 Documentation Standards

### README Structure

Every README should include:

1. **Title & Tagline** - Clear, compelling
2. **Quick Start** - Get running in 30 seconds
3. **Description** - What emerges and why
4. **Usage** - How to interact
5. **Educational Value** - What you'll learn
6. **Technical Details** - For developers
7. **Contributing** - How to help
8. **License** - MIT with attribution

### Code Comments

```javascript
// ❌ BAD: Obvious comment
// Increment i
i++;

// ✅ GOOD: Explains WHY
// Skip even numbers to reduce computation time
i += 2;

// ✅ GOOD: Explains non-obvious behavior
// Use bitwise OR for 2x performance over Math.floor
const gridX = (x / cellSize) | 0;

// ✅ GOOD: Algorithm explanation
/**
 * Barnes-Hut algorithm for O(n log n) gravity calculation
 * 
 * Instead of checking every particle against every other (O(n²)),
 * we use a quadtree to group distant particles and approximate
 * their collective force. This allows simulating thousands of
 * particles in real-time.
 * 
 * @see https://en.wikipedia.org/wiki/Barnes–Hut_simulation
 */
function calculateGravity() {
    // Implementation...
}
```

### Commit Messages

Follow conventional commits:

```bash
# Format: <type>: <description>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Formatting, no code change
refactor: # Code restructuring
perf:     # Performance improvement
test:     # Adding tests
chore:    # Maintenance

# Examples:
git commit -m "feat: add color-blind mode"
git commit -m "fix: particle collision detection"
git commit -m "docs: clarify installation steps"
git commit -m "perf: optimize rendering loop"
git commit -m "refactor: extract physics to separate file"
```

═══════════════════════════════════════════════════════════════════════════════

## 🧪 Testing Requirements

### Browser Testing

Test in these browsers:

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Device Testing

Test on:

- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Phone (375x667)

### Accessibility Testing

Test with:

- ✅ Keyboard only (no mouse)
- ✅ Screen reader (NVDA or VoiceOver)
- ✅ High contrast mode
- ✅ Reduced motion preference

### Performance Testing

Verify:

- ✅ Maintains 60fps under normal load
- ✅ Degrades gracefully under heavy load
- ✅ No memory leaks over time
- ✅ Works on lower-end devices

═══════════════════════════════════════════════════════════════════════════════

## 📮 Submission Process

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open** a Pull Request

### PR Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tested in multiple browsers
- [ ] Mobile responsive
- [ ] Keyboard accessible

## Testing
[Describe how you tested]

## Screenshots
[If applicable]

## Related Issues
Fixes #[issue number]
```

### Review Process

1. **Automated checks** run first
2. **Maintainer review** within 48 hours
3. **Feedback** provided if changes needed
4. **Approval** once requirements met
5. **Merge** by maintainer

### After Merge

- Your contribution is acknowledged in release notes
- You're added to contributors list
- Changes deployed (if applicable)

═══════════════════════════════════════════════════════════════════════════════

## 💬 Community

### Communication Channels

**GitHub:**

- Issues - Bug reports and features
- Discussions - Questions and ideas
- Pull Requests - Code contributions

**Discord:**

- [Join Server](https://discord.gg/forge-theory)
- #general - Casual discussion
- #help - Get assistance
- #showcase - Share your work
- #development - Technical discussion

**Social:**

- Twitter: [@ForgeTheory](https://twitter.com/ForgeTheory)
- YouTube: [Forge Theory](https://youtube.com/@ForgeTheory)

### Getting Help

**Have a question?**

1. Check [documentation](./README.md)
2. Search [existing issues](https://github.com/JamesTheGiblet/forge_theory/issues)
3. Ask in [Discord](https://discord.gg/forge-theory)
4. Open a [new issue](https://github.com/JamesTheGiblet/forge_theory/issues/new)

**Found a bug?**

1. Check if already reported
2. Create minimal reproduction
3. Open issue with details
4. Help others reproduce

### Recognition

Contributors are recognized:

- ✨ In release notes
- 📝 In CONTRIBUTORS.md
- 🏆 In Hall of Fame (significant contributions)
- 💬 Shoutouts on social media

═══════════════════════════════════════════════════════════════════════════════

## 📜 Legal

### License

All contributions are made under the [MIT License](LICENSE).

By contributing, you agree:

- Your code can be used freely
- You have rights to contribute
- You understand the MIT License

### Copyright

- Retain your copyright
- Grant MIT license to project
- Attribution maintained

### Attribution

We believe in:

- Crediting contributors
- Recognizing effort
- Building together

═══════════════════════════════════════════════════════════════════════════════

## 🎯 Priorities

**We prioritize contributions that:**

1. **Improve accessibility** - Help more people learn
2. **Fix bugs** - Make things work better
3. **Add documentation** - Explain more clearly
4. **Enhance education** - Teach more effectively
5. **Create new Forges** - Explore new domains

**We're less interested in:**

- Adding external dependencies
- Obfuscating code
- Breaking changes without good reason
- Features that don't teach emergence

═══════════════════════════════════════════════════════════════════════════════

## 🌟 Thank You

Thank you for contributing to Forge Theory. Every contribution, no matter how small, helps more people understand emergence and complexity science.

**Together, we're making emergence accessible to everyone.** 🚀

═══════════════════════════════════════════════════════════════════════════════

[⬆ Back to Main README](./README.md)

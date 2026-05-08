const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resizeCanvas() {
    const controls = document.querySelector('.controls');
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight - controls.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Particle system
class Particle {
    constructor(x, y, type = ELEMENT_TYPES.HYDROGEN) {
        this.id = particleIdCounter++;
        this.x = x || Math.random() * width;
        this.y = y || Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.type = type;
        this.size = type.size;
        this.mass = type.mass;
        this.energy = Math.random() * 10;
        this.bonded = false;
        this.molecule = null;
        this.trail = [];
        this.maxTrail = 10;
    }

    update(temperature, energyInput) {
        if (this.bonded && this.molecule) {
            // Orbit around molecule center
            const angle = (Date.now() / 1000 + this.orbitalOffset) * this.orbitalSpeed;
            const radius = this.orbitalRadius;
            this.x = this.molecule.x + Math.cos(angle) * radius;
            this.y = this.molecule.y + Math.sin(angle) * radius;
            return;
        }

        // Temperature affects velocity
        const tempFactor = temperature / 50;
        
        // Brownian motion
        this.vx += (Math.random() - 0.5) * 0.5 * tempFactor;
        this.vy += (Math.random() - 0.5) * 0.5 * tempFactor;
        
        // Energy input adds random kicks
        if (Math.random() < energyInput / 1000) {
            this.vx += (Math.random() - 0.5) * 5;
            this.vy += (Math.random() - 0.5) * 5;
        }
        
        // Damping
        this.vx *= 0.99;
        this.vy *= 0.99;
        
        // Max velocity based on temperature
        const maxVel = 2 + tempFactor * 3;
        const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (vel > maxVel) {
            this.vx = (this.vx / vel) * maxVel;
            this.vy = (this.vy / vel) * maxVel;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        
        // Update trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
        
        // Update energy based on velocity
        this.energy = vel * 2;
    }

    draw() {
        // Draw trail
        if (this.trail.length > 1 && !this.bonded) {
            ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // Draw particle
        if (this.bonded) {
            // Bonded atoms glow - use rgba for proper color handling
            const rgb = this.hexToRgb(this.type.color);
            
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
            gradient.addColorStop(0, this.type.color);
            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw core
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Free particles
            ctx.fillStyle = this.type.color;
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }
    }

    hexToRgb(hex) {
        // Convert hex to RGB
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 255, g: 255, b: 255};
    }
}

// Molecule class
class Molecule {
    constructor(particles) {
        this.particles = particles;
        this.x = particles.reduce((sum, p) => sum + p.x, 0) / particles.length;
        this.y = particles.reduce((sum, p) => sum + p.y, 0) / particles.length;
        this.formed = Date.now();
        this.stable = true;
        
        // Proto-cell properties
        this.energy = 100;
        this.integrity = 100;
        this.replications = 0;

        // Determine molecule type
        this.type = this.getMoleculeType();
        this.name = this.getMoleculeName();
        
        // Mark particles as bonded and set orbital positions
        particles.forEach((p, i) => {
            p.bonded = true;
            p.molecule = this;
            p.orbitalRadius = 15 + Math.random() * 10;
            p.orbitalSpeed = 0.5 + Math.random() * 0.5;
            p.orbitalOffset = (i / particles.length) * Math.PI * 2;
            p.x = this.x;
            p.y = this.y;
        });
    }

    getMoleculeType() {
        const formula = this.particles
            .map(p => p.type.symbol)
            .sort()
            .join('');
        
        return formula;
    }

    getMoleculeName() {
        const types = {
            'HH': 'H₂ (Hydrogen)',
            'HO': 'OH (Hydroxyl)',
            'HHO': 'H₂O (Water)',
            'CC': 'C₂ (Dicarbon)',
            'CO': 'CO (Carbon Monoxide)',
            'CCO': 'C₂O',
            'COO': 'CO₂ (Carbon Dioxide)',
            'NN': 'N₂ (Nitrogen)',
            'HN': 'NH',
            'HHN': 'NH₂',
            'HHHN': 'NH₃ (Ammonia)',
            'CN': 'CN (Cyanide)',
            'CHN': 'HCN',
            'NO': 'NO (Nitric Oxide)',
            'NNO': 'N₂O',
            'NOO': 'NO₂',
            'C2H5NO2': 'Glycine (Amino Acid)',
            'C3H6O2': 'Lipid Precursor'
        };
        
        return types[this.type] || this.type;
    }

    draw() {
        const age = Date.now() - this.formed;
        const pulseScale = 1 + Math.sin(age / 300) * 0.15;
        
        // Draw glow around molecule
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 40 * pulseScale);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 40 * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw bonds between particles
        ctx.strokeStyle = '#0FF';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                ctx.beginPath();
                ctx.moveTo(this.particles[i].x, this.particles[i].y);
                ctx.lineTo(this.particles[j].x, this.particles[j].y);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        
        // Draw molecule formula label
        ctx.fillStyle = '#0FF';
        ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(this.type, this.x, this.y - 35);
        ctx.shadowBlur = 0;
    }
}

// A more robust SpatialHash class
class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    getKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    clear() {
        this.grid.clear();
    }

    insert(particle) {
        const key = this.getKey(particle.x, particle.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(particle);
    }

    getNearby(particle) {
        const nearby = new Set();
        const cellX = Math.floor(particle.x / this.cellSize);
        const cellY = Math.floor(particle.y / this.cellSize);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const key = `${cellX + i},${cellY + j}`;
                if (this.grid.has(key)) {
                    for (const p of this.grid.get(key)) {
                        nearby.add(p);
                    }
                }
            }
        }
        return nearby;
    }
}

// Game state
let particles = [];
let molecules = [];
let moleculeTypes = new Map(); // Track unique molecule types
let collisionCount = 0;
let firstMoleculeFormed = false;
let isPaused = true;
let startTime = Date.now();
let elapsedTime = 0;
let pauseStartTime = 0;
let animationId = null;
let totalXP = 0;
let currentLevel = 0;
let abiogenesisTriggered = false;
let thermoTimeInRange = 0;
let abiogenesisFocus = false;
let abiogenesisFocusTarget = null;
let camera = {
    x: width / 2,
    y: height / 2,
    zoom: 1.0,
    targetX: width / 2,
    targetY: height / 2,
    targetZoom: 1.0,
    lerpFactor: 0.02
};
let focusOnNewMolecules = false;
let focusTarget = null;
let currentHelpAchievementId = null;

const GameState = {
    INTRO: 'INTRO',
    ATOMICFORGE: 'ATOMICFORGE',
    PROTOFORGE: 'PROTOFORGE',
    LIFEFORGE: 'LIFEFORGE'
};
let currentGameState = GameState.INTRO;
let protoCell = null;

let particleIdCounter = 0;

const spatialHash = new SpatialHash(50); // Cell size of 50px

let achievementsUnlocked = new Set();

// History tracking for export
let simulationHistory = {
    startTime: new Date().toISOString(),
    events: [],
    snapshots: [],
    achievements: []
};

// Controls
let temperature = 50;
let density = 150;
let energyInput = 20;

document.getElementById('temperature').addEventListener('input', (e) => {
    temperature = parseInt(e.target.value);
    document.getElementById('temp-value').textContent = temperature;
    
    simulationHistory.events.push({
        time: getElapsedTime(),
        type: 'parameter_change',
        parameter: 'temperature',
        value: temperature
    });
});
document.getElementById('proto-temperature').addEventListener('input', (e) => { if(protoCell) protoCell.temperature = parseInt(e.target.value); document.getElementById('proto-temp-value').textContent = e.target.value; });
document.getElementById('temperature').addEventListener('input', updateRealTimeHelp);

document.getElementById('density').addEventListener('input', (e) => {
    density = parseInt(e.target.value);
    document.getElementById('density-value').textContent = density;
    adjustParticleCount();
    
    simulationHistory.events.push({
        time: getElapsedTime(),
        type: 'parameter_change',
        parameter: 'density',
        value: density
    });
});
document.getElementById('proto-energy').addEventListener('input', (e) => { if(protoCell) protoCell.energyFlux = parseInt(e.target.value); document.getElementById('proto-energy-value').textContent = e.target.value; });
document.getElementById('density').addEventListener('input', updateRealTimeHelp);

document.getElementById('energy').addEventListener('input', (e) => {
    energyInput = parseInt(e.target.value);
    document.getElementById('energy-value').textContent = energyInput;
    
    simulationHistory.events.push({
        time: getElapsedTime(),
        type: 'parameter_change',
        parameter: 'energy',
        value: energyInput
    });
});
document.getElementById('energy').addEventListener('input', updateRealTimeHelp);

function adjustParticleCount() {
    const numToAdd = density - particles.length;
    if (numToAdd > 0) {
        for (let i = 0; i < numToAdd; i++) { // Weighted distribution based on level
            const rand = Math.random();
            let type = ELEMENT_TYPES.HYDROGEN; // Default

            if (currentLevel === 1) { // H, O
                if (rand > 0.7) type = ELEMENT_TYPES.OXYGEN;
            } else if (currentLevel >= 2) { // H, O, C, N
                if (rand < 0.70) type = ELEMENT_TYPES.HYDROGEN;
                else if (rand < 0.85) type = ELEMENT_TYPES.CARBON;
                else if (rand < 0.95) type = ELEMENT_TYPES.OXYGEN;
                else type = ELEMENT_TYPES.NITROGEN;
            }
            particles.push(new Particle(null, null, type));
        }
    } else if (numToAdd < 0) {
        const numToRemove = -numToAdd;
        // Remove free particles only
        particles = particles.filter(p => p.bonded || Math.random() > numToRemove / particles.filter(p => !p.bonded).length);
        particles.splice(density);
    }
}

function closeTutorial() {
    document.getElementById('tutorial').style.display = 'none';
    if (isPaused) {
        togglePause(); // Start the simulation
        startTime = Date.now(); // Reset timer to start from 00:00:00
    }
}

function checkIntroAnswer(answer) {
    const feedbackEl = document.getElementById('intro-feedback');
    if (answer === 'emergence') {
        document.querySelector('.intro-answer[onclick*="emergence"]').classList.add('correct');
        feedbackEl.textContent = 'Correct. Welcome, Scientist.';
        feedbackEl.style.color = '#0F6';
        setTimeout(() => {
            document.getElementById('intro-overlay').classList.add('hiding');
        }, 1500);
        setTimeout(() => {
            document.getElementById('intro-overlay').style.display = 'none';
        }, 2500); // Hide after transition
        currentGameState = GameState.ATOMICFORGE;
    } else {
        feedbackEl.textContent = 'Not quite. The goal is observation and guidance, not direct control. Please try again.';
        feedbackEl.style.color = '#F06';
    }
}

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (isPaused) {
        pauseBtn.textContent = '▶ RESUME';
        statusDot.className = 'status-dot paused';
        statusText.textContent = 'PAUSED';
        pauseStartTime = Date.now();
        
        simulationHistory.events.push({
            time: getElapsedTime(),
            type: 'paused',
            particles: particles.length,
            molecules: molecules.length
        });
    } else {
        pauseBtn.textContent = '⏸ PAUSE';
        statusDot.className = 'status-dot';
        statusText.textContent = 'RUNNING';
        
        const pauseDuration = Date.now() - pauseStartTime;
        startTime += pauseDuration;
        
        simulationHistory.events.push({
            time: getElapsedTime(),
            type: 'resumed',
            particles: particles.length,
            molecules: molecules.length
        });
    }
}

function resetSimulation() {
    if (!confirm('Reset simulation? This will clear all progress.')) {
        return;
    }
    
    particles = [];
    molecules = [];
    particleIdCounter = 0;
    moleculeTypes.clear();
    collisionCount = 0;
    abiogenesisTriggered = false;
    currentLevel = 0;
    firstMoleculeFormed = false; // This should be reset on simulation reset
    currentGameState = GameState.INTRO;
    document.getElementById('atomicforge-controls').style.display = 'block';
    document.getElementById('protoforge-controls').style.display = 'none';
    document.getElementById('protoforge-status').style.display = 'none';
    isPaused = true; // Start paused to show tutorial
    startTime = Date.now();
    elapsedTime = 0;
    
    for (const id in ACHIEVEMENTS) {
        ACHIEVEMENTS[id].unlocked = false;
        // Note: progress function will reset naturally with game state
    }
    
    document.getElementById('pause-btn').textContent = '⏸ PAUSE';
    document.getElementById('status-dot').className = 'status-dot';
    document.getElementById('status-text').textContent = 'RUNNING';
    updateLevelUI();
    document.getElementById('level-progress').style.width = '0%';
    
    simulationHistory = {
        startTime: new Date().toISOString(),
        events: [{
            time: 0,
            type: 'reset',
            temperature,
            density,
            energyInput
        }],
        snapshots: [],
        achievements: []
    };
    
    adjustParticleCount();
    updateAchievementsDisplay();
    
    // Show tutorial again on reset
    document.getElementById('tutorial').style.display = 'block';
    // Show intro again on reset
    // Show intro again on reset, but don't change its class if it's already hiding
    const intro = document.getElementById('intro-overlay');
    intro.classList.remove('hidden');
    document.getElementById('intro-feedback').innerHTML = '&nbsp;';

    updateMoleculeList();
}

let focusResetTimer = null;
function setCameraFocus(target, zoomLevel = 3.0, duration = 5000) {
    focusTarget = target;
    camera.targetZoom = zoomLevel;

    if (focusResetTimer) {
        clearTimeout(focusResetTimer);
    }

    focusResetTimer = setTimeout(() => {
        focusTarget = null;
        camera.targetX = width / 2;
        camera.targetY = height / 2;
        camera.targetZoom = 1.0;
    }, duration);
}

function toggleFocusMode() {
    focusOnNewMolecules = !focusOnNewMolecules;
    const btn = document.getElementById('focus-toggle-btn');
    btn.textContent = `🔬 FOCUS: ${focusOnNewMolecules ? 'ON' : 'OFF'}`;
    btn.classList.toggle('toggled', focusOnNewMolecules);
}

function getElapsedTime() {
    if (isPaused) {
        return elapsedTime;
    }
    elapsedTime = Date.now() - startTime;
    return elapsedTime;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimer() {
    const elapsed = getElapsedTime();
    document.getElementById('timer').textContent = formatTime(elapsed);
}

function updateMoleculeList() {
    const listDiv = document.getElementById('molecule-types');
    if (moleculeTypes.size === 0) {
        listDiv.innerHTML = '<em style="opacity: 0.5;">None yet...</em>';
    } else {
        listDiv.innerHTML = Array.from(moleculeTypes.entries())
            .map(([type, count]) => `<div class="molecule-item">${type}: ${count}</div>`)
            .join('');
    }
}

function exportData() {
    const exportData = {
        metadata: {
            exportTime: new Date().toISOString(),
            totalRunTime: formatTime(getElapsedTime()),
            version: '2.0.0',
            totalXP: totalXP
        },
        parameters: {
            temperature,
            density,
            energyInput
        },
        statistics: {
            totalParticles: particles.length,
            totalMolecules: molecules.length,
            uniqueMoleculeTypes: moleculeTypes.size,
            moleculeBreakdown: Object.fromEntries(moleculeTypes),
            totalCollisions: collisionCount,
            averageEnergy: particles.reduce((sum, p) => sum + p.energy, 0) / particles.length || 0
        },
        achievements: {
            unlocked: Array.from(achievementsUnlocked),
            total: Object.keys(ACHIEVEMENTS).length,
            percentage: Math.round((achievementsUnlocked.size / Object.keys(ACHIEVEMENTS).length) * 100),
            details: Object.values(ACHIEVEMENTS).map(a => ({
                id: a.id,
                title: a.title,
                unlocked: a.unlocked,
                xp: a.xp
            }))
        },
        history: simulationHistory,
        currentState: {
            particles: particles.map(p => ({
                x: p.x,
                y: p.y,
                type: p.type.symbol,
                bonded: p.bonded
            })),
            molecules: molecules.map(m => ({
                type: m.type,
                name: m.name,
                particleCount: m.particles.length,
                age: Date.now() - m.formed
            }))
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atomicforge_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    simulationHistory.events.push({
        time: getElapsedTime(),
        type: 'exported',
        format: 'json'
    });
}

function exportImage() {
    const wasPaused = isPaused;
    if (!wasPaused) {
        isPaused = true;
    }
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d');
    
    exportCtx.fillStyle = '#000';
    exportCtx.fillRect(0, 0, width, height);
    
    // Draw molecules first
    for (let molecule of molecules) {
        const age = Date.now() - molecule.formed;
        const pulseScale = 1 + Math.sin(age / 300) * 0.15;
        
        const gradient = exportCtx.createRadialGradient(molecule.x, molecule.y, 0, molecule.x, molecule.y, 40 * pulseScale);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        exportCtx.fillStyle = gradient;
        exportCtx.beginPath();
        exportCtx.arc(molecule.x, molecule.y, 40 * pulseScale, 0, Math.PI * 2);
        exportCtx.fill();
        
        exportCtx.strokeStyle = '#0FF';
        exportCtx.lineWidth = 2;
        exportCtx.globalAlpha = 0.6;
        for (let i = 0; i < molecule.particles.length; i++) {
            for (let j = i + 1; j < molecule.particles.length; j++) {
                exportCtx.beginPath();
                exportCtx.moveTo(molecule.particles[i].x, molecule.particles[i].y);
                exportCtx.lineTo(molecule.particles[j].x, molecule.particles[j].y);
                exportCtx.stroke();
            }
        }
        exportCtx.globalAlpha = 1;
        
        exportCtx.fillStyle = '#0FF';
        exportCtx.font = 'bold 14px "Courier New"';
        exportCtx.textAlign = 'center';
        exportCtx.fillText(molecule.type, molecule.x, molecule.y - 35);
    }
    
    // Draw particles
    for (let particle of particles) {
        if (particle.bonded) {
            // Convert hex to rgb for proper alpha handling
            const hex = particle.type.color;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            const rgb = result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : {r: 255, g: 255, b: 255};
            
            const gradient = exportCtx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3);
            gradient.addColorStop(0, particle.type.color);
            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            exportCtx.fillStyle = gradient;
            exportCtx.beginPath();
            exportCtx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
            exportCtx.fill();
            
            exportCtx.fillStyle = particle.type.color;
            exportCtx.beginPath();
            exportCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            exportCtx.fill();
        } else {
            exportCtx.fillStyle = particle.type.color;
            exportCtx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
        }
    }
    
    // Add metadata overlay
    exportCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    exportCtx.fillRect(10, 10, 350, 120);
    exportCtx.strokeStyle = '#0FF';
    exportCtx.lineWidth = 2;
    exportCtx.strokeRect(10, 10, 350, 120);
    
    exportCtx.fillStyle = '#0FF';
    exportCtx.font = 'bold 16px "Courier New"';
    exportCtx.textAlign = 'left';
    exportCtx.fillText('ATOMICFORGE - Level 0', 20, 35);
    exportCtx.font = '14px "Courier New"';
    exportCtx.fillText(`Time: ${formatTime(getElapsedTime())}`, 20, 60);
    exportCtx.fillText(`Particles: ${particles.length} | Molecules: ${molecules.length}`, 20, 80);
    exportCtx.fillText(`Unique Types: ${moleculeTypes.size}`, 20, 100);
    exportCtx.fillText(`Temp: ${temperature}°K | Density: ${density}`, 20, 120);
    
    exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `atomicforge_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        if (!wasPaused) {
            isPaused = false;
        }
        
        simulationHistory.events.push({
            time: getElapsedTime(),
            type: 'exported',
            format: 'image'
        });
    });
}

function showAchievement(moleculeName) {
    if (firstMoleculeFormed) return;
    firstMoleculeFormed = true;
    
    const achievement = document.getElementById('achievement');
    const desc = document.getElementById('achievement-desc');
    desc.innerHTML = `From chaos, order emerges.<br>You have formed ${moleculeName}!`;
    achievement.classList.add('show');
    
    setTimeout(() => {
        achievement.classList.remove('show');
    }, 4000);
}

function canBond(p1, p2) {
    // Simple bonding rules based on element types
    const bond = [p1.type.symbol, p2.type.symbol].sort().join('-');
    
    // Define allowed bonds
    const allowedBonds = [
        'H-H', 'H-C', 'H-O', 'H-N',
        'C-C', 'C-O', 'C-N',
        'O-O', 'N-N', 'N-O'
    ];
    
    return allowedBonds.includes(bond);
}

function resolveCollision(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) distance = 0.001; // prevent division by zero

    // Normal vector (direction of collision)
    const nx = dx / distance;
    const ny = dy / distance;

    // Tangent vector
    const tx = -ny;
    const ty = nx;

    // Project velocities onto normal and tangent vectors
    const dpTan1 = p1.vx * tx + p1.vy * ty;
    const dpTan2 = p2.vx * tx + p2.vy * ty;

    const dpNorm1 = p1.vx * nx + p1.vy * ny;
    const dpNorm2 = p2.vx * nx + p2.vy * ny;

    // Conservation of momentum in 1D (along the normal)
    const m1 = (dpNorm1 * (p1.mass - p2.mass) + 2 * p2.mass * dpNorm2) / (p1.mass + p2.mass);
    const m2 = (dpNorm2 * (p2.mass - p1.mass) + 2 * p1.mass * dpNorm1) / (p1.mass + p2.mass);

    // Update velocities
    p1.vx = tx * dpTan1 + nx * m1;
    p1.vy = ty * dpTan1 + ny * m1;
    p2.vx = tx * dpTan2 + nx * m2;
    p2.vy = ty * dpTan2 + ny * m2;

    // Separate overlapping particles to prevent sticking
    const overlap = (p1.size + p2.size + 2) - distance;
    if (overlap > 0) {
        const separationX = nx * overlap * 0.5;
        const separationY = ny * overlap * 0.5;
        p1.x -= separationX;
        p1.y -= separationY;
        p2.x += separationX;
        p2.y += separationY;
    }
}

function checkCollisions(tempFactor) {
    // 1. Clear and rebuild the hash grid each frame
    spatialHash.clear();
    for (const particle of particles) {
        if (!particle.bonded) {
            spatialHash.insert(particle);
        }
    }

    // 2. Iterate through particles and check only against nearby ones
    for (const p1 of particles) {
        if (p1.bonded) continue;

        const nearbyParticles = spatialHash.getNearby(p1);
        for (const p2 of nearbyParticles) {
            // Avoid self-collision and duplicate checks (p1.id < p2.id)
            if (p1.id >= p2.id || p2.bonded) continue;

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const collisionDist = p1.size + p2.size + 2;

            if (dist < collisionDist) {
                collisionCount++;

                // Collision flash
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
                ctx.fill();

                // Bonding probability is highest around 50K and lower at the edges.                        
                const bondingChance = 0.005 * tempFactor;

                // Check for bonding
                if (canBond(p1, p2) &&
                    temperature > 25 && temperature < 75 &&
                    Math.random() < bondingChance) {

                    // Form molecule!
                    const molecule = new Molecule([p1, p2]);
                    molecules.push(molecule);

                    // Track molecule types
                    const count = moleculeTypes.get(molecule.name) || 0;
                    moleculeTypes.set(molecule.name, count + 1);
                    updateMoleculeList();

                    if (!firstMoleculeFormed) {
                        showAchievement(molecule.name);
                    }

                    simulationHistory.events.push({
                        time: getElapsedTime(),
                        type: 'molecule_formed',
                        moleculeType: molecule.type,
                        moleculeName: molecule.name
                    });
                } else {
                    resolveCollision(p1, p2);
                }
            }
        }
    }
}

function checkMoleculeReactions() {
    if (currentLevel < 2) return; // Reactions start becoming important in level 2

    for (const molecule of molecules) {
        if (molecule.particles.length >= 10) continue; // Cap complexity for performance

        const nearbyParticles = spatialHash.getNearby(molecule.particles[0]);
        for (const particle of nearbyParticles) {
            if (particle.bonded) continue;

            const dist = Math.sqrt(Math.pow(molecule.x - particle.x, 2) + Math.pow(molecule.y - particle.y, 2));
            if (dist < 30) { // Interaction radius for molecule-particle
                const reactionChance = 0.0001 * (temperature / 50); // Simple temp factor for now
                if (Math.random() < reactionChance) {
                    // A new particle joins the molecule
                    const oldMoleculeName = molecule.name;
                    moleculeTypes.set(oldMoleculeName, (moleculeTypes.get(oldMoleculeName) || 1) - 1);
                    if (moleculeTypes.get(oldMoleculeName) <= 0) {
                        moleculeTypes.delete(oldMoleculeName);
                    }

                    particle.bonded = true;
                    particle.molecule = molecule;
                    molecule.particles.push(particle);
                    
                    // Recalculate properties
                    molecule.type = molecule.getMoleculeType();
                    molecule.name = molecule.getMoleculeName();
                    
                    const newMoleculeName = molecule.name;
                    moleculeTypes.set(newMoleculeName, (moleculeTypes.get(newMoleculeName) || 0) + 1);
                    
                    if (focusOnNewMolecules) {
                        setCameraFocus(molecule, 4.0);
                    }

                    updateMoleculeList();
                    return; // One reaction per frame to avoid chaos
                }
            }
        }
    }
}

function updateRealTimeHelp() {
    if (!currentHelpAchievementId) return;

    const helpData = ACHIEVEMENT_HELP[currentHelpAchievementId];
    if (!helpData) return;

    // Update progress
    updateHelpProgress(currentHelpAchievementId, helpData);

    // Update parameter highlighting
    const params = helpData.parameters;
    if (params) {
        updateParamHighlight('temperature', temperature, params.temperature);
        updateParamHighlight('density', density, params.density);
        updateParamHighlight('energy', energyInput, params.energy);
    }
}

function updateParamHighlight(paramName, currentValue, recommendedValue) {
    const paramElement = document.getElementById(`help-param-${paramName}`);
    if (!paramElement) return;

    const statusElement = paramElement.querySelector('.param-status');
    paramElement.classList.remove('in-range', 'out-of-range');

    if (recommendedValue.toLowerCase() === 'any') {
        statusElement.textContent = '';
        return;
    }

    let min, max;
    if (recommendedValue.includes('-')) {
        [min, max] = recommendedValue.match(/\d+/g).map(Number);
    } else if (recommendedValue.includes('+')) {
        min = Number(recommendedValue.match(/\d+/)[0]);
        max = Infinity;
    } else {
        min = max = Number(recommendedValue.match(/\d+/)[0]);
    }

    if (currentValue >= min && currentValue <= max) {
        paramElement.classList.add('in-range');
        statusElement.textContent = '✓';
        statusElement.style.color = 'var(--success-color)';
    } else {
        paramElement.classList.add('out-of-range');
        if (currentValue < min) {
            statusElement.textContent = '▲'; // Needs to go up
        } else {
            statusElement.textContent = '▼'; // Needs to go down
        }
        statusElement.style.color = 'var(--warning-color)';
    }
}

function transitionToLifeForge(protoCell) {
    // This function will be expanded to initialize the LifeForge simulation
}

function transitionToProtoForge(createdProtoCell) {
    currentGameState = GameState.PROTOFORGE;
    protoCell = createdProtoCell;
    
    // Set camera focus on the new proto-cell
    abiogenesisFocus = false;
    camera.targetX = width / 2;
    camera.targetY = height / 2;
    camera.targetZoom = 1.0;
    setCameraFocus(protoCell, 6.0, 999999); // Long duration focus

    console.log("Transitioning to LifeForge with proto-cell:", protoCell);
    // Hide AtomicForge elements and show ProtoForge UI
    document.getElementById('atomicforge-controls').style.display = 'none';
    document.getElementById('protoforge-controls').style.display = 'block';
    document.getElementById('protoforge-status').style.display = 'block';
    document.querySelector('.level-title').textContent = 'PROTOFORGE - Level 3';

    // Fade out other particles/molecules
    particles.forEach(p => { if (p.molecule !== protoCell) p.fade = true; });
    molecules.forEach(m => { if (m !== protoCell) m.fade = true; });

    const overlay = document.getElementById('abiogenesis-overlay');
    const title = document.getElementById('abiogenesis-title');
    
    // For now, we can just display a message and reset
    overlay.classList.add('show');

    setTimeout(() => { title.textContent = "From chemistry, biology..."; }, 1000);
    setTimeout(() => { title.textContent = "Nurture the spark of life."; }, 5000);
    setTimeout(() => { overlay.classList.remove('show'); }, 8000);
}

function transitionToFullLifeForge() { // Renamed to avoid conflict
    currentGameState = GameState.LIFEFORGE;
    console.log("Transitioning to LifeForge with evolved genome:", protoCell.genome);

    const overlay = document.getElementById('abiogenesis-overlay');
    const title = document.getElementById('abiogenesis-title');
    overlay.classList.add('show');
    title.textContent = "LIFEFORGE";

    setTimeout(() => {
        const overlay = document.getElementById('abiogenesis-overlay');
        overlay.classList.remove('show');
        alert("Congratulations! You've reached LifeForge. The simulation will now reset to demonstrate the complete loop. The next phase of development starts here!");
        alert("Congratulations! You have successfully nurtured the first cell. The simulation will now reset as we prepare to build the full LifeForge stage.");
        resetSimulation();
    }, 5000);
}

class AbiogenesisDetector {
    check() {
        if (abiogenesisTriggered || currentLevel < 3) return;
        if (currentGameState !== GameState.ATOMICFORGE || abiogenesisTriggered || currentLevel < 3) return;

        const hasLipids = (moleculeTypes.get('Lipid Precursor') || 0) > 5;
        const hasAminoAcids = (moleculeTypes.get('Glycine (Amino Acid)') || 0) > 5;
        const hasWater = moleculeTypes.has('H₂O (Water)')

        if (hasLipids && hasAminoAcids && hasWater && Math.random() < 0.0001) { // Made it rarer for dramatic effect
            this.trigger();
        }
    }

    trigger() {
        if (abiogenesisTriggered) return;
        abiogenesisTriggered = true;
        console.log("ABIOGENESIS TRIGGERED!");
        
        // 1. Pause the simulation immediately
        if (!isPaused) {
            togglePause();
        }
        console.log("Proto-cell formation detected! Transitioning to ProtoForge.");

        // 2. Set up the camera focus
        abiogenesisFocus = true;
        abiogenesisFocusTarget = molecules.find(m => m.name === 'Glycine (Amino Acid)') || molecules[molecules.length - 1];
        if (abiogenesisFocusTarget) {
            camera.targetZoom = 8.0; // Zoom in 8x
        }

        // 2. Find a "proto-cell" to focus on (a complex molecule)
        const protoCell = molecules.find(m => m.name === 'Glycine (Amino Acid)') || molecules[molecules.length - 1];

        // 3. Start the celebration sequence
        const overlay = document.getElementById('abiogenesis-overlay');
        const title = document.getElementById('abiogenesis-title');
        
        overlay.classList.add('show');

        setTimeout(() => {
            title.textContent = "From chaos, order emerges...";
        }, 1000);

        setTimeout(() => {
            title.textContent = "From chemistry, biology...";
        }, 5000);

        setTimeout(() => {
            title.textContent = "And life... ignites.";
            unlockAchievement('abiogenesis'); // Unlock the achievement at the peak moment
        }, 9000);

        // 4. After the sequence, transition to LifeForge
        setTimeout(() => {
            transitionToFullLifeForge(protoCell);
        }, 14000);
        unlockAchievement('abiogenesis');
        transitionToProtoForge(protoCell);
    }
}
const abiogenesisDetector = new AbiogenesisDetector();

// Cache DOM elements for stats
const statElements = {
    particleCount: document.getElementById('particle-count'),
    moleculeCount: document.getElementById('molecule-count'),
    uniqueMolecules: document.getElementById('unique-molecules'),
    collisionCount: document.getElementById('collision-count'),
    avgEnergy: document.getElementById('avg-energy')
};

// Cache DOM elements for popups
const levelUpPopupElements = {
    popup: document.getElementById('level-up-popup'),
    subtitle: document.getElementById('level-up-subtitle'),
    unlocks: document.getElementById('level-up-unlocks')
};

function updateStats() {
    statElements.particleCount.textContent = particles.length;
    statElements.moleculeCount.textContent = molecules.length;
    statElements.uniqueMolecules.textContent = moleculeTypes.size;
    statElements.collisionCount.textContent = collisionCount;
    
    const freeParticles = particles.filter(p => !p.bonded);
    const avgEnergy = freeParticles.length > 0 
        ? freeParticles.reduce((sum, p) => sum + p.energy, 0) / freeParticles.length
        : 0;
    statElements.avgEnergy.textContent = avgEnergy.toFixed(1);
}

function updateLevelUI() {
    const levelTitle = document.querySelector('.level-title');
    if (levelTitle) {
        levelTitle.textContent = `ATOMICFORGE - Level ${currentLevel}`;
    }
}

function updateLevelProgress() {
    if (currentLevel >= LEVEL_DEFINITIONS.length) return; // Max level reached

    const levelDef = LEVEL_DEFINITIONS[currentLevel];
    const progress = levelDef.getProgress();
    document.getElementById('level-progress').style.width = progress + '%';

    if (progress >= 100 && levelDef.checkCompletion()) {
        levelUp();
    }
}

function levelUp() {
    currentLevel++;
    totalXP += LEVEL_DEFINITIONS[currentLevel - 1].xp_reward;
    updateLevelUI();
    showLevelUp(currentLevel);
}

function showLevelUp(newLevel) {
    levelUpPopupElements.subtitle.textContent = `You've reached Level ${newLevel}!`;
    if (newLevel < LEVEL_DEFINITIONS.length) {
        levelUpPopupElements.unlocks.innerHTML = `<strong>New Unlock:</strong> ${LEVEL_DEFINITIONS[newLevel-1].unlocks}`;
    } else {
        levelUpPopupElements.unlocks.innerHTML = `<strong>Congratulations!</strong> You have reached the maximum level for this demo.`;
    }
    levelUpPopupElements.popup.classList.add('show');
    setTimeout(() => levelUpPopupElements.popup.classList.remove('show'), 4000);
}

// Animation loop
let lastSnapshotTime = 0;

function animate() {
    updateTimer();
    
    if (isPaused && !abiogenesisFocus) {
        animationId = requestAnimationFrame(animate);
        return;
    }

    ctx.save();

    // Camera movement and zoom
    if (abiogenesisFocus && abiogenesisFocusTarget) {
        camera.targetX = abiogenesisFocusTarget.x;
        camera.targetY = abiogenesisFocusTarget.y;
    }
    camera.x += (camera.targetX - camera.x) * camera.lerpFactor;
    camera.y += (camera.targetY - camera.y) * camera.lerpFactor;
    camera.zoom += (camera.targetZoom - camera.zoom) * camera.lerpFactor;

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Calculate temperature factor once per frame for use in other functions
    const optimalTemp = 50;
    const tempDifference = Math.abs(temperature - optimalTemp);
    const tempFactor = Math.max(0, 1 - (tempDifference / 25)); // Max reduction at 25 and 75

    // Take periodic snapshots
    const currentTime = getElapsedTime();
    if (currentTime - lastSnapshotTime > 10000) {
        simulationHistory.snapshots.push({
            time: currentTime,
            particles: particles.length,
            molecules: molecules.length,
            uniqueTypes: moleculeTypes.size,
            collisions: collisionCount,
            temperature,
            density,
            energyInput
        });
        lastSnapshotTime = currentTime;
    }
    
    // Clear with trail effect
    const inverseZoom = 1 / camera.zoom;
    ctx.fillStyle = abiogenesisFocus ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(camera.x - (width / 2) * inverseZoom, camera.y - (height / 2) * inverseZoom, width * inverseZoom, height * inverseZoom);

    // Update and draw particles
    for (let particle of particles) {
        if (!isPaused) {
            particle.update(temperature, energyInput);
        }
        if (abiogenesisFocus && (!particle.molecule || particle.molecule.id !== abiogenesisFocusTarget.id)) {
            ctx.globalAlpha = 0.1; // Fade out non-target particles
        }
        particle.draw();
        ctx.globalAlpha = 1.0;
    }

    // Check collisions
    if (!isPaused) {
        checkCollisions(tempFactor);
    }

    // Check for more complex reactions
    if (!isPaused) {
        checkMoleculeReactions();
    }

    // Check for the ultimate emergence
    if (!isPaused) {
        abiogenesisDetector.check();
    }

    // Draw molecules
    for (let molecule of molecules) {
        if (abiogenesisFocus && molecule.id !== abiogenesisFocusTarget.id) {
            ctx.globalAlpha = 0.1; // Fade out non-target molecules
        }
        molecule.draw();
        ctx.globalAlpha = 1.0;
    }

    // Update stats
    updateStats();
    
    // Update Level Progress
    updateLevelProgress();

    if (currentGameState === GameState.PROTOFORGE && protoCell) {
        protoCell.updateProtoCell();
        const statusDiv = document.getElementById('protoforge-status');
        statusDiv.innerHTML = `
            <h3>Proto-Cell Status</h3>
            

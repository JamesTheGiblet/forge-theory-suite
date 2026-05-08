# ⬡ DATA CUBE

> *One fact. Six perspectives. Infinite depth. It moves.*

A single-file, offline-first, holographic 3D knowledge system. No server. No API. No dependencies. Drop the HTML in a browser and watch your knowledge **grow, cluster, fission, and reorder itself** in real time.

---

## What It Is

Data Cube is a personal knowledge tool built around one idea: **a fact alone is incomplete**. Every piece of knowledge has a counter-argument, a cultural lens, a speculative edge, a historical frame, and an unresolved question. Data Cube makes these visible — literally — by mapping them onto the six faces of a rotating 3D cube.

Each cube is a topic. Each face is a **perspective lens**. Rotate to change your viewpoint.

But the system doesn't stop at one cube. As you add knowledge, cubes **attract each other** based on keyword similarity, **drift together** in real time, **form clusters** with merged vocabularies, and **split (fission)** when they grow too large or diverse. **The space reorganises itself continuously. You watch it learn.**

---

## The Six Lenses

| Face | Lens | Colour | Purpose |
|------|------|--------|---------|
| Front | **◈ FACT** | Cyan | The prime verifiable statement that seeds the cube |
| Back | **⊘ COUNTER** | Red | The refutation, opposing argument, or challenge |
| Left | **◎ OPINION** | Purple | A personal, cultural, or subjective perspective |
| Right | **◇ FICTION** | Amber | A speculative, narrative, or imagined take |
| Top | **⊡ CONTEXT** | Green | Historical, scientific, or wider framing |
| Bottom | **? UNKNOWN** | Grey | What remains unresolved, uncertain, or unexplained |

A fully filled cube is a complete knowledge unit — six ways of seeing the same thing, held in the same object.

---

## How It Grows

This is a **living knowledge organism**. The space reorganises itself continuously.

### Scale 1 — The Face

A single perspective. Six per cube. The atomic unit.

### Scale 2 — The Cube

A complete topic. One fact seen through all six lenses.

### Scale 3 — The Cluster

When related cubes share enough keywords, they **drift together** and lock into a cluster. Black Holes, Light Speed, and Quantum Mechanics form a PHYSICS cluster. The cluster has its own merged vocabulary and visual label.

### Scale 4 — The Domain

Clusters group into domains. PHYSICS + BIOLOGY + CHEMISTRY converge into a SCIENCE domain. The space becomes a galaxy — dense cores with connective tissue between them.

### Continuous Reorganisation

Every new entry triggers a re-score:

- Cubes with growing keyword overlap **drift toward each other** in real time
- Orphan cubes with enough shared vocabulary **get pulled into** existing clusters
- Clusters that grow too large **fission** into two sub-clusters that drift apart, with explosion animations
- **Edges** glow between related cubes, fading with distance

Nothing is permanently placed. The system has its own opinion about where things belong, and it updates that opinion as it learns.

---

## What You See

- **Zoomed out** — clusters appear as glowing formations with topic labels
- **Zoomed in** — clusters dissolve into individual cubes
- **Zoomed in further** — face text becomes readable

Three levels of resolution. The same continuous 3D space.

---

## How To Use It

### Adding a Fact

Type into the input bar, hit Enter or `+`. If no strong match exists, your entry becomes the **FACT face** of a new cube.

### Filling Perspectives

Add related entries. The rule-based classifier suggests the right lens:

- *"however", "wrong", "contrary"* → **COUNTER**
- *"think", "believe", "perspective"* → **OPINION**
- *"imagine", "story", "what if"* → **FICTION**
- *"history", "research", "origin"* → **CONTEXT**
- *"unknown", "mystery", "unresolved"* → **UNKNOWN**

Confident matches auto-route. Ambiguous ones open the **Lens Picker**.

### Tapping Faces

- **Filled face** → expand overlay showing full text, timestamp, confidence score, and delete option
- **Empty face** → Lens Picker to add directly to that slot

### Navigation

- **Drag** to orbit the scene
- **Scroll** (desktop) or **pinch** (mobile) to zoom
- **Pip row** under each cube shows filled lenses, colour-coded by type

### Importing

Use the **↓ import button** to drop `.txt`, `.md`, `.csv`, or `.json` files, or paste lines directly. Each line seeds a new FACT cube.

### Searching

**Ctrl+F** (or Cmd+F) opens the search panel. Filter by lens, search keywords, and jump directly to cubes in 3D. Results are sorted by confidence and matching text is highlighted.

### Layer View

**Ctrl+L** (or Cmd+L) opens the layer panel. View all entries for a specific lens across every cube, sorted by confidence score. Click any card to jump to the cube in 3D.

### Timeline

Click the **clock icon** to open timeline view. Scrub through history to see how your knowledge evolved. Cubes appear and faces update as you move through time.

### Export

Click the **export icon** to download a JSON snapshot of your entire graph — topics, entries, timestamps, and top keywords — for use in other tools or as a backup.

### Theme Toggle

Click the **moon/sun icon** to switch between dark and light themes. Your preference is saved.

### Delete Cubes

From any expanded entry, click **DELETE CUBE** to remove it permanently (with confirmation).

---

## Confidence Scoring

Every entry is scored the moment it is committed — no AI, no API, pure signal analysis.

### Face Confidence (0–100)

Each face entry receives a confidence score based on three components:

- **Lens keyword density** (50pts) — how many of that lens's signal words are present. FACT scores on absence of hedge language instead
- **Entry substance** (30pts) — word count plus unique vocabulary density, rewards rich detailed entries
- **Specificity bonus** (20pts) — bigram count rewards multi-word concrete concepts over vague single words

### Cube Integrity Score (0–100)

A composite of completeness and quality: `(filled faces / 6) × 40% + (average face confidence) × 60%`. A half-filled cube of strong entries scores higher than a fully-filled cube of weak ones.

### Grades

| Score | Grade |
|-------|-------|
| 90–100 | **CRYSTALLINE** |
| 65–89  | **COHERENT** |
| 35–64  | **FORMING** |
| 0–34   | **SPARSE** |

### Where Scores Appear

- **Each face** — coloured confidence bar along the bottom edge, percentage on hover
- **Cube label** — integrity badge top-right, colour-shifts from grey → cyan → white → glowing as it climbs
- **Expand overlay** — animated confidence bar with grade label
- **Search panel** — mini confidence bar under every result
- **Layer panel** — cards sorted highest confidence first, with grade label

---

## The Intelligence Layer

The classifier is entirely **rule-based and offline** — no AI API, no internet, no external calls.

### How It Works

1. **Tokenisation** — strips stopwords, extracts keywords and bigrams
2. **Similarity scoring** — compares entry tokens against each cube's vocabulary (bigrams count double)
3. **Stem matching** — partial root comparison catches plurals and conjugations
4. **Lens detection** — language cue lists per lens suggest the right face
5. **Three-tier routing:**
   - Score ≥ 42% → auto-routes silently
   - Score 12–41% → opens Lens Picker
   - Score < 12% → new cube spawned automatically

### Memory

Every entry feeds the cube's keyword vocabulary. Every cluster merger combines those vocabularies. The system gets smarter the more you use it — entirely without AI, entirely from the structure of what you have already put in.

Memory persists across sessions via `localStorage`.

### Gravity and Clusters

- **Attraction** — keyword similarity pulls cubes together continuously
- **Repulsion** — overcrowding pushes cubes apart (inverse square law)
- **Edges** — lines connect related cubes, opacity scales with similarity and proximity
- **Cluster detection** — connected components of ≥ 3 cubes get a floating label and merged vocabulary
- **Fission** — when cluster variance > 0.6 or size > 12, it splits via k-means with explosion animation

---

## Architecture

```
datacube.html              ← entire application, single file
│
├── CSS                    ← holographic aesthetic, light/dark themes
│   ├── CSS 3D transforms
│   ├── Per-lens colour variables
│   ├── Animated star field (canvas)
│   ├── Perspective grid floor
│   └── Theme system with color-mix()
│
├── Classifier             ← pure JS, zero dependencies
│   ├── Tokeniser + stopword filter
│   ├── Bigram extractor
│   ├── Similarity scorer (TF-IDF style)
│   ├── Stem-lite root matcher
│   └── Lens cue detector
│
├── Confidence Engine      ← quality scoring layer
│   ├── Face confidence scorer (lens density + substance + specificity)
│   ├── Cube integrity composite (completeness × quality)
│   ├── Grade classifier (SPARSE → CRYSTALLINE)
│   └── Visual output (face bars, cube badge, expand overlay, panels)
│
├── Gravity Engine         ← continuous spring-force simulation
│   ├── Attraction (keyword similarity)
│   ├── Repulsion (inverse square law)
│   ├── Velocity damping and capping
│   └── Centre gravity to contain drift
│
├── Cluster Engine         ← emergent organisation
│   ├── Graph-based cluster detection
│   ├── Merged vocabulary per cluster
│   ├── Variance calculation (cosine similarity)
│   ├── Fission detection + k-means split
│   └── Visual cluster labels
│
├── Visual Edges           ← relationship rendering
│   ├── Dynamic line creation
│   ├── Opacity based on similarity and distance
│   └── 3D rotation between cubes
│
├── Timeline View          ← temporal exploration
│   ├── Time-range detection
│   ├── Canvas visualisation of cluster events
│   ├── Slider scrubbing through history
│   └── Face filtering by timestamp
│
├── Data Model
│   ├── nodes[]            ← cube objects
│   ├── node.entries[]     ← [{lens, text, addedAt, confidence}]
│   ├── node.memory        ← Map<token, frequency>
│   ├── node.velocity      ← {x,y,z} for gravity simulation
│   ├── clusters[]         ← grouped node formations
│   └── cluster.memory     ← merged vocabulary of all member nodes
│
├── Persistence            ← localStorage, key: datacube_v3
│
└── UI
    ├── 3D orbit (mouse, touch, pinch-zoom)
    ├── Lens picker modal
    ├── Expand overlay (full text + confidence + delete)
    ├── Import modal (drag/drop, paste)
    ├── Search panel (lens filters, keyword highlight, confidence sort)
    ├── Layer view (per-lens card grid, confidence sorted)
    ├── Timeline controls
    ├── Export button (JSON download)
    ├── Theme toggle (dark/light, persisted)
    ├── Toast notifications
    └── Keyboard shortcuts (Ctrl+F, Ctrl+L, Esc)
```

---

## Status

### Implemented ✓

- Six-lens cubes with colour-coded faces
- Rule-based classifier with auto-routing
- Confidence scoring (face + cube integrity)
- Full gravity simulation (attraction/repulsion)
- Cluster detection with visual labels
- Fission (automatic splitting of large clusters)
- Visual edges between related cubes
- Timeline view (scrub through history)
- Light/dark theme toggle
- Export to JSON
- Cube deletion
- Search with lens filters and highlighting
- Layer view by lens type sorted by confidence
- Import from file or paste
- Full persistence (localStorage)
- Mobile touch support
- Keyboard shortcuts

### In Progress / Future

- **Level of Detail (LOD)** — clusters render as solid formations at far zoom, dissolve into cubes as you approach
- **Collaborative mode** — shared cube spaces where multiple people fill different lenses
- **Teaching and debate tools** — assign specific lenses to students or participants
- **Research assistant** — track open questions systematically via UNKNOWN faces

---

## Technical Notes

- **No build step.** Open the `.html` file directly in any modern browser.
- **No external dependencies** beyond two Google Fonts (Orbitron, Share Tech Mono) — works fully offline if fonts are cached.
- **localStorage** is used for persistence. Export provides a full JSON backup.
- **`color-mix()`** requires Chrome 111+, Firefox 113+, or Safari 16.2+.
- **Performance tested** to ~500 cubes with stable 60fps gravity simulation.

---

## Built By

**Giblets Creations** — *I wanted it. So I forged it. Now forge yours.*

*Special thanks to parallel processing, pasta fagioli, and mum.* 🍝

---

*Single file. Zero server. Infinite depth. It moves. The more you feed it, the more it knows where everything belongs.*
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


# 🧬 LifeForge

## A Developmental Biology Simulator

**Watch life emerge from a single cell. LifeForge is an interactive, browser-based simulation that visualizes the principles of developmental biology, showing how genetic code and environmental factors orchestrate the growth of a complex organism.**

</div>

**Navigation:**  

- [Features](#-features)
- [How It Works](#-how-it-works)
- [Interface](#-controls-and-interface)
- [How To Run](#-how-to-run)
- [Roadmap](#-future-ideas)

</p>

<!-- Placeholder for a GIF of the simulation in action -->
<div align="center">
  <img src="https://raw.githubusercontent.com/your-username/lifeforge/main/docs/lifeforge-demo.gif" alt="LifeForge Simulation Demo" width="80%">
  <p><em>(Replace this with a real GIF of your simulation!)</em></p>
</div>

---

## 🌟 What is LifeForge?

LifeForge simulates how a single cell with a simple set of rules can divide, differentiate, and self-organize into a structured organism. It provides a real-time window into the fundamental processes that bridge the gap between genotype (the genetic code) and phenotype (the living form).

By adjusting genetic parameters, environmental conditions, and even intervening directly, you can explore the complex interplay of factors that guide the development of life.

## ✨ Features

- **Cellular Simulation**: Cells are individual agents that age, consume energy, divide, and die (apoptosis).
- **Dynamic Differentiation**: Stem cells differentiate into specialized types (Neural, Muscle, Digestive, etc.) based on chemical gradients.
- **Chemical Signaling**: A dynamic `MorphogenField` simulates the production, diffusion, and decay of chemical signals that guide cell fate.
- **Interactive Parameters**: Control key developmental factors in real-time:
  - Development Speed
  - Mutation Rate
  - Cell Adhesion
  - Division Rate
- **Environmental Factors**: Modify the environment and see the impact on development:
  - **Temperature**: Affects metabolic rate.
  - **Toxicity**: Can damage cells and reduce energy.
  - **Nutrient Levels**: Influences energy production.
- **Emergent Nervous System**: Neural cells can fire, propagate signals to other neurons, and trigger muscle cells to contract, creating simple behaviors.
- **Multiple Visualization Modes**: View the organism in different ways to understand what's happening:
  - **Cell Types**: The default view, colored by cell specialization.
  - **Chemicals**: Visualize the underlying morphogen gradients.
  - **Energy**: See the energy level of each individual cell.
  - **Gene Activity**: A proxy view for cellular activity and readiness to divide.
- **Real-time Analytics**:
  - A stats bar shows total cells, stem cells, divisions, and generation count.
  - A dynamic population chart tracks the count of each cell type over time.
- **Interactive Canvas**:
  - **Pan & Zoom**: Navigate large organisms with mouse/touch controls.
  - **Cell Inspector**: Click on any cell to see its detailed stats (type, age, energy, etc.).
- **Exporting**:
  - Export the current view as a PNG image.
  - Export all cell data and simulation parameters as a JSON file.
  - Export a detailed statistical report as a TXT file.

## 🔬 How It Works

The simulation is built on a few core concepts that work together to create emergent complexity.

1. **The `Cell` Class**: Each cell is an object with properties like `x`, `y`, `type`, `age`, `energy`, and `generation`. In each simulation tick, a cell updates its state, consumes energy, and checks if it's ready to divide.

2. **The `MorphogenField`**: This class manages grids of chemical signals. Cells can produce chemicals, which then diffuse across the grid and decay over time. Other cells read the concentration of these chemicals at their location to make decisions, primarily for differentiation.

3. **The Main `update()` Loop**: This is the heart of the simulator. In each frame, it performs the following steps:
    - Updates the chemical morphogen field.
    - Updates each cell (aging, energy consumption, differentiation).
    - Applies adhesion forces to keep cells clumped together.
    - Updates the nervous system (firing and propagation).
    - Handles cell division, creating new cells in empty adjacent spots.
    - Removes dead cells.
    - Redraws the canvas and updates the stats.

4. **Environmental Influence**: Global `Environment` variables for `temperature`, `toxicity`, and `nutrientLevel` are factored into each cell's update logic, affecting its energy consumption, damage, and production.

## 🕹️ Controls and Interface

The interface is split into the control panel on the left and the visualization area on the right.

### Control Panel

- **Development Controls**:
  - `Start Development`: Begins or resumes the simulation.
  - `Pause`: Pauses the simulation.
  - `Reset View`: Resets pan and zoom to the default state.
  - `Reset to Single Cell`: Resets the entire simulation back to a single stem cell.
- **Parameters**: Sliders to adjust core biological rules.
- **Experiments**: Buttons to preset the simulation for specific developmental patterns (e.g., Bilateral Symmetry, Segmentation).
- **Environmental Factors**: Sliders to control the external conditions of the simulation.
- **Interventions**:
  - `Cause Mutation`: Forces a random mutation event.
  - `Add Stem Cells`: Injects new stem cells into the environment.
  - `Kill Random Cells`: Simulates a traumatic event by killing a percentage of cells.
- **Export**: Buttons to save images, data, or reports.
- **Population Dynamics**: A line chart showing the population of each cell type over time.

### Visualization Area

- **View Mode Selector**: Switch between `Cells`, `Chemicals`, `Energy`, and `Genes` views.
- **Canvas**: The main window where the organism develops.
  - **Click**: Select a cell to view its info.
  - **Click + Drag**: Pan the view.
  - **Scroll Wheel**: Zoom in and out.
- **Stats Bar**: Key metrics at a glance.
- **Cell Legend**: A key for the colors of different cell types.
- **Cell Info Panel**: Appears when a cell is selected, showing its detailed properties.

## 🚀 How To Run

This project is a single, self-contained HTML file with no external dependencies besides Chart.js (which is loaded from a CDN).

1. Clone this repository or download the `lifeforge-1.html` file.
2. Open the `lifeforge-1.html` file in a modern web browser like Chrome, Firefox, or Edge.

That's it! The simulation will load and be ready to run.

## 🛠️ Technical Details

- **Frontend**: HTML5, CSS3, and modern JavaScript (ES6+).
- **Rendering**: The simulation is rendered on an HTML5 `<canvas>` element using its 2D drawing context.
- **Charting**: The population graph is powered by Chart.js.
- **Architecture**: The code is written in a procedural style with classes for core objects (`Cell`, `MorphogenField`) to encapsulate logic. It runs entirely on the client-side.

## 🔮 Future Ideas

- **Genetic Code**: Implement a simple "genome" for each cell that dictates its properties (division rate, differentiation triggers) and can be passed on and mutated.
- **More Complex Interactions**: Add cell-to-cell communication beyond simple morphogens, like direct signaling between adjacent neural cells.
- **Saving & Loading**: Implement functionality to save the state of an organism and load it later to continue the simulation.
- **3D Simulation**: Evolve the project to simulate development in three dimensions for more complex structures.
- **Web Workers**: Offload the main simulation loop to a Web Worker to keep the UI responsive even with thousands of cells.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

> **LifeForge – Where information becomes form.**
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


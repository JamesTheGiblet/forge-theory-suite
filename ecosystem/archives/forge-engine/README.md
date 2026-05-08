🏗️ Forge Engine - Interactive Calculator Framework

Forge Engine is a lightweight, zero-dependency boilerplate for building interactive ROI Calculators, Simulators, and Educational Tools.

It provides a production-ready UI framework (Charts, Sliders, Tabs, Gamification) with a generic mathematical core. Developers can simply "plug in" their specific business logic and CSS theming to launch a custom tool in minutes.
✨ Capabilities

    Reactive Core: Instant feedback loop—charts and metrics update immediately as users slide inputs or toggle switches.

    Modular "Stack" Builder: Built-in logic for a "Shopping Cart" style interface, allowing users to add/remove attributes (e.g., "Add Feature X", "Remove Cost Y").

    Scenario Modeling: Pre-configured logic for "Conservative," "Balanced," and "Aggressive" modeling modes.

    Visual Library: Includes responsive Cards, Tabs, Progress Bars, and a Plotly.js chart integration out of the box.

    Zero Build: No Webpack, React, or Node.js required. Runs entirely in the browser.

🚀 How to Customize

This template is designed to be modified. Follow these three steps to turn it into your own product:
1. Skin the Theme (CSS)

Locate Zone 1 in the <style> block. Change the CSS variables to match your brand:
CSS

:root {
    --primary: #ef4444;   /* Change to Red for a Health App */
    --secondary: #3b82f6; /* Accent Color */
}

2. Define Your Items (Config)

In the <script> tag, modify the config object to define the "Stackable Items" relevant to your domain:
JavaScript

const config = {
    presets: [
        // Example for a Fitness App:
        { id: 1, name: 'Creatine', value: 5, icon: '💪' },
        { id: 2, name: 'Cardio', value: 10, icon: '🏃' }
    ]
};

3. Inject Your Logic (The Brain)

Replace the generic math in the calculateModel(input) function with your specific formula.

Current Placeholder Math:
Value=(Inputs+Stack)×ln(Time)

Example Replacement (e.g., ROI Calculator):
JavaScript

function calculateModel(input) {
    // Your Custom Logic
    let revenue = input.varA * 12; // Monthly to Yearly
    let cost = input.stack.reduce((sum, i) => sum + i.value, 0);
    let profit = revenue - cost;
    
    return {
        // Data expected by the Renderer
        totalValue: profit, 
        efficiency: (profit / revenue) * 100
        // ...
    };
}

📂 Structure

    index.html: Contains everything.

        <style>: CSS Grid/Flexbox layout and theming.

        <body>: The HTML structure (Tabs, Cards, Inputs).

        <script>:

            state: Holds the current user inputs.

            updateEngine(): The main render loop.

            calculateModel(): The domain logic (Edit this!).

            renderChart(): Plotly.js configuration.

🛠️ Tech Stack

    Core: HTML5, CSS3, Vanilla JavaScript (ES6).

    Visualization: Plotly.js.

    Icons: FontAwesome (CDN).

📄 License

MIT License. Free to use for personal or commercial projects.
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


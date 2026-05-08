# 🚀 LinguaForge Quick Start

Welcome to LinguaForge! This guide will help you get the simulation up and running in minutes.

---

## Installation

You can run LinguaForge directly from your local machine.

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/linguaforge.git
cd linguaforge

# 2. Open in browser
# Simply open the linguaforge.html file in any modern web browser.

# (Optional) Or, run a local server:
python -m http.server 8000

# Then visit http://localhost:8000 in your browser.
```

### No Installation Version

Simply open `linguaforge.html` in any modern browser.
**Tip:** If you encounter security errors or "Unsafe attempt" warnings, please use the **Local Server** method described above to satisfy browser security policies.

---

## 🎮 How to Use

Follow this basic workflow to start your first simulation.

### **1. 🌱 Initialize Population**

- Use the sliders to set the **Population Size** (e.g., 20-50 agents).
- Set the **Innovation Rate** (e.g., 5-10%). This is the chance an agent will invent a new word.

#### **2. 🎯 Select Communication Task**

- Use the **Communication Complexity** dropdown to set the challenge for the agents.
  - **Basic**: Agents communicate single concepts like "food" or "water".
  - **Compound**: Agents must combine concepts, like "big food" or "near water". This pressure is key for grammar to emerge.
  - **Complex**: Agents combine multiple concepts, requiring more sophisticated grammar.

#### **3. ▶️ Run Simulation**

- Click the **▶️ Start** button to begin.
- Watch the agents in the **Communication Network** panel.
  - **Green lines** indicate a successful communication.
  - **Red lines** indicate a failure.
- The simulation progresses in generations. You can pause and resume at any time.

#### **4. 📈 Observe Language Emergence**

- **Language Metrics**: Key stats like vocabulary size and success rate are updated in real-time.
- **Common Vocabulary**: See the most-used words across the population.
- **Emerging Grammar**: Watch as patterns like "X X" (two-word phrases) become common.
- **Success Rate Graph**: See how communication effectiveness changes over generations.

#### **5. 🔬 Analyze Results**

- Click an agent in the network to see its personal vocabulary in the **Event Log**.
- Use the **Translation Test** to see how different agents express a specific concept.
- Click **💾 Export Data** to save a JSON file of the current simulation state for deeper analysis.

---

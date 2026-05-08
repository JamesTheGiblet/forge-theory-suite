# BuddAI Lite (Fluffy Bot / Cool Boy / Architect) 🎭

> A lightweight demonstration of BuddAI's multi-personality chat interface

## Project-Aware Tech Chat Assistant

> A multi-personality chatbot that learns your interests, tracks your projects, and adapts to your expertise level - all while keeping your data private and costing nothing to run.

![Version](https://img.shields.io/badge/version-2.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Build Time](https://img.shields.io/badge/build%20time-2%20hours-orange)
![GitHub stars](https://img.shields.io/github/stars/jamesthegiblet/BuddAI-Lite?style=social)
![GitHub forks](https://img.shields.io/github/forks/jamesthegiblet/BuddAI-Lite?style=social)

---

## 🚀 Live Demo

**Try it now:** <https://jamesthegiblet.github.io/BuddAI-Lite/>

*Note: If you see index.html in the URL, the correct link is above. GitHub Pages serves index.html automatically.*

---

## 🌟 Features

### 🤖 Multi-Personality System

- **Fluffy Bot** 🐰 - Your cuddly AI companion! Supportive, emoji-rich, enthusiastic
- **Cool Boy** 🤖 - Your tech-savvy AI bro! Casual, technical, practical
- **Architect** 🏗️ - The professional business mode! Focused on education, onboarding, and project management
- Switch between modes on-the-fly while maintaining conversation context

### 🧩 PALS (Personal AI Learners) System

- **Topic Bubbles** - Quick-select chips to jump straight into specific domains
- **Smart Routing** - Keyword-based routing system to direct queries to the right knowledge base
- **Context Locking** - Keeps the conversation focused on the current topic or project

### 🧠 Learning & Memory

- **Tracks your interests** - Automatically learns what topics you care about
- **Skill leveling** - Adapts from beginner → intermediate → expert based on conversation depth
- **Persistent memory** - Remembers everything across sessions (localStorage)
- **Conversation depth tracking** - Provides more advanced responses as you demonstrate expertise

### 🔧 Project Management

- **Auto-detection** - Recognizes when you mention projects in conversation
- **Detail Memory** - Remembers tech stacks, languages, and specific details you mention
- **Contextual Follow-ups** - Asks intelligent questions to learn more about your build
- **Active tracking** - Monitors ongoing projects with update history
- **Progress monitoring** - Tracks last update dates and proactively follows up on stale projects
- **Completion tracking** - Celebrates finished projects and suggests new ones
- **Smart suggestions** - Generates project ideas based on your interests

### 🎤 Voice Output

- **Text-to-speech** - Toggle voice output for bot responses
- **Dual voices** - Different voice profiles for Fluffy Bot vs Cool Boy
- **Smart cleanup** - Removes emojis and HTML before speaking

### 📊 Export & Data Ownership

- **5 export formats** - JSON, TXT, HTML, Markdown, Clipboard
- **Complete history** - Full conversation logs with timestamps
- **Preference data** - Export your learning profile and projects
- **Privacy-first** - All data stays on your device

### 🎨 Beautiful UI/UX

- **Responsive design** - Works on desktop, tablet, and mobile
- **Smooth animations** - Polished transitions and interactions
- **Modal interfaces** - Preference dashboard and project management
- **Visual indicators** - Learning status, active projects, progress bars

### 🚀 New in v2.2

- **Architect Mode** - A third personality for professional contexts
- **PALS Interface** - Scrollable topic bubbles for quick navigation
- **Embedded Data** - No external JSON file needed for basic operation (fixes CORS issues)
- **Context Awareness** - Improved sticky context for projects
- **License UI** - Demonstration of Pro/Whitelabel feature gating
- **Cloud Sync** - Firebase integration for cross-device synchronization
- **Collaboration** - Share projects with other users via ID
- **Advanced Analytics** - Visual dashboard for chat stats and topic heatmaps
- **Rich Input** - Voice input (Speech-to-Text) and Image upload support
- **Smart Tools** - Calendar integration and ElevenLabs custom voice support
- **Dark Mode** - Native dark theme support

---

## 🚀 Quick Start

### Prerequisites

- Any modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required!
- No API keys needed!
- No backend server needed!

### Installation

1. **Download the files:**

```bash
git clone https://github.com/JamesTheGiblet/BuddAI-Lite.git
cd BuddAI-Lite
```

1. **File structure:**

```txt
📁 BuddAI-lite/
  └── 📄 index.html
```

1. **Open in browser:**
   - Double-click `chatbot.html`
   - Or drag & drop into your browser
   - That's it! 🎉

### First Run

1. **Check console** (F12 → Console tab)
   - Should see: `✅ Training data loaded successfully!`

2. **Test basic features:**
   - Type: "Hi" → Should greet you
   - Click mode switcher → Switch between Fluffy & Cool Boy
   - Type: "I'm building a robot" → Auto-detects project

3. **Explore:**
   - 🧠 Click brain icon (top left) → View learning profile
   - 🔧 Click project badge (bottom left) → Manage projects
   - 🗣️ Click voice toggle → Enable text-to-speech

---

## 🎯 Usage Examples

### Basic Conversation

```txt
You: Hi!
Fluffy Bot: Hello lovely! 🌸 You're looking absolutely wonderful today!

You: Tell me about robotics
Fluffy Bot: Ooh robotics! 🤖 I love watching robots dance and help people!
```

### Project Detection

```txt
You: I'm building a combat robot called GilBot
Fluffy Bot: GilBot! 🤖 Your combat robot is so cool! How's the weapon system coming along? ⚔️
[Auto-detects "GilBot" project and saves it]

[7 days later...]
Fluffy Bot: How's your GilBot project going? 🎀 Any updates?
```

### Skill Leveling

```txt
[First mention of 3D printing]
Fluffy Bot: 3D printing is like modern-day magic! 🪄

[After 8+ conversations about 3D printing]
Fluffy Bot: Have you tried resin printing? The detail is insane! 
Since you're so knowledgeable: In 3D printing, software: OctoPrint (Remote Management). 
Isn't that fascinating? 🧠
```

---

## 🛠️ Customization

### Add Custom Responses

Edit `training-data.json`:

```json
{
  "customResponses": {
    "fluffy": {
      "your keyword": [
        "Custom response 1! 🎀",
        "Custom response 2! 💖"
      ]
    },
    "coolboy": {
      "your keyword": [
        "Custom response for cool mode! 🔥",
        "Another cool response! 🚀"
      ]
    }
  }
}
```

### Modify Personality

In `chatbot.html`, edit the `personalities` object (around line 1370):

```javascript
const personalities = {
    fluffy: {
        name: "Your Custom Name",
        avatar: "🎨", // Change emoji
        tagline: "Your custom tagline!",
        // ... more customization
    }
};
```

### Change Colors

Edit CSS variables at the top of the `<style>` section:

```css
/* Cool Boy theme */
.container {
    border: 5px solid #3498db; /* Change to your color */
}

/* Fluffy mode theme */
.fluffy-mode .container {
    border: 5px solid #f093fb; /* Change to your color */
}
```

---

## 🧪 Technical Details

### Architecture

- **Frontend:** Pure HTML/CSS/JavaScript (no frameworks)
- **Storage:** localStorage (browser-based, private)
- **AI:** Pattern matching + custom training data (no API costs)
- **Data Loading:** Hybrid fetch/embedded system for seamless local execution
- **Voice:** Web Speech API (browser built-in)

### Technologies Used

- Vanilla JavaScript (ES6+)
- CSS3 (Grid, Flexbox, Animations)
- localStorage API
- Web Speech API
- Fetch API (for training data)

### Performance

- **Load time:** <100ms
- **Response time:** <1s (simulated typing)
- **Memory footprint:** ~2-5MB
- **Works offline:** ✅ Yes (after first load)

### Browser Compatibility

| Browser | Version | Support |
| --------- | --------- | --------- |
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |

---

## 📚 Project Structure

```txt
chatbot.html
├── Styles (CSS)
│   ├── Base styles & reset
│   ├── Dual theme system (Fluffy/Cool Boy)
│   ├── Modal components
│   ├── Responsive breakpoints
│   └── Animations & transitions
│
├── Data (JavaScript Objects)
│   ├── personalities{} - Dual personality definitions
│   ├── technicalKnowledge{} - Domain expertise database
│   └── userPreferences{} - Learning & project state
│
├── Core Functions
│   ├── getResponse() - Main conversation logic
│   ├── trackUserInterests() - Learning system
│   ├── detectAndTrackProjects() - Project detection
│   └── getLeveledResponse() - Skill adaptation
│
├── UI Components
│   ├── Preference Modal - Learning dashboard
│   ├── Project Modal - Project management
│   ├── Status Messages - Toast notifications
│   └── Export Controls - Data export
│
└── Utilities
    ├── savePreferences() - localStorage persistence
    ├── export*() - Various export formats
    └── voice/speech integration

training-data.json
└── Custom keyword-response mappings
```

---

## 🎓 Domains & Topics

### Built-in Knowledge Areas

1. **Robotics** 🤖
   - ROS, Arduino, Raspberry Pi
   - Motor control, sensors
   - Computer vision, SLAM
   - Path planning

2. **3D Printing** 🖨️
   - FDM, SLA, SLS
   - Filaments, slicers
   - Troubleshooting
   - CAD design

3. **Combat Robots** ⚔️
   - Weight classes
   - Weapon systems
   - Competitions
   - Armor materials

4. **CoD Mobile** 🎮
   - Game modes
   - Weapons
   - Ranked seasons
   - Strategies

5. **Coding** 💻
   - Languages (Python, JS, C++)
   - Frameworks (React, ROS, Unity)
   - Concepts (OOP, algorithms)
   - DevOps

6. **General Tech** ⚡
   - Hardware/software
   - Maker movement
   - Open source
   - Cloud computing

---

## 🔒 Privacy & Security

### What Data is Collected?

- ✅ Conversation history
- ✅ Topic interests
- ✅ Project information
- ✅ Skill level
- ✅ User preferences

### Where is Data Stored?

- **localStorage** - Your browser only
- **Never sent to servers**
- **Never shared with third parties**
- **You own 100% of your data**

### Can I Delete My Data?

Yes! Three ways:

1. Click "Reset Learning Data" in preferences modal
2. Click "Clear" to delete chat history
3. Clear browser data (localStorage)

### Is it Safe?

- ✅ No external API calls (except optional training data & analytics)
- ✅ Privacy-friendly analytics (Simple Analytics)
- ✅ No cookies
- ✅ Works completely offline
- ✅ Open source - verify the code yourself

---

## 📈 Roadmap

### v2.2 (Planned)

- [ ] Hybrid AI mode (pattern + API)
- [ ] Mobile app (React Native)
- [ ] Plugin system
- [ ] Multi-language support

### Completed in v2.1

- [x] Cloud sync & Collaboration
- [x] Advanced analytics
- [x] Custom voice cloning
- [x] Dark mode
- [x] Voice input & Image upload
- [x] Calendar integration

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork the repository**
2. **Create a feature branch**

```bash
   git checkout -b feature/amazing-feature
```

1. **Commit your changes**

```bash
   git commit -m "Add amazing feature"
```

1. **Push to the branch**

```bash
   git push origin feature/amazing-feature
```

1. **Open a Pull Request**

### Contribution Ideas

- Add new domain knowledge (music, art, fitness, etc.)
- Create industry-specific versions
- Improve UI/UX
- Add new export formats
- Write tests
- Improve documentation

---

## 🐛 Known Issues

1. **Voice output may not work in all browsers**
   - Solution: Use Chrome/Edge for best voice support

2. **localStorage has size limits (~5-10MB)**
   - Solution: Export & clear old conversations regularly

3. **Training data must be same-origin**
   - Solution: Now includes embedded fallback data so it works immediately without a server!

4. **Doesn't work in private/incognito mode**
   - Solution: Use normal browsing mode for persistence

---

## 💬 FAQ

### Q: Does this use real AI?

**A:** Not by default. It uses pattern matching + custom training data. You can add real AI by integrating Claude/OpenAI API.

### Q: Does it cost money to run?

**A:** No! Zero API costs, zero hosting costs. Completely free.

### Q: Can I use this commercially?

**A:** Yes! MIT license. Use it however you want.

### Q: How do I add more responses?

**A:** Edit `training-data.json` - no coding required!

### Q: Will my data sync across devices?

**A:** Not in the free version. Premium version will include cloud sync.

### Q: Can I customize the appearance?

**A:** Yes! Edit the CSS in `chatbot.html`.

### Q: Does it work offline?

**A:** Yes! After first load, works completely offline.

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

**TL;DR:** You can use this for anything - personal, commercial, whatever. Just keep the license notice.

---

## 🙏 Acknowledgments

- Built with assistance from Claude (Anthropic)
- Inspired by the maker/hacker community
- Icons: Unicode emoji (universally supported)
- Fonts: System fonts (no external dependencies)

---

## 📞 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/JamesTheGiblet/BuddAI-lite/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JamesTheGiblet/BuddAI-lite/discussions)
- **Twitter:** [@JamesTheGiblet](https://twitter.com/JamesTheGiblet)
- **Email:** <Gibletscreations@gmail.com>

---

## 🌟 Star History

If you find this useful, please star the repo! ⭐

---

## 📊 Stats

- **Build Time:** 2 hours
- **Lines of Code:** ~2,500
- **File Size:** ~150KB (uncompressed)
- **Dependencies:** 0
- **Frameworks:** 0
- **API Costs:** $0

---

## 🚀 Deploy

### GitHub Pages (Free Hosting)

```bash
# 1. Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/JamesTheGiblet/BuddAI-lite.git
git push -u origin main

# 2. Enable GitHub Pages
# Go to: Settings → Pages → Source: main branch

# 3. Your chatbot is now live at:
# https://JamesTheGiblet.github.io/BuddAI-lite/chatbot.html
```

### Netlify Drop (Easiest)

1. Go to <https://app.netlify.com/drop>
2. Drag both files into upload zone
3. Get instant live URL!

### Vercel

```bash
npm i -g vercel
vercel
```

---

## 💡 Use Cases

### Personal

- Project tracking companion
- Learning assistant
- Hobby organizer
- Study buddy

### Professional

- Onboarding assistant
- Customer support (white-label)
- Training tool
- Knowledge base interface

### Educational

- CS education tool
- STEM learning companion
- Coding bootcamp assistant
- Maker space guide

### Business

- Internal tools
- Client demos
- Lead magnets
- SaaS products

---

## 🎯 What Makes This Different?

Unlike other chatbots:

- ✅ **Remembers everything** - Persistent memory across sessions
- ✅ **Tracks projects** - Auto-detection and management
- ✅ **Learns & adapts** - Skill leveling system
- ✅ **Dual personality** - Two distinct modes
- ✅ **Privacy-first** - Data never leaves your device
- ✅ **Zero cost** - No APIs, no subscriptions
- ✅ **Fully customizable** - Easy training data
- ✅ **100% client-side** - No backend needed

---

## 🎨 Screenshots

### Fluffy Bot Mode

#### Fluffy Bot Interface Screenshot

<!-- Insert screenshot of Fluffy Bot interface here -->

### Cool Boy Mode

#### Cool Boy Interface Screenshot

<!-- Insert screenshot of Cool Boy interface here -->

### Preference Dashboard

#### Learning Profile Modal Screenshot

<!-- Insert screenshot of learning profile modal here -->

### Project Management

#### Project Tracking Modal Screenshot

<!-- Insert screenshot of project tracking modal here -->

---

## 🏆 Built With Love

Created by **James** as part of **Giblets Creations**

> "I build what I want" - Core philosophy

### Built in 2 hours with Claude's assistance

---

<!-- Centered content starts -->

**If you found this helpful, please ⭐ star the repo!**

Made with 💖 by makers, for makers

[Report Bug](https://github.com/JamesTheGiblet/BuddAI-lite/issues) •
[Request Feature](https://github.com/JamesTheGiblet/BuddAI-lite/issues) •
[Discussions](https://github.com/JamesTheGiblet/BuddAI-lite/discussions)

<!-- Centered content ends -->
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


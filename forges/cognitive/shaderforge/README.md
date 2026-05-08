# 🎨 ShaderForge

> **Evolve Stunning Visual Effects Through Genetic Algorithms**

ShaderForge is an interactive WebGL shader playground that combines real-time visual programming with evolutionary computation. Write GLSL shaders, see instant results, and use genetic algorithms to evolve mesmerizing visual effects.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/yourusername/shaderforge)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-red.svg)](https://www.khronos.org/webgl/)

---

## ✨ Features

### 🎬 **Real-Time Shader Editor**

- **Live GLSL Compilation**: See changes instantly as you type
- **Syntax Highlighting**: Code editor optimized for GLSL
- **Error Display**: Clear compilation error messages
- **Keyboard Shortcuts**: Ctrl+Enter to compile, Tab for indentation
- **Line Numbers**: Easy code navigation

### 🧬 **Genetic Algorithm Evolution**

- **20-Shader Population**: Evolve visual effects through natural selection
- **Like/Skip System**: Guide evolution with user feedback
- **Tournament Selection**: Best shaders survive and reproduce
- **Mutation & Crossover**: Blend and mutate shader parameters
- **Multi-Objective Fitness**: Balance complexity, aesthetics, and performance
- **Generation Tracking**: Watch evolution progress over time

### 🎨 **Shader DNA**

Each evolved shader has genetic traits:

- **Color Speed**: Animation rate of color cycling
- **Color Shift**: RGB phase offsets for hue variation
- **Time Scale**: Overall animation speed multiplier
- **Distortion**: Random noise amount
- **Frequency**: Pattern repetition rate
- **Octaves**: Fractal detail layers (1-5)
- **Symmetry**: None, X-axis, Y-axis, Both, Radial
- **Blend Mode**: Add, Multiply, Mix

### ️ **Real-Time Controls**

- **Mouse Position**: Interactive shader parameters (u_mouse)
- **Time Uniform**: Automatic animation (u_time)
- **Resolution**: Responsive to window size (u_resolution)
- **Custom Uniforms**: Add your own parameters
- **FPS Counter**: Monitor performance
- **Playback Speed**: Control animation rate

### 💾 **Save & Export**

- **Favorite Shaders**: Save evolved shaders to local library
- **Export Code**: Copy GLSL to clipboard
- **Screenshot**: Capture current frame as PNG
- **Video Recording**: Record shader animations (planned)
- **Share URL**: Share shaders via link (planned)

### 🖼️ **Visualization**

- **Fullscreen Canvas**: Immersive shader display
- **Dual View**: Editor + preview side-by-side
- **Thumbnail Gallery**: Preview saved shaders
- **Performance Metrics**: FPS, compile time, draw calls

---

## 🚀 Quick Start

### **Option 1: Run Locally**

```bash
# Clone the repository
git clone https://github.com/yourusername/shaderforge.git
cd shaderforge

# Open in browser
open shaderforge.html
# or
python -m http.server 8000
# Then visit http://localhost:8000
```

### **Option 2: Online**

Simply open `shaderforge.html` in any modern browser - no installation required!

**Browser Requirements:**

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Opera 76+ ✅

**Must support:** WebGL 2.0 (or WebGL 1.0 fallback)

---

## 📖 How to Use

### **Basic Workflow**

1. **🎨 Open ShaderForge**
   - The default shader displays automatically
   - Canvas fills the entire screen

2. **✏️ Edit Shader Code**
   - Click in the editor panel
   - Modify the fragment shader GLSL code
   - Press `Ctrl+Enter` or click "Compile" to see changes

3. **🧬 Start Evolution**
   - Click "Start Evolution" to begin genetic algorithm
   - View random shader from population

4. **👍👎 Guide Evolution**
   - Click "❤️ Like" to increase shader's fitness
   - Click "➡️ Skip" to decrease fitness and try next
   - Evolution happens after rating all 20 shaders

5. **💾 Save Favorites**
   - Click "Save Current" to add to library
   - Name your shader for easy recall
   - Load saved shaders anytime

6. **📤 Export**
   - Copy shader code to clipboard
   - Save screenshot of current frame
   - Share with others (URL sharing coming soon)

### **Advanced Techniques**

#### **Manual Shader Writing**

```glsl
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
    // Normalized coordinates (0.0 to 1.0)
    vec2 st = gl_FragCoord.xy / u_resolution;
    
    // Mouse interaction
    vec2 mouse = u_mouse / u_resolution;
    float dist = distance(st, mouse);
    
    // Animated color
    vec3 color = vec3(st.x, st.y, abs(sin(u_time)));
    color *= 1.0 - dist;
    
    gl_FragColor = vec4(color, 1.0);
}
```

#### **Using Built-in Uniforms**

- `u_time` - Seconds since start (float)
- `u_resolution` - Canvas width/height (vec2)
- `u_mouse` - Mouse X/Y position (vec2)
- `u_frame` - Frame counter (int, optional)

#### **Directed Evolution**

```
1. Start with preset you like (e.g., "plasma")
2. Click "Evolve From Current"
3. Rate variations (Like/Skip)
4. After 3-5 generations, patterns emerge
5. Save your favorite evolutions
6. Use as starting point for new evolutions
```

#### **Creating Complex Effects**

```glsl
// Combine multiple techniques:

// 1. Fractal noise
float noise(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// 2. Domain warping
vec2 warp(vec2 st) {
    st += vec2(sin(st.y * 3.0 + u_time), cos(st.x * 3.0 - u_time)) * 0.1;
    return st;
}

// 3. Color palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    st = warp(st);
    float n = noise(st * 10.0 + u_time);
    vec3 color = palette(n);
    gl_FragColor = vec4(color, 1.0);
}
```

---

## 🎓 GLSL Tutorial

### **Basic Concepts**

**Data Types:**

```glsl
float x = 1.0;           // Single number
vec2 pos = vec2(0.5, 0.5); // 2D vector
vec3 color = vec3(1.0, 0.0, 0.0); // RGB
vec4 rgba = vec4(1.0, 0.0, 0.0, 1.0); // RGBA
```

**Built-in Functions:**

```glsl
sin(x), cos(x), tan(x)   // Trigonometry
abs(x), sign(x)          // Math
length(v), distance(a,b) // Vector
mix(a, b, t)            // Linear interpolation
smoothstep(e0, e1, x)   // Smooth interpolation
fract(x)                // Fractional part
floor(x), ceil(x)       // Rounding
```

**Vector Operations:**

```glsl
vec2 a = vec2(1.0, 2.0);
vec2 b = vec2(3.0, 4.0);

vec2 sum = a + b;        // (4.0, 6.0)
vec2 scaled = a * 2.0;   // (2.0, 4.0)
float dot = dot(a, b);   // 11.0
```

### **Common Patterns**

**1. Gradient:**

```glsl
vec2 st = gl_FragCoord.xy / u_resolution;
vec3 color = vec3(st.x, st.y, 0.5);
gl_FragColor = vec4(color, 1.0);
```

**2. Circle:**

```glsl
vec2 st = gl_FragCoord.xy / u_resolution;
vec2 center = vec2(0.5);
float dist = distance(st, center);
float circle = smoothstep(0.3, 0.29, dist);
gl_FragColor = vec4(vec3(circle), 1.0);
```

**3. Animation:**

```glsl
vec2 st = gl_FragCoord.xy / u_resolution;
float wave = sin(st.x * 10.0 + u_time * 2.0);
vec3 color = vec3(wave * 0.5 + 0.5);
gl_FragColor = vec4(color, 1.0);
```

**4. Noise:**

```glsl
float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    float n = random(st);
    gl_FragColor = vec4(vec3(n), 1.0);
}
```

---

## 🛠️ Technical Details

### **Architecture**

```
┌─────────────────────────────────────┐
│         ShaderForge System          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │    WebGL Rendering Engine   │   │
│  │  - Shader Compilation       │   │
│  │  - Uniform Management       │   │
│  │  - Render Loop (60fps)      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Genetic Algorithm Engine  │   │
│  │  - Population Management    │   │
│  │  - Fitness Evaluation       │   │
│  │  - Selection & Breeding     │   │
│  │  - Mutation Operators       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Shader DNA System       │   │
│  │  - Gene Encoding            │   │
│  │  - Code Generation          │   │
│  │  - Parameter Evolution      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       User Interface        │   │
│  │  - Code Editor              │   │
│  │  - Controls Panel           │   │
│  │  - Library Manager          │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### **Genetic Algorithm**

```javascript
// Evolution Process
1. INITIALIZATION
   - Create 20 random shader genomes
   - Each has 8 genetic traits

2. EVALUATION
   - User rates shaders (Like/Skip)
   - Fitness = likes - (skips * 0.5)

3. SELECTION
   - Tournament selection (size 4)
   - Top 30% elite preservation

4. CROSSOVER
   - Select two parents
   - Randomly inherit traits
   - Create offspring

5. MUTATION
   - 15% chance per gene
   - Gaussian perturbation
   - Clamp to valid ranges

6. REPLACEMENT
   - New generation replaces old
   - Repeat from step 2
```

### **Shader Gene Mapping**

| Gene | Range | Effect |
|------|-------|--------|
| colorSpeed | 0.0 - 2.0 | Color animation rate |
| colorShift | [0-6, 0-6, 0-6] | RGB phase offsets |
| timeScale | 0.1 - 2.0 | Global time multiplier |
| distortion | 0.0 - 1.0 | Noise amount |
| frequency | 1.0 - 20.0 | Pattern repetition |
| octaves | 1 - 5 | Fractal layers |
| symmetry | 0 - 4 | Mirror modes |
| blendMode | 0 - 2 | Compositing |

### **Performance**

- **Target FPS**: 60
- **Compile Time**: < 50ms average
- **Memory**: ~20MB (20 shaders cached)
- **GPU Load**: Medium (one fullscreen quad)
- **CPU Load**: Low (minimal JavaScript)

---

## 🎯 Use Cases

### **Creative Coding**

- Learn WebGL and GLSL
- Experiment with visual effects
- Create generative art
- Build shader libraries

### **Game Development**

- Prototype visual effects
- Generate procedural textures
- Create UI animations
- Test shader performance

### **Visual Music**

- Audio-reactive shaders (coming soon)
- VJ performance tools
- Music visualizers
- Live coding performances

### **Education**

- Teach genetic algorithms
- Demonstrate WebGL programming
- Explore evolutionary computation
- Interactive GLSL tutorials

### **Art & Design**

- Generate abstract art
- Create video backgrounds
- Design motion graphics
- Produce NFT art

---

## 🐛 Troubleshooting

### **Shader Won't Compile**

**Problem**: Red error message appears
**Solution**:

- Check for syntax errors (missing semicolons)
- Ensure all variables are declared
- Use correct GLSL precision (mediump float)
- Verify uniform names match (u_time, u_resolution)

**Common Errors:**

```glsl
// ❌ Wrong
vec2 st = gl_FragCoord.xy / u_resolution
gl_FragColor = vec4(color, 1.0)

// ✅ Correct
vec2 st = gl_FragCoord.xy / u_resolution; // Need semicolon
gl_FragColor = vec4(color, 1.0); // Need semicolon
```

### **Black Screen**

**Problem**: Canvas shows nothing
**Solution**:

- Check browser console for WebGL errors
- Ensure WebGL is supported (chrome://gpu)
- Try different browser
- Update graphics drivers

### **Evolution Not Working**

**Problem**: Shaders don't change after evolution
**Solution**:

- Rate at least 10 shaders before evolution
- Click through entire population (20 shaders)
- Increase mutation rate
- Try different starting preset

### **Performance Issues**

**Problem**: Low FPS or stuttering
**Solution**:

- Reduce shader complexity (fewer loops)
- Lower octave count in evolved shaders
- Close other GPU-intensive apps
- Use Chrome for best performance
- Disable anti-aliasing

### **Can't Save Shaders**

**Problem**: Save button doesn't work
**Solution**:

- Check browser localStorage is enabled
- Not in private/incognito mode
- Clear browser cache
- Try different browser

---

## 💡 Tips & Best Practices

### **Writing Efficient Shaders**

✅ **Do:**

- Use `const` for loop bounds when possible
- Minimize texture lookups
- Pre-calculate values outside loops
- Use built-in functions (length, distance, etc.)
- Keep precision as low as acceptable

❌ **Don't:**

- Use unbounded loops
- Perform expensive calculations per pixel unnecessarily
- Create deep conditional nesting
- Use high precision unless required

### **Evolution Strategy**

**For Beautiful Results:**

```
1. Start with "plasma" or "rainbow"
2. Use low mutation rate (0.1)
3. Evolve slowly (rate 10+ shaders)
4. Save intermediate results
5. Cross-breed favorites
```

**For Wild Experiments:**

```
1. Start with "experimental" preset
2. Use high mutation rate (0.3)
3. Skip often to increase diversity
4. Don't save until gen 5+
5. Embrace chaos
```

### **Common Patterns**

**Time-based Animation:**

```glsl
float t = u_time * 0.5; // Slower animation
```

**Mouse Interaction:**

```glsl
vec2 mouse = u_mouse / u_resolution;
float dist = distance(st, mouse);
color *= 1.0 - smoothstep(0.0, 0.5, dist);
```

**Aspect Ratio Correction:**

```glsl
vec2 st = gl_FragCoord.xy / u_resolution;
st.x *= u_resolution.x / u_resolution.y;
```

---

## 📚 Resources

### **GLSL Learning**

- [The Book of Shaders](https://thebookofshaders.com/) - Interactive GLSL guide
- [Shadertoy](https://www.shadertoy.com/) - Community shader sharing
- [GLSL Sandbox](http://glslsandbox.com/) - Simple shader playground
- [WebGL Fundamentals](https://webglfundamentals.org/) - WebGL tutorial

### **Inspiration**

- [Inigo Quilez](https://iquilezles.org/) - Shader wizardry
- [Patricio Gonzalez Vivo](http://patriciogonzalezvivo.com/) - Generative art
- [Casey Reas](http://reas.com/) - Creative coding

### **Tools**

- [GLSL Linter](https://github.com/gl-transitions/glsl-transition-validator)
- [Shader Editor VSCode](https://marketplace.visualstudio.com/items?itemName=slevesque.shader)

---

## 🗺️ Roadmap

### **Version 1.1** (Q2 2025)

- [x] Audio-reactive shaders (mic/audio input)
- [x] Video recording (.webm export)
- [x] URL sharing (encode shader in URL)
- [x] Texture upload support
- [x] 3D raymarch templates

### **Version 1.2** (Q3 2025)

- [ ] Multi-pass rendering
- [ ] Buffer feedback loops
- [ ] Shader marketplace/gallery
- [ ] Collaborative evolution
- [ ] VR/AR shader support

### **Version 2.0** (Q4 2025)

- [ ] Machine learning fitness (CNN evaluator)
- [ ] Vertex shader evolution
- [ ] Compute shader support
- [ ] Mobile app (iOS/Android)
- [ ] Desktop app (Electron)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### **Development Setup**

```bash
git clone https://github.com/yourusername/shaderforge.git
cd shaderforge
# No build process - pure HTML/JS/WebGL
# Just open shaderforge.html in browser
```

### **Areas for Contribution**

- 🎨 New shader presets
- 🐛 Bug fixes
- 📚 Documentation improvements
- ✨ Feature additions
- 🎓 Tutorial content

---

## 📜 License

MIT License

Copyright (c) 2025 ShaderForge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🙏 Acknowledgments

### **Technologies**

- [WebGL](https://www.khronos.org/webgl/) - 3D graphics API
- [GLSL](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language) - Shader language

### **Inspiration**

- Shadertoy community
- The Book of Shaders
- Inigo Quilez's techniques
- Karl Sims' evolved creatures

### **Graphics Algorithms**

- Perlin/Simplex noise
- Voronoi diagrams
- Mandelbrot sets
- Signed distance fields

---

## ⭐ Show Your Support

If you find ShaderForge useful, please consider:

- ⭐ **Starring** this repository
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 🤝 **Contributing** code
- 📢 **Sharing** with others

---

<div align="center">

**🎨 ShaderForge - Where Code Meets Art 🎨**

Made with ❤️ using WebGL, GLSL & Genetic Algorithms

**Part of the Evolution Trilogy:**

- 🎨 [Primordial](https://jamesthegiblet.github.io/Primordial/) - Art Evolution
- 🎵 [MelodyForge](#) - Music Evolution  
- 🔥 **ShaderForge** - Visual FX Evolution

</div>
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>


# ✨ LinguaForge Features

LinguaForge is an interactive simulation that demonstrates how symbolic communication systems (languages) spontaneously emerge. This document outlines its core features, simulation modes, and advanced capabilities.

---

## 🧬 Language Evolution Stages

LinguaForge simulates the complete progression of language development:

| Stage | Characteristics | Example |
|-------|----------------|---------|
| **1. Gestural** | Physical pointing, mime | *[points at food]* |
| **2. Holistic** | Whole-utterance meanings | "FOODHERE" (indivisible) |
| **3. Protolanguage** | Word order emerges | "food here now" |
| **4. Compositional** | Grammar + syntax rules | "I see food near the tree" |
| **5. Recursive** | Embedded clauses | "I think [you know [food is here]]" |

---

## 🎯 Communication Tasks

Agents must solve increasingly complex coordination problems:

### **Basic Coordination**

- **Food Location**: "Food is near the blue rock"
- **Danger Warning**: "Predator approaching from north"
- **Tool Request**: "I need the sharp stone"

#### **Complex Concepts**

- **Temporal**: "Food was here yesterday"
- **Hypothetical**: "If we go there, we might find water"
- **Abstract**: "This place is safer than that place"

#### **Social Coordination**

- **Planning**: "You go left, I'll go right, we'll meet at sunset"
- **Knowledge Sharing**: "The water source dried up three days ago"
- **Cultural Transmission**: "Our ancestors stored food in caves during winter"

---

## 🧠 Linguistic Emergence Mechanisms

### **1. Symbol Invention**

- Agents create arbitrary sound/gesture symbols
- Initially random, refined through use
- Successful symbols spread through population
- Unsuccessful symbols die out

#### **2. Compositional Pressure**

```txt
Generation 1: "FOODTREE" (holistic)
Generation 5: "FOOD TREE" (two concepts)
Generation 15: "FOOD NEAR TREE" (relation word)
Generation 30: "I SEE FOOD NEAR THE TREE" (full grammar)
```

#### **3. Grammar Crystallization**

- Word order patterns emerge from repeated use
- Function words develop (the, is, at, to)
- Grammatical rules become conventions
- Violations penalized by communication failure

#### **4. Efficiency Optimization**

- Frequently used concepts get shorter words
- Common phrases compress into idioms
- Redundancy eliminated when context is clear
- Ambiguity tolerated if resolvable

---

## 📊 Linguistic Metrics Tracked

### **Vocabulary**

- **Lexicon Size**: Number of distinct words
- **Word Frequency**: Zipf's Law distribution
- **Semantic Fields**: Categories (food, location, action, etc.)
- **Word Creation Rate**: New symbols per generation

#### **Grammar**

- **Word Order Consistency**: SVO, SOV, VSO patterns
- **Function Word Emergence**: Prepositions, articles, auxiliaries
- **Phrase Structure**: Noun phrases, verb phrases
- **Recursion Depth**: Embedded clause levels

#### **Communication Success**

- **Message Accuracy**: Correct interpretation rate
- **Efficiency**: Information per symbol
- **Ambiguity**: Multiple interpretation rate
- **Repair Rate**: How often clarification needed

#### **Evolution Dynamics**

- **Dialect Formation**: Regional language variants
- **Language Death**: Symbol extinction rate
- **Pidgin/Creole**: Mixed language emergence
- **Universal Features**: Cross-language patterns

---

## 🧪 Simulation Modes

### **1. 🌍 Natural Evolution**

#### The classic mode - language emerges organically

**Settings:**

- Population: 50 agents
- Task Complexity: Gradually increasing
- Mutation Rate: 5% per generation
- Selection Pressure: Communication success

### **2. 🏝️ Island Isolation**

#### Simulate language divergence across separated populations

**Scenario:**

- Start with one unified language
- Split population into 3-5 isolated groups
- Different environmental pressures per group
- Occasional inter-group contact

### **3. 🧒 Child Acquisition**

#### Model how children learn and regularize language

**Settings:**

- Adults have irregular, inconsistent language
- Children learn from imperfect input
- Children systematize irregularities
- Generational turnover every N iterations

### **4. 🤝 Contact Languages**

#### Watch pidgins and creoles emerge

**Scenario:**

- Two populations with different languages meet
- Must communicate for trade/cooperation
- No common language initially
- Pressure to develop shared system

### **5. 🏛️ Language Death & Revitalization**

#### Simulate endangered language dynamics

**Settings:**

- Minority language (20 speakers)
- Dominant language (80 speakers)
- Prestige asymmetry
- Optional revitalization efforts

### **6. 🔬 Constructed Language**

#### Test Esperanto-style designed languages

**Settings:**

- Start with pre-designed, logical grammar
- Regular morphology
- No exceptions
- Compete against natural languages

### **7. 🧬 Genetic Constraints**

#### Model biological limits on language structure

**Settings:**

- Memory capacity constraints
- Processing speed limits
- Perceptual discrimination thresholds
- Articulatory constraints

---

## 🛠️ Advanced Features

### **1. Custom Language Design**

```javascript
// Define your own language constraints
const myLanguageConfig = {
    phonemes: {
        vowels: ['a', 'e', 'i', 'o', 'u'],
        consonants: ['p', 't', 'k', 's', 'm', 'n'],
        syllableStructure: 'CV' // Consonant-Vowel only
    },
    grammar: {
        wordOrder: 'SOV', // Subject-Object-Verb
        headDirection: 'final', // Head-final phrases
        recursion: true,
        maxDepth: 4
    }
};
```

### **2. Import Real Languages**

```javascript
// Load human language data for comparison
const englishData = {
    vocabulary: loadFromCSV('english_vocab.csv'),
    grammar: loadGrammar('english_rules.json'),
    phonology: loadPhonemes('english_sounds.json')
};
```

### **3. Multi-Modal Communication**

```javascript
// Agents can use multiple channels
class MultiModalAgent extends LanguageAgent {
    communicate(intention) {
        return {
            vocal: this.speak(intention),      // Words
            gestural: this.gesture(intention), // Hand signs
            facial: this.express(intention),   // Emotion
            visual: this.point(intention)      // Reference
        };
    }
}
```

### **4. Language Contact Scenarios**

```javascript
// Simulate bilingualism and code-switching
class BilingualAgent extends LanguageAgent {
    constructor(L1, L2) {
        super();
        this.primaryLanguage = L1;
        this.secondaryLanguage = L2;
        this.dominance = 0.7; // 70% L1, 30% L2
    }
}
```

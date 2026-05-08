// Particle types
const ELEMENT_TYPES = {
    HYDROGEN: { symbol: 'H', color: '#0FF', size: 2, mass: 1.0, electrons: 1 },
    CARBON: { symbol: 'C', color: '#FFF', size: 3, mass: 12.0, electrons: 4 },
    OXYGEN: { symbol: 'O', color: '#F06', size: 3, mass: 16.0, electrons: 6 },
    NITROGEN: { symbol: 'N', color: '#0F6', size: 3, mass: 14.0, electrons: 5 }
};

// Achievement system
const ACHIEVEMENTS = {
    first_molecule: {
        id: 'first_molecule',
        icon: '⚛️',
        title: 'First Molecule',
        description: 'Form your first stable molecule',
        xp: 50,
        unlocked: false,
        check: () => molecules.length >= 1
    },
    hydrogen_factory: {
        id: 'hydrogen_factory',
        icon: '💨',
        title: 'Hydrogen Factory',
        description: 'Create 5 H₂ molecules',
        xp: 100,
        unlocked: false,
        check: () => (moleculeTypes.get('H₂ (Hydrogen)') || 0) >= 5,
        progress: () => Math.min(100, ((moleculeTypes.get('H₂ (Hydrogen)') || 0) / 5) * 100)
    },
    water_of_life: {
        id: 'water_of_life',
        icon: '💧',
        title: 'Water of Life',
        description: 'Successfully create H₂O (water)',
        xp: 150,
        unlocked: false,
        check: () => moleculeTypes.has('H₂O (Water)')
    },
    radical_creator: {
        id: 'radical_creator',
        icon: '⚡',
        title: 'Radical Creator',
        description: 'Form an OH hydroxyl radical',
        xp: 100,
        unlocked: false,
        check: () => moleculeTypes.has('OH (Hydroxyl)')
    },
    toxic_chemist: {
        id: 'toxic_chemist',
        icon: '☠️',
        title: 'Toxic Chemist',
        description: 'Create CN cyanide',
        xp: 125,
        unlocked: false,
        check: () => moleculeTypes.has('CN (Cyanide)')
    },
    ammonia_maker: {
        id: 'ammonia_maker',
        icon: '🧪',
        title: 'Ammonia Maker',
        description: 'Synthesize NH₃ (ammonia)',
        xp: 150,
        unlocked: false,
        check: () => moleculeTypes.has('NH₃ (Ammonia)')
    },
    molecular_diversity: {
        id: 'molecular_diversity',
        icon: '🌈',
        title: 'Molecular Diversity',
        description: 'Create 5 different molecule types',
        xp: 250,
        unlocked: false,
        check: () => moleculeTypes.size >= 5,
        progress: () => Math.min(100, (moleculeTypes.size / 5) * 100)
    },
    speed_demon: {
        id: 'speed_demon',
        icon: '🔥',
        title: 'Speed Demon',
        description: 'Reach 50,000 collisions',
        xp: 100,
        unlocked: false,
        check: () => collisionCount >= 50000,
        progress: () => Math.min(100, (collisionCount / 50000) * 100)
    },
    molecular_factory: {
        id: 'molecular_factory',
        icon: '🏭',
        title: 'Molecular Factory',
        description: 'Form 20 molecules total',
        xp: 200,
        unlocked: false,
        check: () => molecules.length >= 20,
        progress: () => Math.min(100, (molecules.length / 20) * 100)
    },
    thermodynamist: {
        id: 'thermodynamist',
        icon: '🌡️',
        title: 'Thermodynamist',
        description: 'Find the perfect temperature (45-55) and hold for 30s',
        xp: 100,
        unlocked: false,
        check: () => thermoTimeInRange >= 30000, // 30 seconds in ms
        progress: () => {
            const progress = Math.min(100, (thermoTimeInRange / 30000) * 100);
            return progress;
        }
    },
    patient_chemist: {
        id: 'patient_chemist',
        icon: '⏱️',
        title: 'Patient Chemist',
        description: 'Run simulation for 5 minutes',
        xp: 75,
        unlocked: false,
        check: () => getElapsedTime() >= 300000,
        progress: () => Math.min(100, (getElapsedTime() / 300000) * 100)
    },
    carbon_dioxide: {
        id: 'carbon_dioxide',
        icon: '🫧',
        title: 'Carbon Dioxide',
        description: 'Create CO₂',
        xp: 125,
        unlocked: false,
        check: () => moleculeTypes.has('CO₂ (Carbon Dioxide)')
    },
    nitrogen_gas: {
        id: 'nitrogen_gas',
        icon: '💨',
        title: 'Nitrogen Gas',
        description: 'Form N₂',
        xp: 100,
        unlocked: false,
        check: () => moleculeTypes.has('N₂ (Nitrogen)')
    },
    abiogenesis: {
        id: 'abiogenesis',
        icon: '🌱',
        title: 'Abiogenesis',
        description: 'Witness the emergence of the first proto-cell',
        xp: 500,
        unlocked: false,
        check: () => abiogenesisTriggered
    },
    prebiotic_soup: {
        id: 'prebiotic_soup',
        icon: '🧬',
        title: 'Prebiotic Soup',
        description: 'Create H₂O, NH₃, and HCN (building blocks of life)',
        xp: 300,
        unlocked: false,
        check: () => moleculeTypes.has('H₂O (Water)') &&
                   moleculeTypes.has('NH₃ (Ammonia)') &&
                   moleculeTypes.has('HCN')
    },
    master_chemist: {
        id: 'master_chemist',
        icon: '👨‍🔬',
        title: 'Master Chemist',
        description: 'Unlock all other achievements',
        xp: 500,
        unlocked: false,
        check: () => {
            const others = Object.keys(ACHIEVEMENTS).filter(id => id !== 'master_chemist');
            return others.every(id => ACHIEVEMENTS[id].unlocked);
        }
    }
};

// Achievement help data
const ACHIEVEMENT_HELP = {
    first_molecule: {
        description: "Form your first stable molecule from colliding particles.",
        strategy: [
            "Start with moderate temperature (45-55°K)",
            "Keep energy input around 20-30 for stable conditions",
            "Higher density increases collision chances",
            "Be patient - first molecule usually forms within 30 seconds"
        ],
        parameters: {
            temperature: "45-55°K",
            density: "150-250",
            energy: "20-30"
        },
        formula: "Any two-element combination"
    },
    hydrogen_factory: {
        description: "Create 5 H₂ (hydrogen) molecules - the most abundant molecule in the universe.",
        strategy: [
            "Focus on hydrogen-hydrogen collisions",
            "Moderate temperatures work best (40-60°K)",
            "Higher hydrogen concentration helps",
            "H₂ forms easily under most conditions"
        ],
        parameters: {
            temperature: "40-60°K",
            density: "200+",
            energy: "15-35"
        },
        formula: "H + H → H₂"
    },
    water_of_life: {
        description: "Successfully create H₂O (water) - the essential molecule for life.",
        strategy: [
            "Need both hydrogen and oxygen particles",
            "Optimal temperature: 50-65°K",
            "Balance element ratios (2:1 H:O ideal)",
            "Watch for H + O → OH first, then OH + H → H₂O"
        ],
        parameters: {
            temperature: "50-65°K",
            density: "200-300",
            energy: "25-40"
        },
        formula: "2H + O → H₂O"
    },
    radical_creator: {
        description: "Form an OH hydroxyl radical - a highly reactive molecule important in chemistry.",
        strategy: [
            "Hydrogen and oxygen collisions",
            "Slightly higher temperatures help (55-70°K)",
            "Moderate energy input (25-45)",
            "OH often forms before H₂O"
        ],
        parameters: {
            temperature: "55-70°K",
            density: "150-250",
            energy: "25-45"
        },
        formula: "H + O → OH"
    },
    toxic_chemist: {
        description: "Create CN cyanide - a simple but toxic organic molecule.",
        strategy: [
            "Carbon and nitrogen collisions required",
            "Moderate temperatures (45-65°K)",
            "Both elements needed in simulation",
            "Can be rare depending on element distribution"
        ],
        hint: "Creating Cyanide (CN) is a step towards Hydrogen Cyanide (HCN), a key component for prebiotic soup.",
        parameters: {
            temperature: "45-65°K",
            density: "200-300",
            energy: "20-40"
        },
        formula: "C + N → CN"
    },
    ammonia_maker: {
        description: "Synthesize NH₃ (ammonia) - important for fertilizers and prebiotic chemistry.",
        strategy: [
            "Requires nitrogen and hydrogen",
            "Optimal ratio: 1N:3H",
            "Moderate temperatures (50-70°K)",
            "Forms through intermediate steps (NH → NH₂ → NH₃)"
        ],
        parameters: {
            temperature: "50-70°K",
            density: "250-350",
            energy: "30-50"
        },
        formula: "N + 3H → NH₃"
    },
    molecular_diversity: {
        description: "Create 5 different molecule types - demonstrating chemical variety.",
        strategy: [
            "Ensure all element types are present",
            "Experiment with different temperatures",
            "Higher density increases variety chances",
            "Track progress in Molecules panel"
        ],
        parameters: {
            temperature: "Vary 40-70°K",
            density: "250+",
            energy: "25-45"
        },
        formula: "Multiple combinations"
    },
    speed_demon: {
        description: "Reach 50,000 particle collisions - mastering high-energy conditions.",
        strategy: [
            "High density increases collision rate",
            "Higher temperatures increase particle speed",
            "More energy input creates more activity",
            "Be patient - this takes time to accumulate"
        ],
        parameters: {
            temperature: "60-80°K",
            density: "300+",
            energy: "40-60"
        },
        formula: "Accumulated collisions"
    },
    molecular_factory: {
        description: "Form 20 molecules total - becoming a proficient molecular architect.",
        strategy: [
            "Stable conditions help accumulation",
            "Moderate parameters work best",
            "Avoid extreme temperatures that break bonds",
            "Higher density speeds up production"
        ],
        parameters: {
            temperature: "45-65°K",
            density: "200-300",
            energy: "20-40"
        },
        formula: "Cumulative production"
    },
    thermodynamist: {
        description: "Find the perfect temperature (45-55°K) and maintain it for 30 seconds.",
        strategy: [
            "Use temperature slider carefully",
            "Watch for optimal bonding conditions",
            "Avoid sudden changes",
            "Monitor molecule formation rate"
        ],
        parameters: {
            temperature: "45-55°K",
            density: "Any",
            energy: "Any"
        },
        formula: "Temperature stability"
    },
    patient_chemist: {
        description: "Run simulation for 5 minutes - good science takes time!",
        strategy: [
            "Let the simulation run continuously",
            "Observe long-term patterns",
            "Make gradual parameter adjustments",
            "Watch the evolution of molecular complexity"
        ],
        parameters: {
            temperature: "Any",
            density: "Any",
            energy: "Any"
        },
        formula: "Time accumulation"
    },
    carbon_dioxide: {
        description: "Create CO₂ - essential for plant life and a key greenhouse gas.",
        strategy: [
            "Carbon and oxygen collisions",
            "Higher temperatures help (60-75°K)",
            "Often forms via CO intermediate",
            "Watch for C + O₂ → CO₂ or C + 2O → CO₂"
        ],
        parameters: {
            temperature: "60-75°K",
            density: "200-300",
            energy: "30-50"
        },
        formula: "C + O₂ → CO₂ or C + 2O → CO₂"
    },
    nitrogen_gas: {
        description: "Form N₂ - making up 78% of Earth's atmosphere.",
        strategy: [
            "Nitrogen-nitrogen collisions",
            "Moderate conditions work well",
            "Very stable once formed",
            "Common in nitrogen-rich environments"
        ],
        parameters: {
            temperature: "40-65°K",
            density: "200-300",
            energy: "20-40"
        },
        formula: "N + N → N₂"
    },
    prebiotic_soup: {
        description: "Create H₂O, NH₃, and HCN - the building blocks of life.",
        strategy: [
            "Most challenging achievement!",
            "Need all element types present",
            "Balance parameters carefully",
            "Try creating H₂O and NH₃ first in the 50-70°K range.",
            "HCN (Hydrogen Cyanide) often requires slightly higher energy. Try creating CN (Cyanide) first, then see if it bonds with Hydrogen.",
            "Focus on one molecule at a time"
        ],
        parameters: {
            temperature: "50-70°K",
            density: "250-350",
            energy: "30-50"
        },
        formula: "H₂O + NH₃ + HCN"
    },
    master_chemist: {
        description: "Unlock all other achievements - becoming a true molecular master.",
        strategy: [
            "Systematically work through each achievement",
            "Use the help information for each one",
            "Track your progress in this panel",
            "Experiment and learn from each simulation",
            "Patience and observation are key"
        ],
        parameters: {
            temperature: "All ranges",
            density: "All ranges",
            energy: "All ranges"
        },
        formula: "Complete all challenges"
    }
};

const LEVEL_DEFINITIONS = [
    { // Level 0
        name: "Particle Soup",
        goal: "Form your first molecule.",
        xp_reward: 100,
        unlocks: "Oxygen particles become available.",
        checkCompletion: () => molecules.length >= 1,
        getProgress: () => {
            if (molecules.length > 0) return 100;
            return Math.min(99, (collisionCount / 1000) * 100);
        }
    },
    { // Level 1
        name: "Molecular Weaver",
        goal: "Create H₂O (Water).",
        xp_reward: 150,
        unlocks: "Carbon and Nitrogen particles become available.",
        checkCompletion: () => moleculeTypes.has('H₂O (Water)'),
        getProgress: () => {
            const totalMoleculesNeeded = 10;
            const waterProgress = moleculeTypes.has('H₂O (Water)') ? 50 : 0;
            const moleculeCountProgress = Math.min(50, (molecules.length / totalMoleculesNeeded) * 50);
            return waterProgress + moleculeCountProgress;
        }
    },
    { // Level 2
        name: "Prebiotic Soup",
        goal: "Create the building blocks of life: H₂O, NH₃, and HCN.",
        xp_reward: 300,
        unlocks: "Higher bonding complexity.",
        checkCompletion: () => moleculeTypes.has('H₂O (Water)') && moleculeTypes.has('NH₃ (Ammonia)') && moleculeTypes.has('HCN'),
        getProgress: () => {
            let progress = 0;
            if (moleculeTypes.has('H₂O (Water)')) progress += 33;
            if (moleculeTypes.has('NH₃ (Ammonia)')) progress += 33;
            if (moleculeTypes.has('HCN')) progress += 33;
            return progress;
        }
    },
    { // Level 3
        name: "Life Seeder",
        goal: "Witness the miracle of abiogenesis.",
        xp_reward: 1000,
        unlocks: "LifeForge and the next era of evolution!",
        checkCompletion: () => abiogenesisTriggered,
        getProgress: () => {
            let progress = (moleculeTypes.get('Glycine (Amino Acid)') ? 50 : 0) + (moleculeTypes.get('Lipid Precursor') ? 50 : 0);
            return progress;
        }
    }
];

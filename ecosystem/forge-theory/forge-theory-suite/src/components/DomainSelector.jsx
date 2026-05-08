// ui/domain-selector/DomainSelector.jsx
import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Star, TrendingUp, Activity } from 'lucide-react';

/**
 * DomainSelector - Interactive navigation for all Forge Theory domains
 * 
 * Features:
 * - Category-based organization
 * - Search/filter functionality
 * - Recently used tracking
 * - Favorites system
 * - Visual domain cards
 */
const DomainSelector = ({ 
  onDomainSelect, 
  currentDomain = null,
  favorites = [],
  recentlyUsed = [],
  onToggleFavorite 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Domain registry with metadata
  const domains = useMemo(() => ({
    'health-medicine': [
      {
        id: 'caffeine-forge',
        name: 'Caffeine Forge',
        description: 'Pharmacokinetic caffeine metabolism tracking',
        icon: '☕',
        color: 'amber',
        tags: ['pharmacokinetics', 'metabolism', 'sleep'],
        useCase: 'Track your buzz, predict your crash',
        complexity: 'beginner',
        popular: true
      },
      {
        id: 'dope-forge',
        name: 'Dope Forge',
        description: 'ADHD motivation decay modeling',
        icon: '🧠',
        color: 'purple',
        tags: ['adhd', 'motivation', 'productivity'],
        useCase: 'Predict project abandonment risk',
        complexity: 'intermediate'
      },
      {
        id: 'tooth-forge',
        name: 'Tooth Forge',
        description: '30-year dental decay prediction',
        icon: '🦷',
        color: 'blue',
        tags: ['dental', 'health', 'prevention'],
        useCase: 'Patient retention & treatment planning',
        complexity: 'beginner'
      },
      {
        id: 'therapeutic-forge',
        name: 'Therapeutic Forge',
        description: 'General medical pharmacokinetics',
        icon: '💊',
        color: 'green',
        tags: ['medicine', 'drugs', 'treatment'],
        useCase: 'Drug dosing & treatment timelines',
        complexity: 'advanced'
      }
    ],
    'agriculture-cultivation': [
      {
        id: 'canna-forge',
        name: 'Canna Forge',
        description: 'Cannabis cultivation optimization',
        icon: '🌿',
        color: 'emerald',
        tags: ['cannabis', 'cultivation', 'yield'],
        useCase: 'Yield prediction & nutrient timing',
        complexity: 'intermediate',
        popular: true
      },
      {
        id: 'canna-suit',
        name: 'Canna Suite',
        description: 'Complete cannabis ecosystem',
        icon: '🏭',
        color: 'emerald',
        tags: ['cannabis', 'enterprise', 'tracking'],
        useCase: 'Seed-to-sale tracking & compliance',
        complexity: 'advanced'
      },
      {
        id: 'terp-forge',
        name: 'Terp Forge',
        description: 'Terpene profile modeling',
        icon: '🧪',
        color: 'lime',
        tags: ['terpenes', 'flavor', 'effects'],
        useCase: 'Flavor & effect optimization',
        complexity: 'advanced'
      }
    ],
    'coffee-science': [
      {
        id: 'roast-forge',
        name: 'Roast Forge',
        description: 'Green bean chemistry modeling',
        icon: '🔥',
        color: 'orange',
        tags: ['roasting', 'chemistry', 'flavor'],
        useCase: 'Flavor compound development',
        complexity: 'advanced'
      },
      {
        id: 'brew-forge',
        name: 'Brew Forge',
        description: 'Extraction physics modeling',
        icon: '☕',
        color: 'amber',
        tags: ['brewing', 'extraction', 'physics'],
        useCase: 'Optimal brewing parameters',
        complexity: 'intermediate',
        popular: true
      },
      {
        id: 'grind-forge',
        name: 'Grind Forge',
        description: 'Particle distribution analysis',
        icon: '⚙️',
        color: 'stone',
        tags: ['grinding', 'particles', 'distribution'],
        useCase: 'Grind size optimization',
        complexity: 'intermediate'
      },
      {
        id: 'coffee-suite',
        name: 'Coffee Suite',
        description: 'Complete bean-to-cup journey',
        icon: '🏆',
        color: 'amber',
        tags: ['coffee', 'complete', 'quality'],
        useCase: 'End-to-end quality control',
        complexity: 'advanced'
      }
    ],
    'security-risk': [
      {
        id: 'cyber-forge',
        name: 'Cyber Forge',
        description: 'Breach probability calculator',
        icon: '🔒',
        color: 'red',
        tags: ['security', 'risk', 'breach'],
        useCase: 'Defense-in-depth quantification',
        complexity: 'intermediate',
        popular: true
      },
      {
        id: 'trial-forge',
        name: 'Trial Forge',
        description: 'Clinical trial patient retention',
        icon: '👥',
        color: 'blue',
        tags: ['clinical', 'trials', 'retention'],
        useCase: 'Dropout risk prediction',
        complexity: 'advanced'
      },
      {
        id: 'cleanroom-forge',
        name: 'Cleanroom Forge',
        description: 'Contamination decay modeling',
        icon: '🧬',
        color: 'cyan',
        tags: ['cleanroom', 'contamination', 'compliance'],
        useCase: 'ISO compliance prediction',
        complexity: 'advanced'
      }
    ],
    'manufacturing-maintenance': [
      {
        id: 'tyre-forge',
        name: 'Tyre Forge',
        description: 'Tread wear prediction',
        icon: '🚗',
        color: 'slate',
        tags: ['automotive', 'maintenance', 'safety'],
        useCase: 'Fleet management & safety',
        complexity: 'beginner',
        popular: true
      },
      {
        id: 'motor-forge',
        name: 'Motor Forge',
        description: 'Motion sizing & performance',
        icon: '⚡',
        color: 'yellow',
        tags: ['motors', 'engineering', 'performance'],
        useCase: 'Engineering calculations',
        complexity: 'advanced'
      },
      {
        id: 'supply-forge',
        name: 'Supply Forge',
        description: 'Procurement optimization',
        icon: '📦',
        color: 'indigo',
        tags: ['supply-chain', 'procurement', 'optimization'],
        useCase: 'Supply chain efficiency',
        complexity: 'intermediate'
      }
    ],
    'biological-evolution': [
      {
        id: 'bodyforge',
        name: 'Body Forge',
        description: 'Evolutionary adaptation simulator',
        icon: '🦎',
        color: 'green',
        tags: ['evolution', 'adaptation', 'biology'],
        useCase: 'Visualize natural selection',
        complexity: 'beginner'
      },
      {
        id: 'ecoforge',
        name: 'Eco Forge',
        description: 'Ecosystem dynamics modeling',
        icon: '🌍',
        color: 'emerald',
        tags: ['ecology', 'ecosystems', 'dynamics'],
        useCase: 'Food web modeling',
        complexity: 'intermediate'
      },
      {
        id: 'lifeforge',
        name: 'Life Forge',
        description: 'Cellular evolution simulation',
        icon: '🧬',
        color: 'cyan',
        tags: ['cells', 'evolution', 'origin'],
        useCase: 'Origin of life simulation',
        complexity: 'advanced'
      }
    ],
    'energy-environment': [
      {
        id: 'carbon-forge',
        name: 'Carbon Forge',
        description: 'Carbon footprint tracking',
        icon: '🌱',
        color: 'green',
        tags: ['carbon', 'environment', 'sustainability'],
        useCase: 'Sustainability metrics',
        complexity: 'beginner'
      },
      {
        id: 'emissions-forge',
        name: 'Emissions Forge',
        description: 'Pollution decay modeling',
        icon: '🏭',
        color: 'gray',
        tags: ['pollution', 'emissions', 'environmental'],
        useCase: 'Environmental impact',
        complexity: 'intermediate'
      },
      {
        id: 'energy-flow-forge',
        name: 'Energy Flow Forge',
        description: 'Energy conservation visualization',
        icon: '⚡',
        color: 'yellow',
        tags: ['energy', 'conservation', 'physics'],
        useCase: 'System efficiency analysis',
        complexity: 'advanced'
      }
    ],
    'creative-emergence': [
      {
        id: 'artforge',
        name: 'Art Forge',
        description: 'Evolutionary art generation',
        icon: '🎨',
        color: 'pink',
        tags: ['art', 'evolution', 'genetic-algorithm'],
        useCase: 'Genetic algorithm art',
        complexity: 'beginner'
      },
      {
        id: 'langforge',
        name: 'Lang Forge',
        description: 'Language emergence simulation',
        icon: '💬',
        color: 'blue',
        tags: ['language', 'communication', 'emergence'],
        useCase: 'Communication system evolution',
        complexity: 'intermediate'
      },
      {
        id: 'neuroforge',
        name: 'Neuro Forge',
        description: 'Neural network visualization',
        icon: '🧠',
        color: 'purple',
        tags: ['neural-networks', 'ml', 'education'],
        useCase: 'ML education & visualization',
        complexity: 'intermediate'
      }
    ]
  }), []);

  // Category metadata
  const categories = {
    'health-medicine': {
      name: 'Health & Medicine',
      icon: '💊',
      description: 'Pharmacokinetics and medical modeling'
    },
    'agriculture-cultivation': {
      name: 'Agriculture & Cultivation',
      icon: '🌿',
      description: 'Plant growth and optimization'
    },
    'coffee-science': {
      name: 'Coffee Science',
      icon: '☕',
      description: 'Bean to cup chemistry and physics'
    },
    'security-risk': {
      name: 'Security & Risk',
      icon: '🔒',
      description: 'Probability and risk modeling'
    },
    'manufacturing-maintenance': {
      name: 'Manufacturing & Maintenance',
      icon: '⚙️',
      description: 'Industrial and maintenance prediction'
    },
    'biological-evolution': {
      name: 'Biological Evolution',
      icon: '🦎',
      description: 'Evolution and ecosystem dynamics'
    },
    'energy-environment': {
      name: 'Energy & Environment',
      icon: '🌍',
      description: 'Environmental impact and energy flow'
    },
    'creative-emergence': {
      name: 'Creative & Emergence',
      icon: '🎨',
      description: 'Evolutionary and emergent systems'
    }
  };

  // Flatten all domains for search
  const allDomains = useMemo(() => {
    return Object.entries(domains).flatMap(([category, domainList]) =>
      domainList.map(domain => ({ ...domain, category }))
    );
  }, [domains]);

  // Filter domains based on search and category
  const filteredDomains = useMemo(() => {
    let filtered = allDomains;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.tags.some(tag => tag.includes(query)) ||
        d.useCase.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allDomains, selectedCategory, searchQuery]);

  // Get popular domains
  const popularDomains = useMemo(() => {
    return allDomains.filter(d => d.popular);
  }, [allDomains]);

  // Color mapping for Tailwind classes
  const colorClasses = {
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    lime: 'bg-lime-100 text-lime-800 border-lime-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    stone: 'bg-stone-100 text-stone-800 border-stone-300'
  };

  const DomainCard = ({ domain }) => {
    const isFavorite = favorites.includes(domain.id);
    const isRecent = recentlyUsed.includes(domain.id);
    const isCurrent = currentDomain === domain.id;

    return (
      <div
        onClick={() => onDomainSelect(domain.id)}
        className={`
          relative p-6 rounded-lg border-2 cursor-pointer
          transition-all duration-200 hover:shadow-lg hover:-translate-y-1
          ${isCurrent ? 'ring-4 ring-blue-500' : ''}
          ${colorClasses[domain.color]}
        `}
      >
        {/* Favorite star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(domain.id);
          }}
          className="absolute top-2 right-2 p-1 hover:scale-110 transition-transform"
        >
          <Star
            size={20}
            fill={isFavorite ? 'currentColor' : 'none'}
            className={isFavorite ? 'text-yellow-500' : 'text-gray-400'}
          />
        </button>

        {/* Domain icon and name */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-4xl">{domain.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{domain.name}</h3>
            <p className="text-sm opacity-80">{domain.description}</p>
          </div>
        </div>

        {/* Use case */}
        <div className="mb-3">
          <p className="text-sm font-medium italic">"{domain.useCase}"</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {domain.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-white/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer badges */}
        <div className="flex items-center gap-2 text-xs">
          {domain.popular && (
            <span className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded">
              <TrendingUp size={12} />
              Popular
            </span>
          )}
          {isRecent && (
            <span className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded">
              <Activity size={12} />
              Recent
            </span>
          )}
          <span className="ml-auto px-2 py-1 bg-white/50 rounded capitalize">
            {domain.complexity}
          </span>
        </div>

        {/* Launch button */}
        <div className="mt-4 pt-4 border-t border-current/20">
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-white/30 rounded hover:bg-white/50 transition-colors">
            <span className="font-medium">Launch</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Forge Theory Suite</h1>
        <p className="text-xl text-gray-600">
          One Mathematical Framework, Infinite Applications
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search domains by name, tags, or use case..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            All Domains
          </button>
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                ${selectedCategory === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular domains section */}
      {selectedCategory === 'all' && !searchQuery && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={24} />
            Popular Domains
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularDomains.map(domain => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {searchQuery ? `Search Results (${filteredDomains.length})` : 
           selectedCategory === 'all' ? 'All Domains' :
           categories[selectedCategory].name}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Domain grid */}
      {filteredDomains.length > 0 ? (
        <div className={`
          grid gap-4
          ${viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
          }
        `}>
          {filteredDomains.map(domain => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">
            No domains found matching "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Theory info footer */}
      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-2">What is Forge Theory?</h3>
        <p className="text-gray-700 mb-4">
          Forge Theory demonstrates that exponential decay (N(t) = N₀ × e<sup>-kt</sup>) is the
          fundamental pattern underlying complex systems across all domains. From caffeine metabolism
          to security breaches, from tire wear to patient retention—the math is the same.
        </p>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Learn More
          </button>
          <button className="px-4 py-2 bg-white border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50">
            Read Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainSelector;

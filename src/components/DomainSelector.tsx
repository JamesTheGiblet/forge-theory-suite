import React, { useState, useMemo } from 'react';
import registry from '../core/domain-registry.json';

interface DomainSelectorProps {
  onDomainSelect: (domainId: string) => void;
  currentDomain: string | null;
}

const colorMap: Record<string, string> = {
  amber: 'from-amber-500 to-orange-500',
  purple: 'from-purple-500 to-indigo-500',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  emerald: 'from-emerald-500 to-teal-500',
  lime: 'from-lime-500 to-green-500',
  orange: 'from-orange-500 to-red-500',
  stone: 'from-stone-500 to-neutral-500',
  red: 'from-red-500 to-rose-500',
  cyan: 'from-cyan-500 to-sky-500',
  slate: 'from-slate-500 to-gray-500',
  yellow: 'from-yellow-400 to-amber-500',
  indigo: 'from-indigo-500 to-violet-500',
  pink: 'from-pink-500 to-rose-500',
  gray: 'from-gray-500 to-slate-500',
};

const bgMap: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lime: 'bg-lime-50 text-lime-700 border-lime-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  stone: 'bg-stone-50 text-stone-700 border-stone-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

const DomainSelector: React.FC<DomainSelectorProps> = ({ onDomainSelect, currentDomain }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const domains = Object.values(registry.domains);
  const categories = registry.categories;

  const filteredDomains = useMemo(() => {
    return domains.filter(domain => {
      const matchesSearch = domain.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            domain.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || domain.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [domains, searchTerm, selectedCategory]);

  // Group filtered domains by category for display
  const domainsByCategory = useMemo(() => {
    return filteredDomains.reduce((acc, domain) => {
      const category = domain.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(domain);
      return acc;
    }, {} as Record<string, typeof domains>);
  }, [filteredDomains]);

  return (
    <div className="space-y-8">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-40 backdrop-blur-md bg-white/90">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search domains..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {Object.entries(categories).sort((a, b) => a[1].order - b[1].order).map(([catId, catDetails]) => (
            <button
              key={catId}
              onClick={() => setSelectedCategory(catId)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === catId 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{catDetails.icon}</span>
              {catDetails.name}
            </button>
          ))}
        </div>
      </div>

      {/* Domain Grid */}
      <div className="space-y-12">
        {Object.entries(categories).sort((a, b) => a[1].order - b[1].order).map(([catId, catDetails]) => {
          const categoryDomains = domainsByCategory[catId];
          if (!categoryDomains || categoryDomains.length === 0) return null;

          return (
            <div key={catId} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 ml-2">
                <span className="text-3xl p-2 bg-white rounded-lg shadow-sm border border-slate-100">{catDetails.icon}</span>
                <div>
                  <h3 className="font-bold text-2xl text-slate-800">
                    {catDetails.name}
                  </h3>
                  <p className="text-slate-500 text-sm">{catDetails.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryDomains.map(domain => {
                  const gradient = colorMap[domain.color] || 'from-slate-500 to-gray-500';
                  const themeStyle = bgMap[domain.color] || bgMap['slate'];
                  const isSelected = currentDomain === domain.id;

                  return (
                    <button
                      key={domain.id}
                      onClick={() => onDomainSelect(domain.id)}
                      className={`group relative text-left h-full flex flex-col bg-white rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                          : 'border-slate-200 hover:border-blue-300'
                      } overflow-hidden`}
                    >
                      {/* Card Header with Gradient */}
                      <div className={`h-2 w-full bg-gradient-to-r ${gradient}`}></div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm ${themeStyle} bg-opacity-50`}>
                            {domain.icon}
                          </div>
                          {'popular' in domain && domain.popular && (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                              <span className="animate-pulse">★</span> POPULAR
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {domain.name}
                        </h4>
                        
                        <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                          {domain.description}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-50">
                          {domain.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">
                              #{tag}
                            </span>
                          ))}
                          {domain.tags && domain.tags.length > 2 && (
                            <span className="text-xs px-2 py-1 bg-slate-50 text-slate-400 rounded-md">
                              +{domain.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {filteredDomains.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-lg">No domains found matching "{searchTerm}"</p>
            <button 
              onClick={() => {setSearchTerm(''); setSelectedCategory('all');}}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainSelector;
import { useState, useMemo } from 'react';
// import registry from './core/domain-registry.json';

// Import your priority domain logic
import UnifiedDashboard from './components/UnifiedDashboard';
import DomainSelector from './components/DomainSelector';
import { CaffeineForge } from './domains/caffeine-forge-enhanced';

function App() {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [activeForges, setActiveForges] = useState<CaffeineForge[]>([]);

  // Initialize your first "Sovereign Tier" domain
  const caffeineForge = useMemo(() => new CaffeineForge(), []);

  const handleDomainSelect = (domainId: string) => {
    setActiveDomain(domainId);
    
    // In a real app, you'd instantiate the specific forge class here
    // For the MVP, we'll add the active forge to the dashboard list
    if (domainId === 'caffeine-forge' && !activeForges.find(f => f.domain === domainId)) {
      setActiveForges([...activeForges, caffeineForge]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Universal Navigation */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-blue-500/50 shadow-lg">
              <span className="text-lg font-bold">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Forge Theory <span className="text-blue-400 font-light">Suite</span></h1>
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <button 
              type="button"
              onClick={() => setActiveDomain(null)} 
              className={`transition-colors ${!activeDomain ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}
            >
              Domain Selector
            </button>
            <button type="button" className="text-slate-500 cursor-not-allowed flex items-center gap-2">
              Security Platform 
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Phase 2</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        {!activeDomain ? (
          <>
            <div className="mb-12 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Reality</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Select a domain below to initialize a Forge. Model complex systems, predict outcomes, and optimize your daily existence through applied theory.
              </p>
            </div>
            
            <div className="transform transition-all duration-500 ease-in-out">
              <DomainSelector 
                onDomainSelect={handleDomainSelect}
                currentDomain={activeDomain}
              />
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <button 
                type="button"
                onClick={() => setActiveDomain(null)}
                className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors px-4 py-2 rounded-full hover:bg-blue-50"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> 
                Back to Selector
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <span className="text-sm font-medium text-slate-400">Active Session</span>
            </div>
            
            <UnifiedDashboard 
              activeForges={activeForges} 
              onNavigateToDomain={handleDomainSelect}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto py-12 border-t border-slate-200 bg-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm mb-2">© 2026 Sovereign Systems Research</p>
          <p className="text-xs text-slate-400">Forge Theory Platform v0.1.0-alpha</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
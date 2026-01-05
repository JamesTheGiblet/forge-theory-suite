import React from 'react';

interface Forge {
  config?: {
    id?: string;
    name?: string;
    units?: {
      amount?: string;
    };
  };
  state?: {
    currentLevel?: number;
  };
  getPhysiologicalState?: () => { state: string };
}

interface UnifiedDashboardProps {
  activeForges: Forge[];
  onNavigateToDomain: (domainId: string) => void;
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ activeForges, onNavigateToDomain }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Unified Dashboard</h2>
      
      {activeForges.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">No active forges initialized.</p>
          <p className="text-sm text-gray-400">Select a domain to begin tracking.</p>
        </div>
      ) : (
        <div className="forge-row">
          {activeForges.map((forge, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-blue-600">
                  {forge.config?.name || 'Unknown Forge'}
                </h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Current Level:</span>
                  <span className="font-medium">
                    {forge.state?.currentLevel?.toFixed(2) || 0} {forge.config?.units?.amount || 'units'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium capitalize">
                    {forge.getPhysiologicalState ? forge.getPhysiologicalState().state : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button 
                  className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  onClick={() => forge.config?.id && onNavigateToDomain(forge.config.id)}
                  disabled={!forge.config?.id}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;
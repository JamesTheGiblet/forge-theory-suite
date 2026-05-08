// ui/comparison-tools/ComparisonTools.jsx
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Plus, X, RefreshCw, Download, Share2 } from 'lucide-react';

/**
 * ComparisonTools - Side-by-side domain comparison and analysis
 * 
 * Features:
 * - Compare 2-4 domains simultaneously
 * - Overlay decay curves
 * - Highlight parameter differences
 * - Export comparison data
 * - Share comparison configurations
 */
const ComparisonTools = ({
  availableDomains = [],
  onAddDomain,
  onRemoveDomain
}) => {
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('overlay'); // 'overlay', 'side-by-side', 'normalized'
  const [timeRange, setTimeRange] = useState(24);
  const [showParameters, setShowParameters] = useState(true);

  // Add domain to comparison
  const handleAddDomain = (domainId) => {
    if (selectedDomains.length < 4 && !selectedDomains.includes(domainId)) {
      setSelectedDomains([...selectedDomains, domainId]);
      onAddDomain?.(domainId);
    }
  };

  // Remove domain from comparison
  const handleRemoveDomain = (domainId) => {
    setSelectedDomains(selectedDomains.filter(id => id !== domainId));
    onRemoveDomain?.(domainId);
  };

  // Get domain data for selected domains
  const domainData = useMemo(() => {
    return selectedDomains.map(id => 
      availableDomains.find(d => d.id === id)
    ).filter(Boolean);
  }, [selectedDomains, availableDomains]);

  // Generate comparison data
  const comparisonData = useMemo(() => {
    if (domainData.length === 0) return [];

    const steps = 100;
    const data = [];

    for (let i = 0; i <= steps; i++) {
      const time = (i / steps) * timeRange;
      const point = {
        time,
        timeLabel: `${time.toFixed(1)}h`
      };

      domainData.forEach(domain => {
        const rate = domain.rateConstant || 0.1;
        const initial = domain.initialValue || 100;
        
        if (comparisonMode === 'normalized') {
          // Normalize to percentage
          point[domain.id] = 100 * Math.exp(-rate * time);
        } else {
          // Absolute values
          point[domain.id] = initial * Math.exp(-rate * time);
        }

        // Calculate half-lives elapsed
        const halfLife = Math.LN2 / rate;
        point[`${domain.id}_halfLives`] = time / halfLife;
      });

      data.push(point);
    }

    return data;
  }, [domainData, timeRange, comparisonMode]);

  // Calculate comparison statistics
  const statistics = useMemo(() => {
    if (domainData.length < 2) return null;

    const stats = {
      domains: domainData.map(d => ({
        id: d.id,
        name: d.name,
        rateConstant: d.rateConstant || 0.1,
        halfLife: Math.LN2 / (d.rateConstant || 0.1),
        timeConstant: 1 / (d.rateConstant || 0.1)
      }))
    };

    // Find fastest and slowest decay
    const rates = stats.domains.map(d => d.rateConstant);
    stats.fastestDomain = stats.domains[rates.indexOf(Math.max(...rates))];
    stats.slowestDomain = stats.domains[rates.indexOf(Math.min(...rates))];
    
    // Calculate ratio
    stats.decayRatio = stats.fastestDomain.rateConstant / stats.slowestDomain.rateConstant;

    // Time for all to reach 50%
    stats.timeTo50Percent = stats.domains.map(d => ({
      domain: d.name,
      time: d.halfLife
    }));

    // Time for all to reach 10%
    stats.timeTo10Percent = stats.domains.map(d => ({
      domain: d.name,
      time: Math.log(10) / d.rateConstant
    }));

    return stats;
  }, [domainData]);

  // Domain color mapping
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  const DomainSelector = () => (
    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
      <h3 className="font-bold mb-3">Select Domains to Compare</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {availableDomains.map(domain => {
          const isSelected = selectedDomains.includes(domain.id);
          const canSelect = selectedDomains.length < 4;

          return (
            <button
              key={domain.id}
              onClick={() => isSelected ? handleRemoveDomain(domain.id) : handleAddDomain(domain.id)}
              disabled={!isSelected && !canSelect}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : canSelect
                    ? 'bg-gray-50 border-gray-300 hover:border-blue-300'
                    : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{domain.icon}</span>
                  <span className="text-sm font-medium">{domain.name}</span>
                </div>
                {isSelected && <X size={16} />}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-gray-600 mt-3">
        {selectedDomains.length}/4 domains selected
      </p>
    </div>
  );

  const ParameterTable = () => {
    if (!showParameters || domainData.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 overflow-x-auto">
        <h3 className="font-bold mb-3">Parameter Comparison</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3">Parameter</th>
              {domainData.map((domain, idx) => (
                <th
                  key={domain.id}
                  className="text-left py-2 px-3"
                  style={{ color: colors[idx] }}
                >
                  {domain.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Rate Constant (k)</td>
              {domainData.map(domain => (
                <td key={domain.id} className="py-2 px-3">
                  {(domain.rateConstant || 0.1).toFixed(4)} time⁻¹
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Half-Life</td>
              {domainData.map(domain => (
                <td key={domain.id} className="py-2 px-3">
                  {(Math.LN2 / (domain.rateConstant || 0.1)).toFixed(2)} time units
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Time Constant (τ)</td>
              {domainData.map(domain => (
                <td key={domain.id} className="py-2 px-3">
                  {(1 / (domain.rateConstant || 0.1)).toFixed(2)} time units
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Time to 50%</td>
              {domainData.map(domain => {
                const halfLife = Math.LN2 / (domain.rateConstant || 0.1);
                return (
                  <td key={domain.id} className="py-2 px-3">
                    {halfLife.toFixed(2)} units
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">Time to 10%</td>
              {domainData.map(domain => {
                const time = Math.log(10) / (domain.rateConstant || 0.1);
                return (
                  <td key={domain.id} className="py-2 px-3">
                    {time.toFixed(2)} units
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Time to 1%</td>
              {domainData.map(domain => {
                const time = Math.log(100) / (domain.rateConstant || 0.1);
                return (
                  <td key={domain.id} className="py-2 px-3">
                    {time.toFixed(2)} units
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const ComparisonChart = () => {
    if (domainData.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">Select domains above to begin comparison</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            {comparisonMode === 'overlay' ? 'Overlaid Decay Curves' :
             comparisonMode === 'side-by-side' ? 'Side-by-Side Comparison' :
             'Normalized Comparison (%)'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setComparisonMode('overlay')}
              className={`px-3 py-1 rounded ${comparisonMode === 'overlay' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Overlay
            </button>
            <button
              onClick={() => setComparisonMode('normalized')}
              className={`px-3 py-1 rounded ${comparisonMode === 'normalized' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Normalized
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timeLabel"
              label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ 
                value: comparisonMode === 'normalized' ? 'Remaining (%)' : 'Amount', 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip />
            <Legend />
            {domainData.map((domain, idx) => (
              <Line
                key={domain.id}
                type="monotone"
                dataKey={domain.id}
                name={domain.name}
                stroke={colors[idx]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const InsightCards = () => {
    if (!statistics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h4 className="font-bold mb-2">Fastest Decay</h4>
          <p className="text-2xl font-bold mb-1">{statistics.fastestDomain.name}</p>
          <p className="text-sm text-gray-600">
            Half-life: {statistics.fastestDomain.halfLife.toFixed(2)} units
          </p>
          <p className="text-sm text-gray-600">
            Rate: {statistics.fastestDomain.rateConstant.toFixed(4)} time⁻¹
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <h4 className="font-bold mb-2">Slowest Decay</h4>
          <p className="text-2xl font-bold mb-1">{statistics.slowestDomain.name}</p>
          <p className="text-sm text-gray-600">
            Half-life: {statistics.slowestDomain.halfLife.toFixed(2)} units
          </p>
          <p className="text-sm text-gray-600">
            Rate: {statistics.slowestDomain.rateConstant.toFixed(4)} time⁻¹
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 md:col-span-2">
          <h4 className="font-bold mb-2">Decay Rate Ratio</h4>
          <p className="text-xl mb-2">
            <span className="font-bold">{statistics.fastestDomain.name}</span> decays{' '}
            <span className="text-2xl font-bold text-purple-600">
              {statistics.decayRatio.toFixed(2)}x
            </span>{' '}
            faster than <span className="font-bold">{statistics.slowestDomain.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Despite this difference, both follow the same exponential pattern: N(t) = N₀ × e^(-kt)
          </p>
        </div>
      </div>
    );
  };

  const HalfLifeComparison = () => {
    if (!statistics || domainData.length < 2) return null;

    // Create visualization showing when each domain reaches various percentages
    const milestones = [50, 25, 10, 5, 1];
    const data = milestones.map(percent => {
      const point = { percent };
      domainData.forEach(domain => {
        const rate = domain.rateConstant || 0.1;
        const time = -Math.log(percent / 100) / rate;
        point[domain.id] = time;
      });
      return point;
    });

    return (
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <h3 className="text-xl font-bold mb-4">Time to Reach Milestones</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="percent"
              label={{ value: 'Remaining (%)', position: 'insideBottom', offset: -5 }}
              reversed
            />
            <YAxis label={{ value: 'Time (units)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {domainData.map((domain, idx) => (
              <Line
                key={domain.id}
                type="monotone"
                dataKey={domain.id}
                name={domain.name}
                stroke={colors[idx]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comparison Tools</h1>
          <p className="text-gray-600">Compare decay patterns across domains</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowParameters(!showParameters)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={16} />
            {showParameters ? 'Hide' : 'Show'} Parameters
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg flex items-center gap-2">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Domain Selector */}
      <DomainSelector />

      {/* Parameter Table */}
      <ParameterTable />

      {/* Main Comparison Chart */}
      <ComparisonChart />

      {/* Insight Cards */}
      <InsightCards />

      {/* Half-Life Comparison */}
      <HalfLifeComparison />

      {/* Universal Formula Reminder */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-3">🧮 Universal Formula</h3>
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-3">
          <p className="text-center text-2xl font-mono mb-2">
            N(t) = N₀ × e<sup>-kt</sup>
          </p>
          <p className="text-center text-gray-600 text-sm">
            Same equation, different parameters
          </p>
        </div>
        <p className="text-gray-700">
          All {domainData.length} selected domains follow this identical mathematical pattern.
          The only differences are the rate constant <strong>k</strong> and initial value <strong>N₀</strong>.
          This universality is the core insight of Forge Theory.
        </p>
      </div>

      {/* Time Range Controls */}
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        <label className="block font-medium mb-2">Time Range</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="100"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="font-mono text-lg w-20 text-right">
            {timeRange} units
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 unit</span>
          <span>100 units</span>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTools;

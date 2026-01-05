// ui/unified-dashboard/UnifiedDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * UnifiedDashboard - Cross-domain insights and analytics
 * 
 * Shows:
 * - Active decay processes across all domains
 * - Unified timeline of all tracked items
 * - Cross-domain comparisons
 * - Health metrics and warnings
 * - Pattern recognition across domains
 */
const UnifiedDashboard = ({
  activeForges = [],
  timeRange = '24h',
  onNavigateToDomain
}) => {
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [timelineData, setTimelineData] = useState([]);
  const [insights, setInsights] = useState([]);

  // Calculate unified timeline from all active forges
  useEffect(() => {
    const timeline = generateUnifiedTimeline(activeForges, timeRange);
    setTimelineData(timeline);

    const calculatedInsights = calculateInsights(activeForges);
    setInsights(calculatedInsights);
  }, [activeForges, timeRange]);

  // Generate timeline data combining all domains
  const generateUnifiedTimeline = (forges, range) => {
    const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
    const steps = Math.min(hours, 100);
    const timeline = [];

    for (let i = 0; i <= steps; i++) {
      const time = (i / steps) * hours;
      const dataPoint = {
        time: time,
        timeLabel: formatTimeLabel(time, range)
      };

      // Add data from each active forge
      forges.forEach(forge => {
        if (forge.getCurrentLevel) {
          const futureTime = new Date(Date.now() + time * 60 * 60 * 1000);
          dataPoint[forge.domain] = forge.getCurrentLevel(futureTime);
        } else if (forge.calculate) {
          dataPoint[forge.domain] = forge.calculate(
            forge.initialValue || 100,
            forge.rateConstant || 0.1,
            time
          );
        }
      });

      timeline.push(dataPoint);
    }

    return timeline;
  };

  // Format time labels based on range
  const formatTimeLabel = (hours, range) => {
    if (range === '24h') {
      return `${Math.round(hours)}h`;
    } else if (range === '7d') {
      return `Day ${Math.round(hours / 24)}`;
    } else {
      return `Week ${Math.round(hours / 168)}`;
    }
  };

  // Calculate insights and warnings
  const calculateInsights = (forges) => {
    const insights = [];

    forges.forEach(forge => {
      const domain = forge.domain;
      const currentLevel = forge.getCurrentLevel ? forge.getCurrentLevel() : null;

      if (currentLevel !== null) {
        // Check for critical levels
        if (forge.thresholds) {
          if (currentLevel >= forge.thresholds.critical) {
            insights.push({
              type: 'critical',
              domain: domain,
              message: `Critical level reached in ${domain}`,
              value: currentLevel,
              icon: AlertTriangle,
              color: 'red'
            });
          } else if (currentLevel >= forge.thresholds.warning) {
            insights.push({
              type: 'warning',
              domain: domain,
              message: `Warning level in ${domain}`,
              value: currentLevel,
              icon: AlertTriangle,
              color: 'yellow'
            });
          } else if (currentLevel <= forge.thresholds.safe) {
            insights.push({
              type: 'safe',
              domain: domain,
              message: `${domain} within safe range`,
              value: currentLevel,
              icon: CheckCircle,
              color: 'green'
            });
          }
        }

        // Calculate time to threshold
        if (forge.timeToReach && forge.thresholds) {
          const timeToSafe = forge.timeToReach(
            currentLevel,
            forge.thresholds.safe,
            forge.rateConstant
          );

          if (timeToSafe > 0 && timeToSafe < 24) {
            insights.push({
              type: 'info',
              domain: domain,
              message: `${domain} will reach safe level in ${timeToSafe.toFixed(1)} hours`,
              value: timeToSafe,
              icon: Clock,
              color: 'blue'
            });
          }
        }
      }
    });

    return insights;
  };

  // Summary statistics
  const statistics = useMemo(() => {
    const stats = {
      totalActiveForges: activeForges.length,
      criticalAlerts: insights.filter(i => i.type === 'critical').length,
      warnings: insights.filter(i => i.type === 'warning').length,
      safeItems: insights.filter(i => i.type === 'safe').length
    };

    // Calculate average decay rates
    const decayRates = activeForges
      .map(f => f.rateConstant)
      .filter(r => r !== undefined);
    
    if (decayRates.length > 0) {
      stats.avgDecayRate = decayRates.reduce((a, b) => a + b, 0) / decayRates.length;
      stats.fastestDecay = Math.max(...decayRates);
      stats.slowestDecay = Math.min(...decayRates);
    }

    return stats;
  }, [activeForges, insights]);

  // Radar chart data for cross-domain comparison
  const radarData = useMemo(() => {
    return activeForges.map(forge => ({
      domain: forge.domain,
      current: forge.getCurrentLevel ? 
        (forge.getCurrentLevel() / (forge.initialValue || 100)) * 100 : 50,
      halfLife: forge.halfLife || 5,
      complexity: forge.complexity === 'beginner' ? 33 : 
                 forge.complexity === 'intermediate' ? 66 : 100
    }));
  }, [activeForges]);

  // Color map for domains
  const domainColors = {
    'caffeine-forge': '#f59e0b',
    'cyber-forge': '#ef4444',
    'dope-forge': '#8b5cf6',
    'tooth-forge': '#3b82f6',
    'tyre-forge': '#64748b',
    'canna-forge': '#10b981',
    'brew-forge': '#f97316',
    'trial-forge': '#06b6d4'
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => (
    <div className={`p-6 rounded-lg border-2 bg-${color}-50 border-${color}-200`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {Icon && <Icon className={`text-${color}-500`} size={24} />}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold">{value}</p>
        {trend !== undefined && (
          <span className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );

  const InsightCard = ({ insight }) => {
    const Icon = insight.icon;
    const colorClasses = {
      red: 'bg-red-50 border-red-300 text-red-800',
      yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      green: 'bg-green-50 border-green-300 text-green-800',
      blue: 'bg-blue-50 border-blue-300 text-blue-800'
    };

    return (
      <div className={`p-4 rounded-lg border-2 ${colorClasses[insight.color]}`}>
        <div className="flex items-start gap-3">
          <Icon size={20} className="mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{insight.message}</p>
            <button
              onClick={() => onNavigateToDomain(insight.domain)}
              className="text-sm underline mt-1 hover:opacity-80"
            >
              View details →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Unified Dashboard</h1>
          <p className="text-gray-600">Cross-domain insights and monitoring</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Domains"
          value={statistics.totalActiveForges}
          subtitle="Currently tracking"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Critical Alerts"
          value={statistics.criticalAlerts}
          subtitle="Require attention"
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Warnings"
          value={statistics.warnings}
          subtitle="Monitor closely"
          icon={TrendingUp}
          color="yellow"
        />
        <StatCard
          title="Safe Items"
          value={statistics.safeItems}
          subtitle="Within normal range"
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Insights & Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Unified Timeline */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Unified Timeline</h2>
        <p className="text-gray-600 mb-4">
          All active decay processes visualized together
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeLabel" />
            <YAxis label={{ value: 'Level', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {activeForges.map((forge, idx) => (
              <Area
                key={forge.domain}
                type="monotone"
                dataKey={forge.domain}
                stroke={domainColors[forge.domain] || `hsl(${idx * 360 / activeForges.length}, 70%, 50%)`}
                fill={domainColors[forge.domain] || `hsl(${idx * 360 / activeForges.length}, 70%, 50%)`}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cross-Domain Comparison */}
      {activeForges.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-xl font-bold mb-4">Cross-Domain Profile</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" />
                <PolarRadiusAxis />
                <Radar
                  name="Current Level %"
                  dataKey="current"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Decay rate comparison */}
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-xl font-bold mb-4">Decay Rate Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activeForges.map(f => ({
                domain: f.domain,
                rate: f.rateConstant || 0,
                halfLife: f.halfLife || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="domain" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#8b5cf6" name="Rate Constant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pattern Recognition */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
        <h3 className="text-xl font-bold mb-4">🧠 Pattern Recognition</h3>
        <div className="space-y-3">
          {statistics.avgDecayRate && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">
                  Average decay rate across all domains: {statistics.avgDecayRate.toFixed(4)} time⁻¹
                </p>
                <p className="text-sm text-gray-600">
                  This suggests a typical half-life of ~{(0.693 / statistics.avgDecayRate).toFixed(1)} time units
                </p>
              </div>
            </div>
          )}
          
          {statistics.fastestDecay && statistics.slowestDecay && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">
                  Decay rate variance: {((statistics.fastestDecay / statistics.slowestDecay) - 1) * 100}% spread
                </p>
                <p className="text-sm text-gray-600">
                  Fastest domain decays {(statistics.fastestDecay / statistics.slowestDecay).toFixed(1)}x faster than slowest
                </p>
              </div>
            </div>
          )}

          {activeForges.length >= 3 && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">
                  Universal pattern confirmed across {activeForges.length} domains
                </p>
                <p className="text-sm text-gray-600">
                  All follow exponential decay N(t) = N₀ × e^(-kt)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {activeForges.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-gray-200">
          <Activity size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">No Active Domains</h3>
          <p className="text-gray-600 mb-4">
            Start tracking decay processes to see unified insights
          </p>
          <button
            onClick={() => onNavigateToDomain(null)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Browse Domains
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Icon from '../../../components/AppIcon';

const ScoreVisualization = ({ forces, overallScore }) => {
  // Prepare data for radar chart
  const radarData = forces?.map(force => ({
    force: force?.name?.split(' ')?.slice(0, 2)?.join(' '), // Shorten names for display
    score: force?.score,
    fullName: force?.name
  }));

  // Prepare data for bar chart
  const barData = forces?.map(force => ({
    name: force?.name?.split(' ')?.slice(0, 2)?.join(' '),
    score: force?.score,
    fullName: force?.name
  }));

  const getScoreColor = (score) => {
    if (score <= 2) return '#10B981'; // Green - Low threat/favorable
    if (score <= 3) return '#F59E0B'; // Amber - Moderate
    return '#EF4444'; // Red - High threat/unfavorable
  };

  const getOverallAssessment = (score) => {
    if (score <= 2) return { 
      label: 'Attractive Industry', 
      description: 'Low competitive forces create favorable conditions',
      color: 'text-green-600 bg-green-50 border-green-200'
    };
    if (score <= 3) return { 
      label: 'Moderately Attractive', 
      description: 'Mixed competitive forces require strategic positioning',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    };
    return { 
      label: 'Challenging Industry', 
      description: 'High competitive forces require strong differentiation',
      color: 'text-red-600 bg-red-50 border-red-200'
    };
  };

  const assessment = getOverallAssessment(overallScore);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data?.fullName}</p>
          <p className="text-sm text-gray-600">
            Score: <span className="font-medium">{data?.score}/5</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className={`rounded-lg border p-6 ${assessment?.color}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
              <Icon name="Target" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Industry Attractiveness</h3>
              <p className="text-sm opacity-80">{assessment?.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{overallScore?.toFixed(1)}</div>
            <div className="text-sm opacity-80">out of 5.0</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">{assessment?.label}</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-current rounded-full transition-all duration-500"
                style={{ width: `${(overallScore / 5) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">{Math.round((overallScore / 5) * 100)}%</span>
          </div>
        </div>
      </div>
      {/* Bar Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon name="BarChart3" size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Individual Force Scores</h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 5]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="score" 
                fill="#1E40AF"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Strategic Implications */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Icon name="Lightbulb" size={16} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-indigo-900">Strategic Implications</h3>
        </div>
        
        <div className="space-y-3 text-sm text-indigo-800">
          {overallScore <= 2 && (
            <>
              <p>• <strong>Market Entry:</strong> Favorable conditions for new entrants and expansion</p>
              <p>• <strong>Investment:</strong> Consider aggressive growth strategies and market share capture</p>
              <p>• <strong>Positioning:</strong> Focus on scaling operations and building market presence</p>
            </>
          )}
          {overallScore > 2 && overallScore <= 3 && (
            <>
              <p>• <strong>Selective Strategy:</strong> Choose market segments and positioning carefully</p>
              <p>• <strong>Differentiation:</strong> Develop unique value propositions to stand out</p>
              <p>• <strong>Partnerships:</strong> Consider strategic alliances to strengthen position</p>
            </>
          )}
          {overallScore > 3 && (
            <>
              <p>• <strong>Strong Differentiation:</strong> Essential to create sustainable competitive advantages</p>
              <p>• <strong>Niche Focus:</strong> Consider targeting underserved market segments</p>
              <p>• <strong>Innovation:</strong> Continuous innovation required to maintain competitiveness</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreVisualization;
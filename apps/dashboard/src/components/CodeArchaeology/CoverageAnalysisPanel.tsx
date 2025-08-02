import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface CoverageMetrics {
  totalRequirements: number;
  implementedRequirements: number;
  testedRequirements: number;
  documentedRequirements: number;
  overallCoverage: number;
  implementationCoverage: number;
  testCoverage: number;
  documentationCoverage: number;
}

interface GapAnalysis {
  missingImplementations: string[];
  missingTests: string[];
  missingDocumentation: string[];
  orphanedArtifacts: Array<{
    id: string;
    name: string;
    filePath: string;
    complexity: number;
  }>;
  lowConfidenceLinks: Array<{
    requirementId: string;
    confidence: number;
  }>;
}

interface VisualIndicator {
  id: string;
  type: 'gap' | 'orphan' | 'low-confidence' | 'complete';
  requirementId?: string;
  artifactId?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface CoverageAnalysisResult {
  metrics: CoverageMetrics;
  gaps: GapAnalysis;
  recommendations: string[];
  visualIndicators: VisualIndicator[];
}

interface CoverageAnalysisPanelProps {
  analysisResult: CoverageAnalysisResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onIndicatorClick?: (indicator: VisualIndicator) => void;
  className?: string;
}

const COLORS = {
  implemented: '#10B981',
  tested: '#3B82F6',
  documented: '#8B5CF6',
  missing: '#EF4444',
  orphaned: '#F59E0B',
  lowConfidence: '#F97316'
};

const CoverageAnalysisPanel: React.FC<CoverageAnalysisPanelProps> = ({
  analysisResult,
  isLoading = false,
  onRefresh,
  onIndicatorClick,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'indicators'>('overview');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No coverage analysis data available</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Run Analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  const { metrics, gaps, recommendations, visualIndicators } = analysisResult;

  // Prepare chart data
  const coverageData = [
    { name: 'Implementation', value: metrics.implementationCoverage, color: COLORS.implemented },
    { name: 'Testing', value: metrics.testCoverage, color: COLORS.tested },
    { name: 'Documentation', value: metrics.documentationCoverage, color: COLORS.documented }
  ];

  const gapData = [
    { name: 'Missing Impl.', count: gaps.missingImplementations.length, color: COLORS.missing },
    { name: 'Orphaned Code', count: gaps.orphanedArtifacts.length, color: COLORS.orphaned },
    { name: 'Low Confidence', count: gaps.lowConfidenceLinks.length, color: COLORS.lowConfidence }
  ];

  // Filter indicators by severity
  const filteredIndicators = selectedSeverity === 'all'
    ? visualIndicators
    : visualIndicators.filter(indicator => indicator.severity === selectedSeverity);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gap': return '⚠️';
      case 'orphan': return '🔍';
      case 'low-confidence': return '❓';
      case 'complete': return '✅';
      default: return '📋';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Coverage Analysis</h2>
          <div className="flex space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            )}
            <div className="text-sm text-gray-500">
              {metrics.overallCoverage.toFixed(1)}% Overall Coverage
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mt-4">
          {['overview', 'gaps', 'indicators'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Coverage Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coverage Percentages Chart */}
              <div>
                <h3 className="text-lg font-medium mb-4">Coverage by Type</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={coverageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Coverage']} />
                    <Bar dataKey="value" fill="#8884d8">
                      {coverageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gap Analysis Pie Chart */}
              <div>
                <h3 className="text-lg font-medium mb-4">Gap Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={gapData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {gapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{metrics.totalRequirements}</div>
                <div className="text-sm text-gray-600">Total Requirements</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.implementedRequirements}</div>
                <div className="text-sm text-gray-600">Implemented</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.testedRequirements}</div>
                <div className="text-sm text-gray-600">Tested</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{metrics.documentedRequirements}</div>
                <div className="text-sm text-gray-600">Documented</div>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                      <div className="text-blue-500 mt-0.5">💡</div>
                      <div className="text-sm text-blue-800">{rec}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-6">
            {/* Missing Implementations */}
            {gaps.missingImplementations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-red-600">
                  Missing Implementations ({gaps.missingImplementations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {gaps.missingImplementations.slice(0, 12).map((reqId) => (
                    <div key={reqId} className="px-3 py-2 bg-red-50 text-red-700 rounded text-sm">
                      {reqId}
                    </div>
                  ))}
                  {gaps.missingImplementations.length > 12 && (
                    <div className="px-3 py-2 bg-gray-50 text-gray-600 rounded text-sm">
                      +{gaps.missingImplementations.length - 12} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Orphaned Artifacts */}
            {gaps.orphanedArtifacts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-yellow-600">
                  Orphaned Code ({gaps.orphanedArtifacts.length})
                </h3>
                <div className="space-y-2">
                  {gaps.orphanedArtifacts.slice(0, 8).map((artifact) => (
                    <div key={artifact.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium text-yellow-800">{artifact.name}</div>
                        <div className="text-sm text-yellow-600">{artifact.filePath}</div>
                      </div>
                      <div className="text-sm text-yellow-600">
                        Complexity: {artifact.complexity}
                      </div>
                    </div>
                  ))}
                  {gaps.orphanedArtifacts.length > 8 && (
                    <div className="text-center text-gray-500 text-sm">
                      +{gaps.orphanedArtifacts.length - 8} more orphaned artifacts
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Low Confidence Links */}
            {gaps.lowConfidenceLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-orange-600">
                  Low Confidence Links ({gaps.lowConfidenceLinks.length})
                </h3>
                <div className="space-y-2">
                  {gaps.lowConfidenceLinks.slice(0, 8).map((link) => (
                    <div key={link.requirementId} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <div className="font-medium text-orange-800">{link.requirementId}</div>
                      <div className="text-sm text-orange-600">
                        {Math.round(link.confidence * 100)}% confidence
                      </div>
                    </div>
                  ))}
                  {gaps.lowConfidenceLinks.length > 8 && (
                    <div className="text-center text-gray-500 text-sm">
                      +{gaps.lowConfidenceLinks.length - 8} more low confidence links
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="space-y-4">
            {/* Severity Filter */}
            <div className="flex space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter by severity:</span>
              {['all', 'high', 'medium', 'low'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity as any)}
                  className={`px-3 py-1 text-xs rounded-full ${selectedSeverity === severity
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>

            {/* Visual Indicators List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredIndicators.map((indicator) => (
                <div
                  key={indicator.id}
                  onClick={() => onIndicatorClick?.(indicator)}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${getSeverityColor(indicator.severity)}`}
                >
                  <div className="text-lg">{getTypeIcon(indicator.type)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{indicator.message}</div>
                    {indicator.requirementId && (
                      <div className="text-xs opacity-75">Requirement: {indicator.requirementId}</div>
                    )}
                    {indicator.artifactId && (
                      <div className="text-xs opacity-75">Artifact: {indicator.artifactId}</div>
                    )}
                  </div>
                  <div className="text-xs font-medium uppercase">
                    {indicator.severity}
                  </div>
                </div>
              ))}
              {filteredIndicators.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No indicators found for the selected severity level.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverageAnalysisPanel;
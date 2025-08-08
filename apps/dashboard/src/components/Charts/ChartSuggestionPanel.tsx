import React, { useState, useEffect } from 'react';
import { ChartData, ChartType, ChartSuggestion } from './types';
import { chartFactory } from './ChartFactory';

interface ChartSuggestionPanelProps {
  data: ChartData;
  onChartTypeSelect: (type: ChartType) => void;
  selectedType?: ChartType;
  className?: string;
}

export const ChartSuggestionPanel: React.FC<ChartSuggestionPanelProps> = ({
  data,
  onChartTypeSelect,
  selectedType,
  className
}) => {
  const [suggestions, setSuggestions] = useState<ChartSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (data) {
      const chartSuggestions = chartFactory.suggestChartType(data);
      setSuggestions(chartSuggestions);
    }
  }, [data]);

  const getSuitabilityColor = (score: number): string => {
    if (score >= 0.8) return '#28a745'; // Green
    if (score >= 0.6) return '#ffc107'; // Yellow
    if (score >= 0.4) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.5) return 'Fair';
    return 'Poor';
  };

  const renderSuggestionCard = (suggestion: ChartSuggestion, index: number) => (
    <div
      key={suggestion.type}
      className={`suggestion-card ${selectedType === suggestion.type ? 'selected' : ''}`}
      onClick={() => onChartTypeSelect(suggestion.type)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onChartTypeSelect(suggestion.type);
        }
      }}
      aria-label={`Select ${suggestion.type} chart type`}
    >
      <div className="suggestion-header">
        <div className="chart-type-icon">
          {getChartTypeIcon(suggestion.type)}
        </div>
        <div className="chart-type-info">
          <h3 className="chart-type-name">
            {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Chart
          </h3>
          <div className="confidence-badge">
            <span 
              className="confidence-score"
              style={{ color: getSuitabilityColor(suggestion.confidence) }}
            >
              {getConfidenceLabel(suggestion.confidence)}
            </span>
            <span className="confidence-percentage">
              ({Math.round(suggestion.confidence * 100)}%)
            </span>
          </div>
        </div>
        {index === 0 && (
          <div className="recommended-badge">
            Recommended
          </div>
        )}
      </div>
      
      <div className="suggestion-details">
        <p className="reasoning">{suggestion.reasoning}</p>
        
        <div className="suitability-metrics">
          <div className="metric">
            <span className="metric-label">Data Size:</span>
            <div className="metric-bar">
              <div 
                className="metric-fill"
                style={{ 
                  width: `${suggestion.suitability.dataSize * 100}%`,
                  backgroundColor: getSuitabilityColor(suggestion.suitability.dataSize)
                }}
              />
            </div>
            <span className="metric-value">
              {Math.round(suggestion.suitability.dataSize * 100)}%
            </span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Readability:</span>
            <div className="metric-bar">
              <div 
                className="metric-fill"
                style={{ 
                  width: `${suggestion.suitability.readability * 100}%`,
                  backgroundColor: getSuitabilityColor(suggestion.suitability.readability)
                }}
              />
            </div>
            <span className="metric-value">
              {Math.round(suggestion.suitability.readability * 100)}%
            </span>
          </div>
          
          <div className="metric">
            <span className="metric-label">Complexity:</span>
            <div className="metric-bar">
              <div 
                className="metric-fill"
                style={{ 
                  width: `${(1 - suggestion.suitability.complexity) * 100}%`,
                  backgroundColor: getSuitabilityColor(1 - suggestion.suitability.complexity)
                }}
              />
            </div>
            <span className="metric-value">
              {Math.round((1 - suggestion.suitability.complexity) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const getChartTypeIcon = (type: ChartType): string => {
    const icons: Record<ChartType, string> = {
      line: '📈',
      bar: '📊',
      scatter: '⚪',
      area: '🏔️',
      heatmap: '🔥',
      histogram: '📊',
      box: '📦',
      pie: '🥧',
      treemap: '🌳'
    };
    return icons[type] || '📊';
  };

  if (suggestions.length === 0) {
    return (
      <div className={`chart-suggestions loading ${className || ''}`}>
        <div className="loading-message">
          Analyzing data for chart suggestions...
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-suggestions ${className || ''}`}>
      <div className="suggestions-header">
        <h2>Chart Suggestions</h2>
        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse suggestions' : 'Expand suggestions'}
        >
          {isExpanded ? '▼' : '▶'} 
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </button>
      </div>
      
      <div className={`suggestions-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {isExpanded ? (
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => 
              renderSuggestionCard(suggestion, index)
            )}
          </div>
        ) : (
          <div className="suggestions-preview">
            {renderSuggestionCard(suggestions[0], 0)}
            {suggestions.length > 1 && (
              <div className="more-suggestions">
                +{suggestions.length - 1} more suggestion{suggestions.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="suggestions-footer">
        <p className="help-text">
          Select a chart type to visualize your data. Recommendations are based on 
          data characteristics, size, and visualization best practices.
        </p>
      </div>
    </div>
  );
};

export default ChartSuggestionPanel;
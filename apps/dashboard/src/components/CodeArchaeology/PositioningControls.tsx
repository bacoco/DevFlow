import React, { useState, useCallback } from 'react';
import { Settings, RefreshCw, Grid, Circle, Layers, Zap, Network } from 'lucide-react';
import { PositioningConfig } from './PositioningAlgorithms';

interface PositioningControlsProps {
  config: PositioningConfig;
  onConfigChange: (config: Partial<PositioningConfig>) => void;
  onReposition: () => void;
  isPositioning?: boolean;
}

const PositioningControls: React.FC<PositioningControlsProps> = ({
  config,
  onConfigChange,
  onReposition,
  isPositioning = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAlgorithmChange = useCallback((algorithm: PositioningConfig['algorithm']) => {
    onConfigChange({ algorithm });
  }, [onConfigChange]);

  const handleParameterChange = useCallback((parameter: keyof PositioningConfig, value: number) => {
    onConfigChange({ [parameter]: value });
  }, [onConfigChange]);

  const algorithmOptions = [
    { value: 'force-directed', label: 'Force-Directed', icon: Network, description: 'Natural clustering based on relationships' },
    { value: 'hierarchical', label: 'Hierarchical', icon: Layers, description: 'Organized by dependency levels' },
    { value: 'circular', label: 'Circular', icon: Circle, description: 'Equal distribution in circle' },
    { value: 'grid', label: 'Grid', icon: Grid, description: 'Organized grid layout' },
    { value: 'clustered', label: 'Clustered', icon: Zap, description: 'Grouped by file structure' },
  ] as const;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Settings size={16} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-800">Positioning</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onReposition}
            disabled={isPositioning}
            className="p-1 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reposition Artifacts"
          >
            <RefreshCw size={14} className={isPositioning ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <Settings size={14} className={isExpanded ? 'rotate-90' : ''} />
          </button>
        </div>
      </div>

      {/* Algorithm Selection */}
      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Layout Algorithm
          </label>
          <div className="grid grid-cols-1 gap-1">
            {algorithmOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleAlgorithmChange(option.value)}
                  className={`flex items-center space-x-2 p-2 rounded text-left transition-colors ${
                    config.algorithm === option.value
                      ? 'bg-blue-100 border border-blue-300 text-blue-800'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                  title={option.description}
                >
                  <Icon size={14} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{option.label}</div>
                    {isExpanded && (
                      <div className="text-xs text-gray-500 truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Parameters */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Spacing: {config.spacing}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={config.spacing}
                onChange={(e) => handleParameterChange('spacing', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {config.algorithm === 'force-directed' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Force Strength: {config.forceStrength}
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={config.forceStrength}
                    onChange={(e) => handleParameterChange('forceStrength', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Iterations: {config.iterations}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={config.iterations}
                    onChange={(e) => handleParameterChange('iterations', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Repulsion: {config.repulsionStrength}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={config.repulsionStrength}
                    onChange={(e) => handleParameterChange('repulsionStrength', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Center Attraction: {config.centerAttraction}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.001"
                    value={config.centerAttraction}
                    onChange={(e) => handleParameterChange('centerAttraction', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            {config.algorithm === 'clustered' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cluster Radius: {config.clusterRadius}
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={config.clusterRadius}
                  onChange={(e) => handleParameterChange('clusterRadius', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2 pt-2 border-t">
          <button
            onClick={() => onConfigChange({
              spacing: 3,
              forceStrength: 0.1,
              iterations: 100,
              repulsionStrength: 1.0,
              centerAttraction: 0.01,
              clusterRadius: 10,
            })}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => onConfigChange({
              spacing: config.spacing * 1.2,
              clusterRadius: config.clusterRadius * 1.2,
            })}
            className="flex-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          >
            Spread Out
          </button>
          <button
            onClick={() => onConfigChange({
              spacing: config.spacing * 0.8,
              clusterRadius: config.clusterRadius * 0.8,
            })}
            className="flex-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
          >
            Compact
          </button>
        </div>
      </div>

      {/* Status */}
      {isPositioning && (
        <div className="px-3 pb-3">
          <div className="flex items-center space-x-2 text-xs text-blue-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
            <span>Repositioning artifacts...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositioningControls;
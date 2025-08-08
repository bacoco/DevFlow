import React, { useState, useRef, useEffect } from 'react';
import { ChartData, ChartConfig, ChartInstance } from './types';
import { ChartInteractions } from './ChartInteractions';
import Chart from './Chart';

interface LinkedChart {
  id: string;
  data: ChartData;
  config: ChartConfig;
  position: { x: number; y: number };
}

interface LinkedChartsManagerProps {
  charts: LinkedChart[];
  linkType: 'brush' | 'zoom' | 'filter' | 'highlight';
  onChartsUpdate?: (charts: LinkedChart[]) => void;
  className?: string;
}

export const LinkedChartsManager: React.FC<LinkedChartsManagerProps> = ({
  charts,
  linkType,
  onChartsUpdate,
  className
}) => {
  const [chartInstances, setChartInstances] = useState<Map<string, ChartInstance>>(new Map());
  const [isLinkingEnabled, setIsLinkingEnabled] = useState(true);
  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Link charts when instances are available
    if (chartInstances.size === charts.length && isLinkingEnabled) {
      const instances = Array.from(chartInstances.values());
      ChartInteractions.linkCharts(instances, linkType);
    }
  }, [chartInstances, charts.length, linkType, isLinkingEnabled]);

  const handleChartInstanceReady = (chartId: string, instance: ChartInstance) => {
    setChartInstances(prev => new Map(prev.set(chartId, instance)));
  };

  const handleBrushSelection = (chartId: string, selection: any) => {
    // Propagate brush selection to other linked charts
    chartInstances.forEach((instance, id) => {
      if (id !== chartId && isLinkingEnabled) {
        instance.interactions.brush(selection);
      }
    });
  };

  const handleChartClick = (chartId: string, data: any) => {
    // Handle chart click events
    console.log(`Chart ${chartId} clicked:`, data);
  };

  const toggleChartSelection = (chartId: string) => {
    setSelectedCharts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(chartId)) {
        newSelection.delete(chartId);
      } else {
        newSelection.add(chartId);
      }
      return newSelection;
    });
  };

  const linkSelectedCharts = () => {
    const selectedInstances = Array.from(selectedCharts)
      .map(id => chartInstances.get(id))
      .filter(Boolean) as ChartInstance[];
    
    if (selectedInstances.length >= 2) {
      ChartInteractions.linkCharts(selectedInstances, linkType);
    }
  };

  const unlinkAllCharts = () => {
    // This would require implementing an unlink method in ChartInteractions
    setIsLinkingEnabled(false);
    setTimeout(() => setIsLinkingEnabled(true), 100); // Re-enable after brief pause
  };

  const exportLinkedCharts = async () => {
    // Export all charts as a combined visualization
    const promises = Array.from(chartInstances.values()).map(instance =>
      instance.export({ format: 'png' })
    );
    
    try {
      const results = await Promise.all(promises);
      // Combine images or create a zip file
      console.log('Exported charts:', results);
    } catch (error) {
      console.error('Failed to export linked charts:', error);
    }
  };

  return (
    <div className={`linked-charts-manager ${className || ''}`} ref={containerRef}>
      <div className="linked-charts-header">
        <h2>Linked Charts</h2>
        <div className="chart-controls">
          <div className="link-type-selector">
            <label htmlFor="link-type">Link Type:</label>
            <select 
              id="link-type" 
              value={linkType} 
              onChange={(e) => {
                // This would require updating the parent component
                console.log('Link type changed:', e.target.value);
              }}
            >
              <option value="brush">Brush Selection</option>
              <option value="zoom">Zoom Sync</option>
              <option value="filter">Filter Sync</option>
              <option value="highlight">Highlight Sync</option>
            </select>
          </div>
          
          <button
            className={`link-toggle ${isLinkingEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setIsLinkingEnabled(!isLinkingEnabled)}
            title={isLinkingEnabled ? 'Disable linking' : 'Enable linking'}
          >
            {isLinkingEnabled ? '🔗' : '⛓️‍💥'} 
            {isLinkingEnabled ? 'Linked' : 'Unlinked'}
          </button>
          
          <button
            className="export-all"
            onClick={exportLinkedCharts}
            title="Export all charts"
          >
            📥 Export All
          </button>
        </div>
      </div>
      
      <div className="charts-grid">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className={`chart-wrapper ${selectedCharts.has(chart.id) ? 'selected' : ''}`}
            style={{
              gridColumn: Math.floor(chart.position.x / 100) + 1,
              gridRow: Math.floor(chart.position.y / 100) + 1
            }}
          >
            <div className="chart-header">
              <div className="chart-title">
                {chart.data.metadata?.title || `Chart ${chart.id}`}
              </div>
              <div className="chart-actions">
                <button
                  className={`select-chart ${selectedCharts.has(chart.id) ? 'selected' : ''}`}
                  onClick={() => toggleChartSelection(chart.id)}
                  title="Select for linking"
                >
                  {selectedCharts.has(chart.id) ? '☑️' : '☐'}
                </button>
              </div>
            </div>
            
            <Chart
              data={chart.data}
              config={{
                ...chart.config,
                interactions: {
                  ...chart.config.interactions,
                  brush: linkType === 'brush',
                  zoom: linkType === 'zoom'
                }
              }}
              onBrushSelection={(selection) => handleBrushSelection(chart.id, selection)}
              onChartClick={(data) => handleChartClick(chart.id, data)}
              className="linked-chart"
            />
            
            <div className="chart-status">
              <div className={`link-indicator ${isLinkingEnabled ? 'active' : 'inactive'}`}>
                {isLinkingEnabled ? '🔗' : '⛓️‍💥'}
              </div>
              <div className="chart-type">
                {chart.config.type}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedCharts.size >= 2 && (
        <div className="selection-actions">
          <button
            className="link-selected"
            onClick={linkSelectedCharts}
          >
            Link Selected Charts ({selectedCharts.size})
          </button>
          <button
            className="clear-selection"
            onClick={() => setSelectedCharts(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}
      
      <div className="linking-info">
        <div className="info-section">
          <h3>Linking Status</h3>
          <p>
            {isLinkingEnabled 
              ? `Charts are linked with ${linkType} synchronization`
              : 'Chart linking is disabled'
            }
          </p>
        </div>
        
        <div className="info-section">
          <h3>How to Use</h3>
          <ul>
            <li>Select charts to link them together</li>
            <li>Use brush selection to highlight data across charts</li>
            <li>Zoom and pan operations sync across linked charts</li>
            <li>Toggle linking on/off using the link button</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LinkedChartsManager;
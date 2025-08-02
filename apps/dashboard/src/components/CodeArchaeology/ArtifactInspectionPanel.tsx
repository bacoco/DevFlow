import React, { useState, useEffect } from 'react';
import { CodeArtifact } from './types';
import { CodeSnippetPreview } from './CodeSnippetPreview';
import { ChangeHistoryTimeline } from './ChangeHistoryTimeline';
import './ArtifactInspectionPanel.css';

interface ArtifactInspectionPanelProps {
  artifact: CodeArtifact | null;
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

interface ArtifactDetails {
  codeSnippet?: string;
  language?: string;
  changeHistory: ChangeHistoryEntry[];
  dependencies: DependencyInfo[];
  metrics: ArtifactMetrics;
}

interface ChangeHistoryEntry {
  id: string;
  timestamp: Date;
  author: string;
  message: string;
  changeType: 'added' | 'modified' | 'deleted' | 'moved';
  linesAdded: number;
  linesRemoved: number;
  complexity: number;
}

interface DependencyInfo {
  id: string;
  name: string;
  type: 'imports' | 'exports' | 'calls' | 'extends';
  filePath: string;
}

interface ArtifactMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  technicalDebt: number;
}

const ArtifactInspectionPanel: React.FC<ArtifactInspectionPanelProps> = ({
  artifact,
  isVisible,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'history' | 'dependencies'>('overview');
  const [artifactDetails, setArtifactDetails] = useState<ArtifactDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Load detailed artifact information when artifact changes
  useEffect(() => {
    if (artifact) {
      loadArtifactDetails(artifact);
    } else {
      setArtifactDetails(null);
    }
  }, [artifact]);

  const loadArtifactDetails = async (artifact: CodeArtifact) => {
    setLoading(true);
    try {
      // Simulate API call to load detailed artifact information
      const details: ArtifactDetails = {
        codeSnippet: await fetchCodeSnippet(artifact.filePath, artifact.type, artifact.name),
        language: getLanguageFromFilePath(artifact.filePath),
        changeHistory: await fetchChangeHistory(artifact.id),
        dependencies: await fetchDependencies(artifact.id),
        metrics: await fetchArtifactMetrics(artifact.id),
      };
      setArtifactDetails(details);
    } catch (error) {
      console.error('Failed to load artifact details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodeSnippet = async (filePath: string, type: string, name: string): Promise<string> => {
    // Mock implementation - in real app, this would fetch from the code archaeology service
    const mockSnippets: Record<string, string> = {
      file: `// File: ${filePath}\n\n// This is a mock code snippet for demonstration\nclass ${name} {\n  constructor() {\n    // Implementation details\n  }\n\n  public method(): void {\n    // Method implementation\n  }\n}`,
      function: `function ${name}() {\n  // Function implementation\n  const result = processData();\n  return result;\n}`,
      class: `class ${name} {\n  private property: string;\n\n  constructor(value: string) {\n    this.property = value;\n  }\n\n  public getValue(): string {\n    return this.property;\n  }\n}`,
      interface: `interface ${name} {\n  id: string;\n  name: string;\n  getValue(): string;\n  setValue(value: string): void;\n}`,
    };
    
    return mockSnippets[type] || mockSnippets.file;
  };

  const fetchChangeHistory = async (artifactId: string): Promise<ChangeHistoryEntry[]> => {
    // Mock implementation
    return [
      {
        id: '1',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        author: 'john.doe',
        message: 'Initial implementation of core functionality',
        changeType: 'added',
        linesAdded: 45,
        linesRemoved: 0,
        complexity: 3,
      },
      {
        id: '2',
        timestamp: new Date('2024-01-20T14:15:00Z'),
        author: 'jane.smith',
        message: 'Refactor to improve performance',
        changeType: 'modified',
        linesAdded: 12,
        linesRemoved: 8,
        complexity: 4,
      },
      {
        id: '3',
        timestamp: new Date('2024-01-25T09:45:00Z'),
        author: 'bob.wilson',
        message: 'Add error handling and validation',
        changeType: 'modified',
        linesAdded: 23,
        linesRemoved: 3,
        complexity: 6,
      },
    ];
  };

  const fetchDependencies = async (artifactId: string): Promise<DependencyInfo[]> => {
    // Mock implementation
    return [
      {
        id: '1',
        name: 'lodash',
        type: 'imports',
        filePath: 'node_modules/lodash/index.js',
      },
      {
        id: '2',
        name: 'UserService',
        type: 'imports',
        filePath: 'src/services/UserService.ts',
      },
      {
        id: '3',
        name: 'validateInput',
        type: 'calls',
        filePath: 'src/utils/validation.ts',
      },
    ];
  };

  const fetchArtifactMetrics = async (artifactId: string): Promise<ArtifactMetrics> => {
    // Mock implementation
    return {
      linesOfCode: 127,
      cyclomaticComplexity: 6,
      maintainabilityIndex: 78,
      testCoverage: 85,
      technicalDebt: 2.3,
    };
  };

  const getLanguageFromFilePath = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
    };
    return languageMap[extension || ''] || 'text';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getComplexityColor = (complexity: number): string => {
    if (complexity <= 3) return '#4CAF50'; // Green
    if (complexity <= 6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  if (!isVisible || !artifact) {
    return null;
  }

  return (
    <div className={`artifact-inspection-panel ${className}`}>
      <div className="panel-header">
        <div className="artifact-info">
          <h3 className="artifact-name">{artifact.name}</h3>
          <span className="artifact-type">{artifact.type}</span>
          <span className="artifact-path">{artifact.filePath}</span>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Close inspection panel">
          ×
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`tab ${activeTab === 'dependencies' ? 'active' : ''}`}
          onClick={() => setActiveTab('dependencies')}
        >
          Dependencies
        </button>
      </div>

      <div className="panel-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading artifact details...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && artifactDetails && (
              <div className="overview-tab">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h4>Complexity</h4>
                    <div className="metric-value" style={{ color: getComplexityColor(artifact.complexity) }}>
                      {artifact.complexity}
                    </div>
                  </div>
                  <div className="metric-card">
                    <h4>Change Frequency</h4>
                    <div className="metric-value">{artifact.changeFrequency}</div>
                  </div>
                  <div className="metric-card">
                    <h4>Lines of Code</h4>
                    <div className="metric-value">{artifactDetails.metrics.linesOfCode}</div>
                  </div>
                  <div className="metric-card">
                    <h4>Test Coverage</h4>
                    <div className="metric-value">
                      {artifactDetails.metrics.testCoverage ? `${artifactDetails.metrics.testCoverage}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="artifact-metadata">
                  <h4>Metadata</h4>
                  <div className="metadata-item">
                    <span className="label">Last Modified:</span>
                    <span className="value">{formatDate(artifact.lastModified)}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="label">Authors:</span>
                    <span className="value">{artifact.authors.join(', ')}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="label">Maintainability Index:</span>
                    <span className="value">{artifactDetails.metrics.maintainabilityIndex}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="label">Technical Debt:</span>
                    <span className="value">{artifactDetails.metrics.technicalDebt} hours</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && artifactDetails && (
              <div className="code-tab">
                <CodeSnippetPreview
                  code={artifactDetails.codeSnippet || ''}
                  language={artifactDetails.language || 'text'}
                  fileName={artifact.name}
                />
              </div>
            )}

            {activeTab === 'history' && artifactDetails && (
              <div className="history-tab">
                <ChangeHistoryTimeline
                  changes={artifactDetails.changeHistory}
                  artifactName={artifact.name}
                />
              </div>
            )}

            {activeTab === 'dependencies' && artifactDetails && (
              <div className="dependencies-tab">
                <h4>Dependencies ({artifactDetails.dependencies.length})</h4>
                <div className="dependencies-list">
                  {artifactDetails.dependencies.map((dep) => (
                    <div key={dep.id} className="dependency-item">
                      <div className="dependency-header">
                        <span className="dependency-name">{dep.name}</span>
                        <span className={`dependency-type ${dep.type}`}>{dep.type}</span>
                      </div>
                      <div className="dependency-path">{dep.filePath}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtifactInspectionPanel;
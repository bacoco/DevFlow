import React, { useState } from 'react';
import Head from 'next/head';
import { Vector3 } from 'three';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { DependencyGraph } from '../components/CodeArchaeology/DependencyGraph';
import { PatternVisualization3D } from '../components/CodeArchaeology/PatternVisualization3D';
import { CollaborativeControls } from '../components/CodeArchaeology/CollaborativeControls';
import { CodeArtifact } from '../components/CodeArchaeology/types';

const CodeArchaeologyContent: React.FC = () => {
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [filterType, setFilterType] = useState<'all' | 'file' | 'function' | 'class'>('all');

  const artifacts: CodeArtifact[] = [
    {
      id: '1',
      name: 'Dashboard.tsx',
      type: 'file',
      filePath: 'src/components/Dashboard/Dashboard.tsx',
      position3D: new Vector3(0, 0, 0),
      complexity: 8.5,
      changeFrequency: 25,
      authors: ['Loic', 'John', 'Sarah'],
      lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      dependencies: ['React', 'react-grid-layout', 'WebSocketContext'],
      size: 450,
      color: '#4CAF50'
    },
    {
      id: '2',
      name: 'AuthService.ts',
      type: 'file',
      filePath: 'src/services/AuthService.ts',
      position3D: new Vector3(10, 5, 0),
      complexity: 6.2,
      changeFrequency: 12,
      authors: ['Loic', 'Mike'],
      lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      dependencies: ['axios', 'jwt-decode'],
      size: 280,
      color: '#2196F3'
    },
    {
      id: '3',
      name: 'validateUser',
      type: 'function',
      filePath: 'src/utils/validation.ts',
      position3D: new Vector3(-5, 8, 5),
      complexity: 4.1,
      changeFrequency: 8,
      authors: ['Loic'],
      lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      dependencies: ['validator', 'lodash'],
      size: 45,
      color: '#FF9800'
    },
    {
      id: '4',
      name: 'WebSocketContext',
      type: 'class',
      filePath: 'src/contexts/WebSocketContext.tsx',
      position3D: new Vector3(8, -3, 8),
      complexity: 7.8,
      changeFrequency: 18,
      authors: ['Loic', 'Sarah'],
      lastModified: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      dependencies: ['React', 'socket.io-client'],
      size: 320,
      color: '#9C27B0'
    },
    {
      id: '5',
      name: 'TaskModal',
      type: 'class',
      filePath: 'src/components/TaskManager/TaskModal.tsx',
      position3D: new Vector3(-8, 2, -5),
      complexity: 5.9,
      changeFrequency: 15,
      authors: ['Loic'],
      lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      dependencies: ['React', 'framer-motion'],
      size: 180,
      color: '#F44336'
    }
  ];

  const filteredArtifacts = artifacts.filter(artifact => 
    filterType === 'all' || artifact.type === filterType
  );

  const getComplexityColor = (complexity: number) => {
    if (complexity < 3) return 'text-green-600 bg-green-100';
    if (complexity < 6) return 'text-yellow-600 bg-yellow-100';
    if (complexity < 8) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file': return '📄';
      case 'function': return '⚡';
      case 'class': return '🏗️';
      case 'interface': return '🔗';
      default: return '📦';
    }
  };

  return (
    <>
      <Head>
        <title>Code Archaeology - DevFlow Dashboard</title>
        <meta name="description" content="Advanced code analysis and visualization" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-4">
              <a href="/" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Dashboard
              </a>
              <a href="/tasks" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Task Manager
              </a>
              <a href="/code-archaeology" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Code Archaeology
              </a>
              <a href="/analytics" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Analytics
              </a>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Code Archaeology</h1>
              <p className="text-gray-600 mt-2">Explore code complexity, dependencies, and evolution patterns</p>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === '2d' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2D View
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === '3d' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3D View
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="file">Files</option>
                <option value="function">Functions</option>
                <option value="class">Classes</option>
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Artifact List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Code Artifacts ({filteredArtifacts.length})</h3>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {filteredArtifacts.map(artifact => (
                    <div
                      key={artifact.id}
                      onClick={() => setSelectedArtifact(artifact)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedArtifact?.id === artifact.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTypeIcon(artifact.type)}</span>
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{artifact.name}</h4>
                            <p className="text-xs text-gray-500">{artifact.filePath}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getComplexityColor(artifact.complexity)}`}>
                          {artifact.complexity.toFixed(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Size: {artifact.size}</div>
                        <div>Changes: {artifact.changeFrequency}</div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Authors:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {artifact.authors.map(author => (
                            <span key={author} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {author}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Visualization Area */}
            <div className="lg:col-span-2">
              {viewMode === '3d' ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">3D Pattern Visualization</h3>
                  <PatternVisualization3D
                    artifacts={filteredArtifacts}
                    selectedArtifact={selectedArtifact}
                    onArtifactSelect={setSelectedArtifact}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Dependency Graph */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Dependency Graph</h3>
                    <DependencyGraph
                      artifacts={filteredArtifacts}
                      selectedArtifact={selectedArtifact}
                      onArtifactSelect={setSelectedArtifact}
                    />
                  </div>

                  {/* Selected Artifact Details */}
                  {selectedArtifact && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Artifact Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Name:</dt>
                              <dd className="font-medium">{selectedArtifact.name}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Type:</dt>
                              <dd className="font-medium">{selectedArtifact.type}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Path:</dt>
                              <dd className="font-mono text-xs">{selectedArtifact.filePath}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Size:</dt>
                              <dd className="font-medium">{selectedArtifact.size}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Complexity:</dt>
                              <dd className={`font-medium px-2 py-1 rounded ${getComplexityColor(selectedArtifact.complexity)}`}>
                                {selectedArtifact.complexity.toFixed(1)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Dependencies</h4>
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Depends on:</div>
                              <div className="flex flex-wrap gap-1">
                                {selectedArtifact.dependencies.map(dep => (
                                  <span key={dep} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Collaborative Controls */}
          <div className="mt-8">
            <CollaborativeControls
              artifacts={filteredArtifacts}
              selectedArtifact={selectedArtifact}
              onArtifactSelect={setSelectedArtifact}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default function CodeArchaeologyPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <WebSocketProvider autoConnect={false}>
          <CodeArchaeologyContent />
        </WebSocketProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}
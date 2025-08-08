import React, { useState } from 'react';
import Head from 'next/head';

interface CodeArtifact {
  id: string;
  name: string;
  type: 'file' | 'function' | 'class' | 'interface';
  path: string;
  complexity: number;
  changeFrequency: number;
  authors: string[];
  lastModified: string;
  linesOfCode: number;
}

const SimpleArchaeologyPage: React.FC = () => {
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'list' | '3d'>('list');

  const artifacts: CodeArtifact[] = [
    {
      id: '1',
      name: 'AuthService.ts',
      type: 'file',
      path: 'src/services/AuthService.ts',
      complexity: 8.5,
      changeFrequency: 15,
      authors: ['Loic', 'John', 'Sarah'],
      lastModified: '2 days ago',
      linesOfCode: 245
    },
    {
      id: '2',
      name: 'Dashboard.tsx',
      type: 'file',
      path: 'src/components/Dashboard.tsx',
      complexity: 6.2,
      changeFrequency: 8,
      authors: ['Loic', 'Mike'],
      lastModified: '1 day ago',
      linesOfCode: 180
    },
    {
      id: '3',
      name: 'validateUser',
      type: 'function',
      path: 'src/utils/validation.ts',
      complexity: 4.1,
      changeFrequency: 3,
      authors: ['Loic'],
      lastModified: '5 days ago',
      linesOfCode: 45
    },
    {
      id: '4',
      name: 'UserRepository',
      type: 'class',
      path: 'src/repositories/UserRepository.ts',
      complexity: 7.8,
      changeFrequency: 12,
      authors: ['John', 'Sarah', 'Loic'],
      lastModified: '3 days ago',
      linesOfCode: 320
    },
    {
      id: '5',
      name: 'ApiResponse',
      type: 'interface',
      path: 'src/types/api.ts',
      complexity: 2.1,
      changeFrequency: 2,
      authors: ['Sarah'],
      lastModified: '1 week ago',
      linesOfCode: 25
    }
  ];

  const getTypeIcon = (type: CodeArtifact['type']) => {
    switch (type) {
      case 'file':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'function':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        );
      case 'class':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'interface':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity < 3) return 'text-green-600 bg-green-100';
    if (complexity < 6) return 'text-yellow-600 bg-yellow-100';
    if (complexity < 8) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getChangeFrequencyColor = (frequency: number) => {
    if (frequency < 5) return 'text-green-600 bg-green-100';
    if (frequency < 10) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <>
      <Head>
        <title>Code Archaeology - DevFlow Dashboard</title>
        <meta name="description" content="3D Code Visualization and Analysis" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Code Archaeology</h1>
            <p className="text-gray-600">Explore your codebase through time and complexity</p>
          </div>

          {/* Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-4">
              <a href="/simple" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Dashboard
              </a>
              <a href="/simple-tasks" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Tasks
              </a>
              <a href="/simple-archaeology" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Code Archaeology
              </a>
            </nav>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === '3d' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                3D View
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            /* List View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Artifacts List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Code Artifacts</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {artifacts.map(artifact => (
                      <div
                        key={artifact.id}
                        className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedArtifact?.id === artifact.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => setSelectedArtifact(artifact)}
                      >
                        <div className="flex items-start space-x-3">
                          {getTypeIcon(artifact.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {artifact.name}
                              </h4>
                              <span className="text-xs text-gray-500">{artifact.lastModified}</span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{artifact.path}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${getComplexityColor(artifact.complexity)}`}>
                                Complexity: {artifact.complexity}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getChangeFrequencyColor(artifact.changeFrequency)}`}>
                                Changes: {artifact.changeFrequency}
                              </span>
                              <span className="text-xs text-gray-500">
                                {artifact.linesOfCode} lines
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 mt-2">
                              <span className="text-xs text-gray-500">Authors:</span>
                              {artifact.authors.slice(0, 3).map((author, index) => (
                                <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {author}
                                </span>
                              ))}
                              {artifact.authors.length > 3 && (
                                <span className="text-xs text-gray-500">+{artifact.authors.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedArtifact ? 'Artifact Details' : 'Select an Artifact'}
                  </h3>
                  
                  {selectedArtifact ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon(selectedArtifact.type)}
                          <h4 className="font-medium text-gray-900">{selectedArtifact.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{selectedArtifact.path}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500">Complexity</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedArtifact.complexity}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500">Changes</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedArtifact.changeFrequency}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500">Lines of Code</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedArtifact.linesOfCode}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500">Authors</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedArtifact.authors.length}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Contributors</p>
                        <div className="space-y-1">
                          {selectedArtifact.authors.map((author, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{author}</span>
                              <span className="text-gray-400">Contributor</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Risk Assessment</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Complexity Risk</span>
                            <span className={selectedArtifact.complexity > 7 ? 'text-red-600' : selectedArtifact.complexity > 5 ? 'text-yellow-600' : 'text-green-600'}>
                              {selectedArtifact.complexity > 7 ? 'High' : selectedArtifact.complexity > 5 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Change Risk</span>
                            <span className={selectedArtifact.changeFrequency > 10 ? 'text-red-600' : selectedArtifact.changeFrequency > 5 ? 'text-yellow-600' : 'text-green-600'}>
                              {selectedArtifact.changeFrequency > 10 ? 'High' : selectedArtifact.changeFrequency > 5 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Click on an artifact to view detailed information about its complexity, change history, and contributors.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* 3D View */
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-20">
                <div className="mb-6">
                  <svg className="w-24 h-24 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3D Visualization</h3>
                <p className="text-gray-600 mb-6">
                  Interactive 3D code archaeology visualization would appear here.<br/>
                  This would show your codebase as a 3D landscape with:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🏔️ Complexity Mountains</h4>
                    <p className="text-sm text-gray-600">Higher peaks represent more complex code</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🔥 Change Hotspots</h4>
                    <p className="text-sm text-gray-600">Red areas show frequently changed code</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🌊 Temporal Layers</h4>
                    <p className="text-sm text-gray-600">Deeper layers show older code versions</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">🔗 Dependency Links</h4>
                    <p className="text-sm text-gray-600">Connections between related components</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('list')}
                  className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to List View
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SimpleArchaeologyPage;
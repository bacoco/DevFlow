import React, { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import Scene3D from './Scene3D';
import CameraControls from './CameraControls';
import { CodeArtifact, VisualizationConfig, CameraState } from './types';

interface CodeArchaeologyViewerProps {
  artifacts: CodeArtifact[];
  className?: string;
  showStats?: boolean;
  showControls?: boolean;
}

const CodeArchaeologyViewer: React.FC<CodeArchaeologyViewerProps> = ({
  artifacts,
  className = '',
  showStats = false,
  showControls = true,
}) => {
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    position: new THREE.Vector3(10, 10, 10),
    target: new THREE.Vector3(0, 0, 0),
    zoom: 1,
  });

  const [config, setConfig] = useState<VisualizationConfig>({
    showDependencies: true,
    showComplexity: true,
    showChangeFrequency: true,
  });

  const handleArtifactSelect = useCallback((artifact: CodeArtifact) => {
    setSelectedArtifact(artifact);
  }, []);

  const handleCameraChange = useCallback((state: CameraState) => {
    setCameraState(state);
  }, []);

  const handleConfigChange = useCallback((newConfig: Partial<VisualizationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [10, 10, 10], fov: 75 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {/* Scene Content */}
          <Scene3D
            artifacts={artifacts}
            config={config}
            onArtifactSelect={handleArtifactSelect}
            onCameraChange={handleCameraChange}
          />

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
            minDistance={5}
            maxDistance={100}
            maxPolarAngle={Math.PI / 2}
          />

          {/* Performance Stats */}
          {showStats && <Stats />}
        </Suspense>
      </Canvas>

      {/* UI Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 z-10">
          <CameraControls />
        </div>
      )}

      {/* Configuration Panel */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h3 className="text-sm font-semibold mb-3">Visualization Settings</h3>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.showDependencies}
              onChange={(e) => handleConfigChange({ showDependencies: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Show Dependencies</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.showComplexity}
              onChange={(e) => handleConfigChange({ showComplexity: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Show Complexity</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.showChangeFrequency}
              onChange={(e) => handleConfigChange({ showChangeFrequency: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Show Change Frequency</span>
          </label>
        </div>
      </div>

      {/* Selected Artifact Info Panel */}
      {selectedArtifact && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold">Selected Artifact</h3>
            <button
              onClick={() => setSelectedArtifact(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {selectedArtifact.name}</div>
            <div><strong>Type:</strong> {selectedArtifact.type}</div>
            <div><strong>Path:</strong> {selectedArtifact.filePath}</div>
            <div><strong>Complexity:</strong> {selectedArtifact.complexity}</div>
            <div><strong>Change Frequency:</strong> {selectedArtifact.changeFrequency}</div>
            <div><strong>Authors:</strong> {selectedArtifact.authors.join(', ')}</div>
            <div><strong>Last Modified:</strong> {selectedArtifact.lastModified.toLocaleDateString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeArchaeologyViewer;
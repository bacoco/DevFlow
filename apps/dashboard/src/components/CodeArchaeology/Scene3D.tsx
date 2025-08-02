import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Color } from 'three';
import CodeArtifact3D from './CodeArtifact3D';
import DependencyLines from './DependencyLines';
import { Scene3DProps, CodeArtifact } from './types';
import { LODManager, DEFAULT_LOD_CONFIG, ArtifactLOD } from './performance/LODManager';
import { ProgressiveLoader, DEFAULT_PROGRESSIVE_CONFIG, LoadingProgress } from './performance/ProgressiveLoader';
import { MemoryManager, DEFAULT_MEMORY_CONFIG } from './performance/MemoryManager';

const Scene3D: React.FC<Scene3DProps> = ({
  artifacts,
  config,
  onArtifactSelect,
  onCameraChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [hoveredArtifact, setHoveredArtifact] = useState<CodeArtifact | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);

  // Performance management
  const lodManagerRef = useRef<LODManager>(new LODManager(DEFAULT_LOD_CONFIG));
  const progressiveLoaderRef = useRef<ProgressiveLoader>(new ProgressiveLoader(DEFAULT_PROGRESSIVE_CONFIG));
  const memoryManagerRef = useRef<MemoryManager>(new MemoryManager(DEFAULT_MEMORY_CONFIG));

  const [artifactLODs, setArtifactLODs] = useState<ArtifactLOD[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    totalChunks: 0,
    loadedChunks: 0,
    loadingChunks: 0,
    progress: 1,
    estimatedTimeRemaining: 0,
  });

  // Initialize progressive loading when artifacts change
  useEffect(() => {
    if (artifacts.length > 0) {
      progressiveLoaderRef.current.initialize(artifacts);
    }
  }, [artifacts]);

  // Filter artifacts based on configuration
  const filteredArtifacts = useMemo(() => {
    let filtered = artifacts;

    if (config.filterByType && config.filterByType.length > 0) {
      filtered = filtered.filter(artifact => config.filterByType!.includes(artifact.type));
    }

    if (config.filterByAuthor && config.filterByAuthor.length > 0) {
      filtered = filtered.filter(artifact =>
        artifact.authors.some(author => config.filterByAuthor!.includes(author))
      );
    }

    return filtered;
  }, [artifacts, config.filterByType, config.filterByAuthor]);

  // Generate dependency connections
  const dependencyConnections = useMemo(() => {
    if (!config.showDependencies) return [];

    const connections: Array<{
      from: Vector3;
      to: Vector3;
      strength: number;
      color: Color;
    }> = [];

    filteredArtifacts.forEach(artifact => {
      artifact.dependencies.forEach(depId => {
        const dependency = filteredArtifacts.find(a => a.id === depId);
        if (dependency) {
          connections.push({
            from: artifact.position3D,
            to: dependency.position3D,
            strength: 1.0,
            color: new Color(0x666666),
          });
        }
      });
    });

    return connections;
  }, [filteredArtifacts, config.showDependencies]);

  // Handle artifact selection
  const handleArtifactClick = useCallback((artifact: CodeArtifact) => {
    setSelectedArtifact(artifact);
    onArtifactSelect?.(artifact);
  }, [onArtifactSelect]);

  // Handle artifact hover
  const handleArtifactHover = useCallback((artifact: CodeArtifact | null) => {
    setHoveredArtifact(artifact);
  }, []);

  // Update camera state
  useFrame(() => {
    if (onCameraChange) {
      onCameraChange({
        position: camera.position.clone(),
        target: new Vector3(0, 0, 0), // This would need to be tracked from OrbitControls
        zoom: camera.zoom,
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Render code artifacts */}
      {filteredArtifacts.map((artifact) => (
        <CodeArtifact3D
          key={artifact.id}
          artifact={artifact}
          config={config}
          isSelected={selectedArtifact?.id === artifact.id}
          isHighlighted={hoveredArtifact?.id === artifact.id}
          onClick={handleArtifactClick}
          onHover={handleArtifactHover}
        />
      ))}

      {/* Render dependency connections */}
      {config.showDependencies && (
        <DependencyLines connections={dependencyConnections} />
      )}

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshLambertMaterial color="#f0f0f0" transparent opacity={0.3} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[50, 50, 0x888888, 0xcccccc]} position={[0, -4.9, 0]} />
    </group>
  );
};

export default Scene3D;
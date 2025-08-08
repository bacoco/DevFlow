import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, Color } from 'three';
import CodeArtifact3D from './CodeArtifact3D';
import DependencyLines from './DependencyLines';
import { Scene3DProps, CodeArtifact } from './types';
import { LODManager, DEFAULT_LOD_CONFIG, ArtifactLOD } from './performance/LODManager';
import { ProgressiveLoader, DEFAULT_PROGRESSIVE_CONFIG, LoadingProgress } from './performance/ProgressiveLoader';
import { MemoryManager, DEFAULT_MEMORY_CONFIG } from './performance/MemoryManager';
import { WebGLOptimizer, DEFAULT_WEBGL_CONFIG, WebGLPerformanceMetrics } from './performance/WebGLOptimizer';
import { FallbackRenderer, DEFAULT_FALLBACK_CONFIG } from './performance/FallbackRenderer';
import { webglCompatibility } from './performance/WebGLCompatibility';

const Scene3D: React.FC<Scene3DProps> = ({
  artifacts,
  config,
  onArtifactSelect,
  onCameraChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [hoveredArtifact, setHoveredArtifact] = useState<CodeArtifact | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [webglMetrics, setWebglMetrics] = useState<WebGLPerformanceMetrics | null>(null);

  // Performance management
  const lodManagerRef = useRef<LODManager>(new LODManager(DEFAULT_LOD_CONFIG));
  const progressiveLoaderRef = useRef<ProgressiveLoader>(new ProgressiveLoader(DEFAULT_PROGRESSIVE_CONFIG));
  const memoryManagerRef = useRef<MemoryManager>(new MemoryManager(DEFAULT_MEMORY_CONFIG));
  const webglOptimizerRef = useRef<WebGLOptimizer | null>(null);
  const fallbackRendererRef = useRef<FallbackRenderer | null>(null);
  const fallbackContainerRef = useRef<HTMLDivElement>(null);

  const [artifactLODs, setArtifactLODs] = useState<ArtifactLOD[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    totalChunks: 0,
    loadedChunks: 0,
    loadingChunks: 0,
    progress: 1,
    estimatedTimeRemaining: 0,
  });

  // Initialize WebGL optimization and fallback detection
  useEffect(() => {
    const compatibility = webglCompatibility.generateReport();
    
    if (webglCompatibility.shouldDisableWebGL() || compatibility.performanceScore < 0.3) {
      setUseFallback(true);
      fallbackRendererRef.current = new FallbackRenderer(DEFAULT_FALLBACK_CONFIG);
    } else {
      // Initialize WebGL optimizer
      webglOptimizerRef.current = new WebGLOptimizer(gl, DEFAULT_WEBGL_CONFIG);
      
      // Log compatibility info
      console.log('WebGL Compatibility Report:', compatibility);
    }

    return () => {
      webglOptimizerRef.current?.dispose();
      fallbackRendererRef.current?.dispose();
    };
  }, [gl]);

  // Initialize progressive loading when artifacts change
  useEffect(() => {
    if (artifacts.length > 0) {
      progressiveLoaderRef.current.initialize(artifacts);
    }
  }, [artifacts]);

  // Render fallback when needed
  useEffect(() => {
    if (useFallback && fallbackRendererRef.current && fallbackContainerRef.current) {
      fallbackRendererRef.current.render(
        fallbackContainerRef.current,
        artifacts,
        {
          width: 800,
          height: 600,
          backgroundColor: '#f5f5f5',
          gridEnabled: true,
          labelsEnabled: true,
          connectionLinesEnabled: config.showDependencies || false,
        }
      );

      // Add event listener for artifact selection
      fallbackContainerRef.current.addEventListener('artifactSelected', (event: any) => {
        handleArtifactClick(event.detail);
      });
    }
  }, [useFallback, artifacts, config.showDependencies]);

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

  // Update performance monitoring and camera state
  useFrame((state, delta) => {
    // Update WebGL performance monitoring
    if (webglOptimizerRef.current && !useFallback) {
      const frameTime = delta * 1000; // Convert to milliseconds
      webglOptimizerRef.current.updatePerformance(frameTime);
      
      // Update metrics periodically
      if (Math.random() < 0.1) { // 10% chance per frame to update metrics
        setWebglMetrics(webglOptimizerRef.current.getPerformanceMetrics());
      }

      // Check if we should switch to fallback due to poor performance
      const metrics = webglOptimizerRef.current.getPerformanceMetrics();
      if (metrics.frameTime > 50 && !useFallback) { // 20 FPS threshold
        console.warn('Switching to fallback renderer due to poor performance');
        setUseFallback(true);
      }
    }

    // Update LOD manager
    lodManagerRef.current.updatePerformance(delta);

    // Update camera state
    if (onCameraChange) {
      onCameraChange({
        position: camera.position.clone(),
        target: new Vector3(0, 0, 0), // This would need to be tracked from OrbitControls
        zoom: camera.zoom,
      });
    }
  });

  // Render fallback if needed
  if (useFallback) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div 
          ref={fallbackContainerRef}
          style={{ width: '100%', height: '100%' }}
        />
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          Fallback Mode: {fallbackRendererRef.current?.getConfig().mode || 'canvas2d'}
        </div>
      </div>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Performance metrics overlay */}
      {webglMetrics && (
        <Html position={[40, 40, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}>
            <div>FPS: {(1000 / webglMetrics.frameTime).toFixed(1)}</div>
            <div>Draw Calls: {webglMetrics.drawCalls}</div>
            <div>Triangles: {webglMetrics.triangles}</div>
            <div>Quality: {webglOptimizerRef.current?.getCurrentQualityLevel().name}</div>
          </div>
        </Html>
      )}

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
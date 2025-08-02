import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Vector3 } from 'three';
import Scene3D from './Scene3D';
import { PositioningAlgorithms, PositioningConfig, ClusterInfo } from './PositioningAlgorithms';
import { CodeArtifact, VisualizationConfig, Scene3DProps } from './types';

interface PositionedScene3DProps extends Omit<Scene3DProps, 'artifacts'> {
  artifacts: CodeArtifact[];
  positioningConfig?: Partial<PositioningConfig>;
  autoOptimize?: boolean;
  showClusters?: boolean;
  onPositioningComplete?: (artifacts: CodeArtifact[]) => void;
}

const PositionedScene3D: React.FC<PositionedScene3DProps> = ({
  artifacts,
  config,
  positioningConfig = {},
  autoOptimize = true,
  showClusters = false,
  onArtifactSelect,
  onCameraChange,
  onPositioningComplete,
}) => {
  const [positioningAlgorithm] = useState(() => new PositioningAlgorithms(positioningConfig));
  const [isPositioning, setIsPositioning] = useState(false);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);

  // Position artifacts using the selected algorithm
  const positionedArtifacts = useMemo(() => {
    setIsPositioning(true);
    
    try {
      // Apply positioning algorithm
      let positioned = positioningAlgorithm.positionArtifacts(artifacts);
      
      // Optimize positions if enabled
      if (autoOptimize) {
        positioned = positioningAlgorithm.optimizePositions(positioned);
      }
      
      // Generate cluster information for visualization
      if (showClusters && positioningConfig.algorithm === 'clustered') {
        const clusterInfo = positioningAlgorithm['generateClusters'](positioned);
        setClusters(clusterInfo);
      } else {
        setClusters([]);
      }
      
      setIsPositioning(false);
      onPositioningComplete?.(positioned);
      
      return positioned;
    } catch (error) {
      console.error('Error positioning artifacts:', error);
      setIsPositioning(false);
      return artifacts;
    }
  }, [artifacts, positioningAlgorithm, autoOptimize, showClusters, positioningConfig.algorithm, onPositioningComplete]);

  // Update positioning configuration
  const updatePositioningConfig = useCallback((newConfig: Partial<PositioningConfig>) => {
    positioningAlgorithm.updateConfig(newConfig);
  }, [positioningAlgorithm]);

  // Re-position artifacts when configuration changes
  useEffect(() => {
    updatePositioningConfig(positioningConfig);
  }, [positioningConfig, updatePositioningConfig]);

  // Render cluster visualization
  const renderClusters = () => {
    if (!showClusters || clusters.length === 0) return null;

    return (
      <group>
        {clusters.map(cluster => (
          <group key={cluster.id}>
            {/* Cluster boundary sphere */}
            <mesh position={cluster.center}>
              <sphereGeometry args={[cluster.radius, 16, 16]} />
              <meshBasicMaterial
                color={cluster.color}
                transparent
                opacity={0.1}
                wireframe
              />
            </mesh>
            
            {/* Cluster center marker */}
            <mesh position={cluster.center}>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshBasicMaterial color={cluster.color} />
            </mesh>
            
            {/* Cluster label */}
            <mesh position={[cluster.center.x, cluster.center.y + cluster.radius + 1, cluster.center.z]}>
              {/* Text component would go here in a real implementation */}
            </mesh>
          </group>
        ))}
      </group>
    );
  };

  // Render positioning status
  const renderPositioningStatus = () => {
    if (!isPositioning) return null;

    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm font-medium">Positioning artifacts...</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Scene3D
        artifacts={positionedArtifacts}
        config={config}
        onArtifactSelect={onArtifactSelect}
        onCameraChange={onCameraChange}
      />
      
      {renderClusters()}
      {renderPositioningStatus()}
    </>
  );
};

export default PositionedScene3D;
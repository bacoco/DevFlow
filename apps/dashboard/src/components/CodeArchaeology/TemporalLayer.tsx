import React, { useMemo } from 'react';
import { Vector3, Color } from 'three';
import CodeArtifact3D from './CodeArtifact3D';
import { CodeArtifact, VisualizationConfig } from './types';

export interface TemporalLayerProps {
  artifacts: CodeArtifact[];
  config: VisualizationConfig;
  currentTime: Date;
  layerDepth: number;
  layerOpacity: number;
  onArtifactSelect?: (artifact: CodeArtifact) => void;
  onArtifactHover?: (artifact: CodeArtifact | null) => void;
}

const TemporalLayer: React.FC<TemporalLayerProps> = ({
  artifacts,
  config,
  currentTime,
  layerDepth,
  layerOpacity,
  onArtifactSelect,
  onArtifactHover,
}) => {
  // Calculate age-based visual properties
  const processedArtifacts = useMemo(() => {
    return artifacts.map(artifact => {
      const ageInDays = (currentTime.getTime() - artifact.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      
      // Adjust position based on layer depth and age
      const adjustedPosition = new Vector3(
        artifact.position3D.x,
        artifact.position3D.y + layerDepth,
        artifact.position3D.z
      );

      // Calculate age-based color shift (older = more muted)
      let color = new Color(artifact.color || '#4a90e2');
      if (ageInDays > 30) {
        // Shift older artifacts towards grayscale
        const grayFactor = Math.min(0.7, ageInDays / 180);
        color.lerp(new Color('#888888'), grayFactor);
      }

      // Calculate size based on age (older = smaller)
      const ageFactor = Math.max(0.3, 1 - (ageInDays / 365));
      
      return {
        ...artifact,
        position3D: adjustedPosition,
        color: color.getHexString(),
        size: (artifact.size || 1) * ageFactor,
        opacity: layerOpacity,
        ageInDays,
      };
    });
  }, [artifacts, currentTime, layerDepth, layerOpacity]);

  // Group artifacts by age for different rendering styles
  const artifactGroups = useMemo(() => {
    const groups = {
      recent: [] as typeof processedArtifacts,
      medium: [] as typeof processedArtifacts,
      old: [] as typeof processedArtifacts,
      ancient: [] as typeof processedArtifacts,
    };

    processedArtifacts.forEach(artifact => {
      if (artifact.ageInDays <= 7) {
        groups.recent.push(artifact);
      } else if (artifact.ageInDays <= 30) {
        groups.medium.push(artifact);
      } else if (artifact.ageInDays <= 90) {
        groups.old.push(artifact);
      } else {
        groups.ancient.push(artifact);
      }
    });

    return groups;
  }, [processedArtifacts]);

  // Render artifacts with age-appropriate styling
  const renderArtifactGroup = (
    groupArtifacts: typeof processedArtifacts,
    groupOpacity: number,
    wireframe: boolean = false
  ) => {
    return groupArtifacts.map(artifact => (
      <CodeArtifact3D
        key={`${artifact.id}-layer-${layerDepth}`}
        artifact={artifact}
        config={config}
        isSelected={false}
        isHighlighted={false}
        onClick={onArtifactSelect}
        onHover={onArtifactHover}
        opacity={groupOpacity}
        wireframe={wireframe}
        scale={artifact.size}
      />
    ));
  };

  return (
    <group position={[0, layerDepth, 0]}>
      {/* Recent artifacts - full opacity and detail */}
      <group>
        {renderArtifactGroup(artifactGroups.recent, layerOpacity)}
      </group>

      {/* Medium age artifacts - slightly reduced opacity */}
      <group>
        {renderArtifactGroup(artifactGroups.medium, layerOpacity * 0.8)}
      </group>

      {/* Old artifacts - more transparent */}
      <group>
        {renderArtifactGroup(artifactGroups.old, layerOpacity * 0.6)}
      </group>

      {/* Ancient artifacts - wireframe style for archaeological effect */}
      <group>
        {renderArtifactGroup(artifactGroups.ancient, layerOpacity * 0.3, true)}
      </group>

      {/* Layer separator plane for visual depth */}
      {layerDepth < 0 && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#f0f0f0"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Age indicator grid */}
      {layerDepth < 0 && (
        <gridHelper
          args={[50, 20, '#cccccc', '#eeeeee']}
          position={[0, 0.05, 0]}
          material-opacity={0.2}
          material-transparent={true}
        />
      )}
    </group>
  );
};

export default TemporalLayer;
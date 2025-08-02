import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Color, Mesh } from 'three';
import { Text } from '@react-three/drei';
import { RequirementNode, TraceabilityVisualizationConfig } from './types';

interface RequirementNode3DProps {
  requirement: RequirementNode;
  config: TraceabilityVisualizationConfig;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: (requirement: RequirementNode) => void;
  onHover?: (requirement: RequirementNode | null) => void;
  opacity?: number;
  scale?: number;
}

const RequirementNode3D: React.FC<RequirementNode3DProps> = ({
  requirement,
  config,
  isSelected = false,
  isHighlighted = false,
  onClick,
  onHover,
  opacity = 0.8,
  scale = 1,
}) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate visual properties based on requirement coverage and type
  const visualProps = useMemo(() => {
    const baseSize = 0.8;
    let color = new Color(0x6a5acd); // Slate blue for requirements
    let geometry: 'octahedron' | 'dodecahedron' | 'icosahedron' = 'octahedron';
    let scale = new Vector3(1, 1, 1);

    // Determine geometry based on requirement type (inferred from ID)
    if (requirement.requirementId.startsWith('RF-')) {
      geometry = 'octahedron'; // Functional requirements
      color = new Color(0x4169e1); // Royal blue
    } else if (requirement.requirementId.startsWith('RN-')) {
      geometry = 'dodecahedron'; // Non-functional requirements
      color = new Color(0x9370db); // Medium purple
    }

    // Adjust color based on coverage
    if (config.showCoverageMetrics) {
      if (requirement.coverage === 0) {
        // Red tint for no coverage (gaps)
        color.lerp(new Color(0xff4444), 0.4);
      } else if (requirement.coverage < 0.5) {
        // Orange tint for low coverage
        color.lerp(new Color(0xff8800), 0.3);
      } else if (requirement.coverage >= 1.0) {
        // Green tint for full coverage
        color.lerp(new Color(0x44ff44), 0.2);
      }
    }

    // Adjust size based on number of linked artifacts
    const artifactCount = requirement.linkedArtifacts.length;
    const sizeMultiplier = Math.max(0.7, Math.min(1.5, 1 + (artifactCount * 0.1)));
    scale.multiplyScalar(baseSize * sizeMultiplier);

    return {
      geometry,
      color,
      scale,
    };
  }, [requirement, config]);

  // Handle hover state changes
  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setHovered(true);
    onHover?.(requirement);
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setHovered(false);
    onHover?.(null);
  };

  // Handle click events
  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.(requirement);
  };

  // Animation for selected/highlighted states
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      
      if (isSelected) {
        // Gentle pulsing animation for selected requirements
        const pulse = 1 + Math.sin(time * 2) * 0.15;
        meshRef.current.scale.copy(visualProps.scale.clone().multiplyScalar(pulse));
        
        // Gentle rotation for selected requirements
        meshRef.current.rotation.y = time * 0.5;
      } else if (isHighlighted || hovered) {
        // Slight scale increase for highlighted requirements
        meshRef.current.scale.copy(visualProps.scale.clone().multiplyScalar(1.3));
        meshRef.current.rotation.y = time * 0.2;
      } else {
        // Normal scale and rotation
        meshRef.current.scale.copy(visualProps.scale);
        meshRef.current.rotation.y = time * 0.1;
      }
    }
  });

  // Render the appropriate geometry
  const renderGeometry = () => {
    const commonProps = {
      ref: meshRef,
      position: requirement.position3D,
      onPointerOver: handlePointerOver,
      onPointerOut: handlePointerOut,
      onClick: handleClick,
      castShadow: true,
      receiveShadow: true,
    };

    const material = (
      <meshPhongMaterial
        color={visualProps.color}
        transparent
        opacity={isSelected ? Math.min(1, opacity * 1.2) : hovered || isHighlighted ? Math.min(1, opacity * 1.1) : opacity}
        emissive={isSelected ? visualProps.color.clone().multiplyScalar(0.1) : undefined}
        shininess={100}
      />
    );

    switch (visualProps.geometry) {
      case 'octahedron':
        return (
          <mesh {...commonProps}>
            <octahedronGeometry args={[1, 0]} />
            {material}
          </mesh>
        );
      case 'dodecahedron':
        return (
          <mesh {...commonProps}>
            <dodecahedronGeometry args={[1, 0]} />
            {material}
          </mesh>
        );
      case 'icosahedron':
        return (
          <mesh {...commonProps}>
            <icosahedronGeometry args={[1, 0]} />
            {material}
          </mesh>
        );
      default:
        return null;
    }
  };

  // Format requirement title for display
  const displayTitle = useMemo(() => {
    if (requirement.title.length > 30) {
      return requirement.title.substring(0, 27) + '...';
    }
    return requirement.title;
  }, [requirement.title]);

  return (
    <group>
      {renderGeometry()}
      
      {/* Requirement ID label */}
      <Text
        position={[
          requirement.position3D.x,
          requirement.position3D.y + visualProps.scale.y + 0.8,
          requirement.position3D.z,
        ]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        billboard
        outlineWidth={0.02}
        outlineColor="black"
      >
        {requirement.requirementId}
      </Text>

      {/* Requirement title (shown on hover/selection) */}
      {(isSelected || hovered || isHighlighted) && (
        <Text
          position={[
            requirement.position3D.x,
            requirement.position3D.y + visualProps.scale.y + 1.3,
            requirement.position3D.z,
          ]}
          fontSize={0.25}
          color="lightgray"
          anchorX="center"
          anchorY="middle"
          billboard
          outlineWidth={0.01}
          outlineColor="black"
        >
          {displayTitle}
        </Text>
      )}

      {/* Coverage indicator */}
      {config.showCoverageMetrics && (
        <group>
          {/* Coverage percentage ring */}
          <mesh
            position={[
              requirement.position3D.x,
              requirement.position3D.y - visualProps.scale.y - 0.5,
              requirement.position3D.z,
            ]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.3, 0.4, 16, 1, 0, Math.PI * 2 * requirement.coverage]} />
            <meshBasicMaterial 
              color={requirement.coverage >= 1.0 ? 0x00ff00 : requirement.coverage > 0.5 ? 0xffff00 : 0xff0000}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Coverage percentage text */}
          <Text
            position={[
              requirement.position3D.x,
              requirement.position3D.y - visualProps.scale.y - 0.5,
              requirement.position3D.z + 0.1,
            ]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
          >
            {Math.round(requirement.coverage * 100)}%
          </Text>
        </group>
      )}

      {/* Gap indicator for requirements with no coverage */}
      {config.highlightGaps && requirement.coverage === 0 && (
        <mesh
          position={[
            requirement.position3D.x + 1.2,
            requirement.position3D.y + 1.2,
            requirement.position3D.z,
          ]}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {/* Linked artifacts count indicator */}
      {requirement.linkedArtifacts.length > 0 && (isSelected || hovered || isHighlighted) && (
        <Text
          position={[
            requirement.position3D.x,
            requirement.position3D.y - visualProps.scale.y - 1.0,
            requirement.position3D.z,
          ]}
          fontSize={0.2}
          color="cyan"
          anchorX="center"
          anchorY="middle"
          billboard
          outlineWidth={0.01}
          outlineColor="black"
        >
          {requirement.linkedArtifacts.length} artifacts
        </Text>
      )}
    </group>
  );
};

export default RequirementNode3D;
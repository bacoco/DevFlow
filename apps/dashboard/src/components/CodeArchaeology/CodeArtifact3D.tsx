import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Color, Mesh } from 'three';
import { Text } from '@react-three/drei';
import { CodeArtifact, VisualizationConfig } from './types';

interface CodeArtifact3DProps {
  artifact: CodeArtifact;
  config: VisualizationConfig;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: (artifact: CodeArtifact) => void;
  onHover?: (artifact: CodeArtifact | null) => void;
  opacity?: number;
  wireframe?: boolean;
  scale?: number;
}

const CodeArtifact3D: React.FC<CodeArtifact3DProps> = ({
  artifact,
  config,
  isSelected = false,
  isHighlighted = false,
  onClick,
  onHover,
  opacity = 0.7,
  wireframe = false,
  scale = 1,
}) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate visual properties based on artifact type and metrics
  const visualProps = useMemo(() => {
    const baseSize = 0.5;
    let geometry: 'box' | 'sphere' | 'cylinder' | 'cone' = 'box';
    let color = new Color(0x4a90e2);
    let scale = new Vector3(1, 1, 1);

    // Determine geometry based on artifact type
    switch (artifact.type) {
      case 'file':
        geometry = 'box';
        color = new Color(0x4a90e2); // Blue
        scale.set(1, 0.2, 1.5);
        break;
      case 'function':
        geometry = 'cylinder';
        color = new Color(0x7ed321); // Green
        scale.set(0.8, 1.2, 0.8);
        break;
      case 'class':
        geometry = 'box';
        color = new Color(0xf5a623); // Orange
        scale.set(1.2, 1.5, 1.2);
        break;
      case 'interface':
        geometry = 'cone';
        color = new Color(0xd0021b); // Red
        scale.set(1, 1.3, 1);
        break;
    }

    // Adjust size based on complexity if enabled
    if (config.showComplexity && artifact.complexity > 0) {
      const complexityScale = Math.max(0.5, Math.min(2.0, artifact.complexity / 10));
      scale.multiplyScalar(complexityScale);
    }

    // Adjust color based on change frequency if enabled
    if (config.showChangeFrequency && artifact.changeFrequency > 0) {
      const intensity = Math.min(1.0, artifact.changeFrequency / 10);
      color.lerp(new Color(0xff4444), intensity * 0.5); // Blend with red for high change frequency
    }

    // Apply custom color if specified
    if (artifact.color) {
      color = new Color(artifact.color);
    }

    return {
      geometry,
      color,
      scale: scale.multiplyScalar(baseSize * scale),
    };
  }, [artifact, config]);

  // Handle hover state changes
  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setHovered(true);
    onHover?.(artifact);
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setHovered(false);
    onHover?.(null);
  };

  // Handle click events
  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.(artifact);
  };

  // Animation for selected/highlighted states
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      
      if (isSelected) {
        // Gentle pulsing animation for selected artifacts
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        meshRef.current.scale.copy(visualProps.scale.clone().multiplyScalar(pulse));
      } else if (isHighlighted || hovered) {
        // Slight scale increase for highlighted artifacts
        meshRef.current.scale.copy(visualProps.scale.clone().multiplyScalar(1.2));
      } else {
        // Normal scale
        meshRef.current.scale.copy(visualProps.scale);
      }
    }
  });

  // Render the appropriate geometry
  const renderGeometry = () => {
    const commonProps = {
      ref: meshRef,
      position: artifact.position3D,
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
        opacity={isSelected ? Math.min(1, opacity * 1.3) : hovered || isHighlighted ? Math.min(1, opacity * 1.1) : opacity}
        emissive={isSelected ? visualProps.color.clone().multiplyScalar(0.2) : undefined}
        wireframe={wireframe}
      />
    );

    switch (visualProps.geometry) {
      case 'box':
        return (
          <mesh {...commonProps}>
            <boxGeometry args={[1, 1, 1]} />
            {material}
          </mesh>
        );
      case 'sphere':
        return (
          <mesh {...commonProps}>
            <sphereGeometry args={[0.5, 16, 16]} />
            {material}
          </mesh>
        );
      case 'cylinder':
        return (
          <mesh {...commonProps}>
            <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
            {material}
          </mesh>
        );
      case 'cone':
        return (
          <mesh {...commonProps}>
            <coneGeometry args={[0.5, 1, 16]} />
            {material}
          </mesh>
        );
      default:
        return null;
    }
  };

  return (
    <group>
      {renderGeometry()}
      
      {/* Label for artifact name */}
      {(isSelected || hovered || isHighlighted) && (
        <Text
          position={[
            artifact.position3D.x,
            artifact.position3D.y + visualProps.scale.y + 0.5,
            artifact.position3D.z,
          ]}
          fontSize={0.3}
          color="black"
          anchorX="center"
          anchorY="middle"
          billboard
        >
          {artifact.name}
        </Text>
      )}

      {/* Complexity indicator */}
      {config.showComplexity && artifact.complexity > 5 && (
        <mesh
          position={[
            artifact.position3D.x + 0.8,
            artifact.position3D.y + 0.8,
            artifact.position3D.z,
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {/* Change frequency indicator */}
      {config.showChangeFrequency && artifact.changeFrequency > 5 && (
        <mesh
          position={[
            artifact.position3D.x - 0.8,
            artifact.position3D.y + 0.8,
            artifact.position3D.z,
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="orange" />
        </mesh>
      )}
    </group>
  );
};

export default CodeArtifact3D;
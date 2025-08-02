import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface VisualIndicator {
  id: string;
  type: 'gap' | 'orphan' | 'low-confidence' | 'complete';
  requirementId?: string;
  artifactId?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  position?: { x: number; y: number; z: number };
}

interface CoverageIndicators3DProps {
  indicators: VisualIndicator[];
  onIndicatorClick?: (indicator: VisualIndicator) => void;
  showLabels?: boolean;
  animationSpeed?: number;
}

const CoverageIndicators3D: React.FC<CoverageIndicators3DProps> = ({
  indicators,
  onIndicatorClick,
  showLabels = true,
  animationSpeed = 1
}) => {
  return (
    <group>
      {indicators.map((indicator) => (
        <CoverageIndicator3D
          key={indicator.id}
          indicator={indicator}
          onClick={onIndicatorClick}
          showLabel={showLabels}
          animationSpeed={animationSpeed}
        />
      ))}
    </group>
  );
};

interface CoverageIndicator3DProps {
  indicator: VisualIndicator;
  onClick?: (indicator: VisualIndicator) => void;
  showLabel?: boolean;
  animationSpeed?: number;
}

const CoverageIndicator3D: React.FC<CoverageIndicator3DProps> = ({
  indicator,
  onClick,
  showLabel = true,
  animationSpeed = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const position = useMemo(() => {
    if (indicator.position) {
      return [indicator.position.x, indicator.position.y, indicator.position.z] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [indicator.position]);

  // Get colors and properties based on indicator type and severity
  const { color, emissive, scale, geometry } = useMemo(() => {
    const severityIntensity = {
      high: 1.0,
      medium: 0.7,
      low: 0.4
    }[indicator.severity];

    switch (indicator.type) {
      case 'gap':
        return {
          color: new THREE.Color(0xff4444).multiplyScalar(severityIntensity),
          emissive: new THREE.Color(0xff0000).multiplyScalar(0.2),
          scale: 0.3 + severityIntensity * 0.2,
          geometry: 'octahedron' as const
        };
      case 'orphan':
        return {
          color: new THREE.Color(0xffa500).multiplyScalar(severityIntensity),
          emissive: new THREE.Color(0xff8800).multiplyScalar(0.2),
          scale: 0.25 + severityIntensity * 0.15,
          geometry: 'tetrahedron' as const
        };
      case 'low-confidence':
        return {
          color: new THREE.Color(0xffaa00).multiplyScalar(severityIntensity),
          emissive: new THREE.Color(0xff6600).multiplyScalar(0.2),
          scale: 0.2 + severityIntensity * 0.1,
          geometry: 'sphere' as const
        };
      case 'complete':
        return {
          color: new THREE.Color(0x00ff88).multiplyScalar(0.8),
          emissive: new THREE.Color(0x00aa44).multiplyScalar(0.1),
          scale: 0.15,
          geometry: 'icosahedron' as const
        };
      default:
        return {
          color: new THREE.Color(0x888888),
          emissive: new THREE.Color(0x444444).multiplyScalar(0.1),
          scale: 0.2,
          geometry: 'sphere' as const
        };
    }
  }, [indicator.type, indicator.severity]);

  // Animation
  useFrame((state) => {
    if (meshRef.current && groupRef.current) {
      const time = state.clock.getElapsedTime() * animationSpeed;
      
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.1;
      
      // Rotation based on type
      switch (indicator.type) {
        case 'gap':
          meshRef.current.rotation.x = time * 0.5;
          meshRef.current.rotation.y = time * 0.3;
          break;
        case 'orphan':
          meshRef.current.rotation.y = time * 0.8;
          break;
        case 'low-confidence':
          meshRef.current.rotation.x = time * 0.2;
          meshRef.current.rotation.z = time * 0.4;
          break;
        case 'complete':
          meshRef.current.rotation.y = time * 0.1;
          break;
      }

      // Pulsing effect for high severity
      if (indicator.severity === 'high') {
        const pulse = 1 + Math.sin(time * 3) * 0.2;
        meshRef.current.scale.setScalar(scale * pulse);
      }
    }
  });

  const handleClick = (event: THREE.Event) => {
    event.stopPropagation();
    onClick?.(indicator);
  };

  const renderGeometry = () => {
    const baseProps = {
      args: [scale, 8, 6] as [number, number, number]
    };

    switch (geometry) {
      case 'octahedron':
        return <octahedronGeometry args={[scale]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={[scale]} />;
      case 'icosahedron':
        return <icosahedronGeometry args={[scale]} />;
      case 'sphere':
      default:
        return <sphereGeometry args={[scale, 16, 12]} />;
    }
  };

  const getIcon = () => {
    switch (indicator.type) {
      case 'gap': return '⚠️';
      case 'orphan': return '🔍';
      case 'low-confidence': return '❓';
      case 'complete': return '✅';
      default: return '📋';
    }
  };

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Main indicator mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          transparent
          opacity={0.8}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Glow effect for high severity indicators */}
      {indicator.severity === 'high' && (
        <mesh scale={[1.5, 1.5, 1.5]}>
          <sphereGeometry args={[scale * 1.2, 16, 12]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Label */}
      {showLabel && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <group position={[0, scale + 0.3, 0]}>
            {/* Icon */}
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.3}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="black"
            >
              {getIcon()}
            </Text>
            
            {/* Message */}
            <Text
              position={[0, -0.1, 0]}
              fontSize={0.12}
              color="white"
              anchorX="center"
              anchorY="middle"
              maxWidth={2}
              textAlign="center"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {indicator.message}
            </Text>

            {/* Requirement/Artifact ID */}
            {(indicator.requirementId || indicator.artifactId) && (
              <Text
                position={[0, -0.3, 0]}
                fontSize={0.08}
                color="#cccccc"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.005}
                outlineColor="black"
              >
                {indicator.requirementId || indicator.artifactId}
              </Text>
            )}
          </group>
        </Billboard>
      )}

      {/* Connection line to origin for orphaned artifacts */}
      {indicator.type === 'orphan' && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                0, 0, 0,
                -position[0], -position[1], -position[2]
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            linewidth={1}
          />
        </line>
      )}
    </group>
  );
};

export default CoverageIndicators3D;
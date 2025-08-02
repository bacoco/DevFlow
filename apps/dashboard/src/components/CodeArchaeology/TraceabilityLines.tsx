import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, Line, Color } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { TraceabilityConnection, RequirementNode, CodeArtifact } from './types';

interface TraceabilityLinesProps {
  connections: TraceabilityConnection[];
  requirements: RequirementNode[];
  artifacts: CodeArtifact[];
  selectedRequirement?: string;
  selectedArtifact?: string;
  confidenceThreshold?: number;
}

const TraceabilityLines: React.FC<TraceabilityLinesProps> = ({
  connections,
  requirements,
  artifacts,
  selectedRequirement,
  selectedArtifact,
  confidenceThreshold = 0.5,
}) => {
  const linesRef = useRef<Line[]>([]);

  // Create lookup maps for quick access
  const requirementMap = useMemo(() => {
    const map = new Map<string, RequirementNode>();
    requirements.forEach(req => map.set(req.requirementId, req));
    return map;
  }, [requirements]);

  const artifactMap = useMemo(() => {
    const map = new Map<string, CodeArtifact>();
    artifacts.forEach(artifact => map.set(artifact.id, artifact));
    return map;
  }, [artifacts]);

  // Filter and prepare connections for rendering
  const visibleConnections = useMemo(() => {
    return connections.filter(connection => {
      // Filter by confidence threshold
      if (connection.confidence < confidenceThreshold) return false;

      // Check if both endpoints exist
      const requirement = requirementMap.get(connection.fromId);
      const artifact = artifactMap.get(connection.toId);
      
      return requirement && artifact;
    });
  }, [connections, requirementMap, artifactMap, confidenceThreshold]);

  // Generate line geometries and materials
  const lineData = useMemo(() => {
    return visibleConnections.map(connection => {
      const requirement = requirementMap.get(connection.fromId);
      const artifact = artifactMap.get(connection.toId);

      if (!requirement || !artifact) return null;

      // Calculate line properties
      const isHighlighted = connection.isHighlighted || 
        selectedRequirement === connection.fromId || 
        selectedArtifact === connection.toId;
      
      const isSelected = connection.isSelected;

      // Determine color based on link type and state
      let color: Color;
      if (isSelected) {
        color = new Color(0xffffff); // White for selected
      } else if (isHighlighted) {
        color = new Color(0xffff00); // Yellow for highlighted
      } else {
        switch (connection.linkType) {
          case 'implements':
            color = new Color(0x00ff00); // Green for implementation
            break;
          case 'tests':
            color = new Color(0x0080ff); // Blue for tests
            break;
          case 'documents':
            color = new Color(0xff8000); // Orange for documentation
            break;
          default:
            color = new Color(0x808080); // Gray for unknown
        }
      }

      // Adjust opacity based on confidence
      const opacity = Math.max(0.3, connection.confidence);

      // Calculate line width based on confidence and state
      let lineWidth = 2 + (connection.confidence * 3); // 2-5 pixels
      if (isSelected) lineWidth *= 2;
      if (isHighlighted) lineWidth *= 1.5;

      // Create curved line path for better visual separation
      const start = requirement.position3D;
      const end = artifact.position3D;
      const midPoint = new Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5)
        .add(new Vector3(0, 2, 0)); // Curve upward

      // Generate points for smooth curve
      const points: Vector3[] = [];
      const segments = 20;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = new Vector3()
          .copy(start)
          .multiplyScalar((1 - t) * (1 - t))
          .add(midPoint.clone().multiplyScalar(2 * (1 - t) * t))
          .add(end.clone().multiplyScalar(t * t));
        points.push(point);
      }

      return {
        id: connection.id,
        points,
        color,
        opacity,
        lineWidth,
        isHighlighted,
        isSelected,
        linkType: connection.linkType,
        confidence: connection.confidence,
      };
    }).filter(Boolean);
  }, [visibleConnections, requirementMap, artifactMap, selectedRequirement, selectedArtifact]);

  // Animation for highlighted and selected lines
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    linesRef.current.forEach((line, index) => {
      const data = lineData[index];
      if (!data) return;

      if (data.isSelected) {
        // Pulsing animation for selected lines
        const pulse = 0.8 + Math.sin(time * 4) * 0.2;
        if (line.material && 'opacity' in line.material) {
          (line.material as any).opacity = data.opacity * pulse;
        }
      } else if (data.isHighlighted) {
        // Gentle glow for highlighted lines
        const glow = 0.9 + Math.sin(time * 2) * 0.1;
        if (line.material && 'opacity' in line.material) {
          (line.material as any).opacity = data.opacity * glow;
        }
      }
    });
  });

  return (
    <group>
      {lineData.map((data, index) => {
        if (!data) return null;

        // Convert Vector3 points to flat array for LineGeometry
        const positions: number[] = [];
        data.points.forEach(point => {
          positions.push(point.x, point.y, point.z);
        });

        return (
          <primitive
            key={data.id}
            ref={(ref: Line) => {
              if (ref) linesRef.current[index] = ref;
            }}
            object={(() => {
              const geometry = new LineGeometry();
              geometry.setPositions(positions);

              const material = new LineMaterial({
                color: data.color,
                linewidth: data.lineWidth,
                transparent: true,
                opacity: data.opacity,
                resolution: new Vector3(window.innerWidth, window.innerHeight),
                dashed: data.linkType === 'documents', // Dashed lines for documentation
                dashSize: 0.5,
                gapSize: 0.2,
              });

              const line = new Line2(geometry, material);
              line.computeLineDistances(); // Required for dashed lines
              
              return line;
            })()}
          />
        );
      })}
    </group>
  );
};

export default TraceabilityLines;
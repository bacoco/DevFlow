import React, { useMemo } from 'react';
import { Vector3, Color, BufferGeometry, Float32Array } from 'three';
import { Line } from '@react-three/drei';

interface DependencyConnection {
  from: Vector3;
  to: Vector3;
  strength: number;
  color: Color;
}

interface DependencyLinesProps {
  connections: DependencyConnection[];
}

const DependencyLines: React.FC<DependencyLinesProps> = ({ connections }) => {
  // Generate line geometries for all connections
  const lineData = useMemo(() => {
    return connections.map((connection, index) => {
      // Create curved line points for better visualization
      const start = connection.from;
      const end = connection.to;
      const mid = new Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5)
        .add(new Vector3(0, Math.abs(start.distanceTo(end)) * 0.2, 0)); // Arc upward

      const points = [start, mid, end];
      
      return {
        key: `dependency-${index}`,
        points,
        color: connection.color,
        opacity: Math.max(0.3, connection.strength),
        lineWidth: Math.max(1, connection.strength * 3),
      };
    });
  }, [connections]);

  if (connections.length === 0) {
    return null;
  }

  return (
    <group>
      {lineData.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color={line.color}
          lineWidth={line.lineWidth}
          transparent
          opacity={line.opacity}
        />
      ))}
    </group>
  );
};

export default DependencyLines;
import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import { Vector3, Color } from 'three';
import { CodeArtifact } from './types';
import {
  ArchitecturalPatternService,
  ArchitecturalPattern,
  PatternNode3D,
  PatternConnection3D,
  PatternTrend,
} from './ArchitecturalPatternService';
import styles from './PatternVisualization3D.module.css';

interface PatternVisualization3DProps {
  artifacts: CodeArtifact[];
  selectedPatternId?: string;
  onPatternSelect?: (pattern: ArchitecturalPattern) => void;
  showTrends?: boolean;
  className?: string;
}

interface PatternNodeProps {
  node: PatternNode3D;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

interface PatternConnectionProps {
  connection: PatternConnection3D;
  artifacts: CodeArtifact[];
  patternNodes: PatternNode3D[];
}

const PatternNode: React.FC<PatternNodeProps> = ({
  node,
  isSelected,
  onClick,
  onHover,
}) => {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing animation for selected patterns
      if (isSelected) {
        meshRef.current.scale.setScalar(
          1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
        );
      } else {
        meshRef.current.scale.setScalar(hovered ? 1.2 : 1);
      }
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    onHover(true);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover(false);
  };

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <Sphere
        ref={meshRef}
        args={[node.size, 16, 16]}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={node.color}
          transparent
          opacity={isSelected ? 0.9 : 0.7}
          emissive={hovered ? new Color(node.color).multiplyScalar(0.2) : new Color(0x000000)}
        />
      </Sphere>
      
      <Text
        position={[0, node.size + 2, 0]}
        fontSize={2}
        color={node.color}
        anchorX="center"
        anchorY="middle"
        visible={hovered || isSelected}
      >
        {node.name}
      </Text>
      
      {(hovered || isSelected) && (
        <Text
          position={[0, node.size + 4, 0]}
          fontSize={1.2}
          color="#666666"
          anchorX="center"
          anchorY="middle"
        >
          {`Confidence: ${(node.confidence * 100).toFixed(0)}%`}
        </Text>
      )}
    </group>
  );
};

const PatternConnection: React.FC<PatternConnectionProps> = ({
  connection,
  artifacts,
  patternNodes,
}) => {
  const getNodePosition = (nodeId: string): Vector3 => {
    // First check if it's a pattern node
    const patternNode = patternNodes.find(n => n.id === nodeId);
    if (patternNode) {
      return new Vector3(
        patternNode.position.x,
        patternNode.position.y,
        patternNode.position.z
      );
    }

    // Then check if it's an artifact
    const artifact = artifacts.find(a => a.id === nodeId);
    if (artifact) {
      return artifact.position3D;
    }

    return new Vector3(0, 0, 0);
  };

  const startPos = getNodePosition(connection.fromId);
  const endPos = getNodePosition(connection.toId);
  const points = [startPos, endPos];

  return (
    <Line
      points={points}
      color="#888888"
      lineWidth={Math.max(1, connection.strength * 3)}
      transparent
      opacity={0.6}
      dashed
      dashSize={0.5}
      gapSize={0.3}
    />
  );
};

const PatternVisualization3D: React.FC<PatternVisualization3DProps> = ({
  artifacts,
  selectedPatternId,
  onPatternSelect,
  showTrends = false,
  className = '',
}) => {
  const [patterns, setPatterns] = useState<ArchitecturalPattern[]>([]);
  const [patternNodes, setPatternNodes] = useState<PatternNode3D[]>([]);
  const [patternConnections, setPatternConnections] = useState<PatternConnection3D[]>([]);
  const [patternTrends, setPatternTrends] = useState<PatternTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null);

  const patternService = useRef(new ArchitecturalPatternService());

  useEffect(() => {
    analyzePatterns();
  }, [artifacts]);

  const analyzePatterns = async () => {
    setLoading(true);
    try {
      const service = patternService.current;
      
      // Analyze patterns
      const detectedPatterns = await service.analyzePatterns(artifacts);
      setPatterns(detectedPatterns);

      // Get visualization data
      const { patternNodes: nodes, patternConnections: connections } = 
        service.getPatternVisualizationData(artifacts);
      setPatternNodes(nodes);
      setPatternConnections(connections);

      // Get pattern trends if requested
      if (showTrends) {
        const trends = service.getPatternTrends();
        setPatternTrends(trends);
      }
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatternClick = (nodeId: string) => {
    const pattern = patterns.find(p => p.id === nodeId);
    if (pattern && onPatternSelect) {
      onPatternSelect(pattern);
    }
  };

  const handlePatternHover = (nodeId: string, hovered: boolean) => {
    setHoveredPattern(hovered ? nodeId : null);
  };

  if (loading) {
    return (
      <div className={`${styles['pattern-visualization-loading']} ${className}`}>
        <div className={styles['loading-spinner']}></div>
        <p>Analyzing architectural patterns...</p>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className={`${styles['pattern-visualization-empty']} ${className}`}>
        <div className={styles['empty-state']}>
          <div className={styles['empty-icon']}>🏗️</div>
          <h4>No Patterns Detected</h4>
          <p>No architectural patterns were found in the current codebase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['pattern-visualization-3d']} ${className}`}>
      <div className={styles['visualization-header']}>
        <h3>Architectural Patterns ({patterns.length})</h3>
        <div className={styles['pattern-stats']}>
          <div className={styles['stat-item']}>
            <span className={styles['stat-label']}>Design Patterns:</span>
            <span className={styles['stat-value']}>
              {patterns.filter(p => p.type === 'design_pattern').length}
            </span>
          </div>
          <div className={styles['stat-item']}>
            <span className={styles['stat-label']}>Architectural:</span>
            <span className={styles['stat-value']}>
              {patterns.filter(p => p.type === 'architectural_pattern').length}
            </span>
          </div>
          <div className={styles['stat-item']}>
            <span className={styles['stat-label']}>Anti-patterns:</span>
            <span className={styles['stat-value']}>
              {patterns.filter(p => p.type === 'anti_pattern').length}
            </span>
          </div>
        </div>
      </div>

      <div className={styles['canvas-container']}>
        <Canvas
          camera={{ position: [50, 50, 50], fov: 60 }}
          style={{ width: '100%', height: '400px' }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} />
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={200}
            minDistance={10}
          />

          {/* Render pattern nodes */}
          {patternNodes.map((node) => (
            <PatternNode
              key={node.id}
              node={node}
              isSelected={selectedPatternId === node.id}
              onClick={() => handlePatternClick(node.id)}
              onHover={(hovered) => handlePatternHover(node.id, hovered)}
            />
          ))}

          {/* Render pattern connections */}
          {patternConnections.map((connection) => (
            <PatternConnection
              key={connection.id}
              connection={connection}
              artifacts={artifacts}
              patternNodes={patternNodes}
            />
          ))}

          {/* Render code artifacts as smaller spheres */}
          {artifacts.map((artifact) => (
            <Sphere
              key={`artifact-${artifact.id}`}
              args={[1, 8, 8]}
              position={[artifact.position3D.x, artifact.position3D.y, artifact.position3D.z]}
            >
              <meshStandardMaterial
                color="#cccccc"
                transparent
                opacity={0.3}
              />
            </Sphere>
          ))}
        </Canvas>
      </div>

      {/* Pattern legend */}
      <div className={styles['pattern-legend']}>
        <div className={styles['legend-item']}>
          <div className={styles['legend-color']} style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Design Patterns</span>
        </div>
        <div className={styles['legend-item']}>
          <div className={styles['legend-color']} style={{ backgroundColor: '#2196F3' }}></div>
          <span>Architectural Patterns</span>
        </div>
        <div className={styles['legend-item']}>
          <div className={styles['legend-color']} style={{ backgroundColor: '#F44336' }}></div>
          <span>Anti-patterns</span>
        </div>
        <div className={styles['legend-item']}>
          <div className={styles['legend-color']} style={{ backgroundColor: '#cccccc' }}></div>
          <span>Code Artifacts</span>
        </div>
      </div>

      {/* Pattern trends */}
      {showTrends && patternTrends.length > 0 && (
        <div className={styles['pattern-trends']}>
          <h4>Pattern Trends</h4>
          <div className={styles['trends-list']}>
            {patternTrends.slice(0, 5).map((trend) => (
              <div key={trend.patternId} className={styles['trend-item']}>
                <div className={styles['trend-header']}>
                  <span className={styles['trend-name']}>{trend.patternName}</span>
                  <span className={`${styles['trend-indicator']} ${styles[trend.trend]}`}>
                    {trend.trend}
                  </span>
                </div>
                <div className={styles['trend-details']}>
                  <span className={styles['impact-score']}>
                    Impact: {trend.impactScore.toFixed(1)}
                  </span>
                  <span className={styles['recommendation']}>
                    {trend.recommendation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hovered pattern info */}
      {hoveredPattern && (
        <div className={styles['pattern-tooltip']}>
          {(() => {
            const pattern = patterns.find(p => p.id === hoveredPattern);
            return pattern ? (
              <div>
                <h5>{pattern.name}</h5>
                <p>{pattern.description}</p>
                <div className={styles['pattern-meta']}>
                  <span>Type: {pattern.type.replace('_', ' ')}</span>
                  <span>Confidence: {(pattern.confidence * 100).toFixed(0)}%</span>
                  <span>Artifacts: {pattern.artifacts.length}</span>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default PatternVisualization3D;
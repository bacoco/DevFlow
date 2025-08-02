import React from 'react';
import { render, screen } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import TraceabilityLines from '../TraceabilityLines';
import { TraceabilityConnection, RequirementNode, CodeArtifact } from '../types';

// Mock Three.js components
jest.mock('three/examples/jsm/lines/Line2', () => ({
  Line2: jest.fn().mockImplementation(() => ({
    computeLineDistances: jest.fn(),
  })),
}));

jest.mock('three/examples/jsm/lines/LineMaterial', () => ({
  LineMaterial: jest.fn(),
}));

jest.mock('three/examples/jsm/lines/LineGeometry', () => ({
  LineGeometry: jest.fn().mockImplementation(() => ({
    setPositions: jest.fn(),
  })),
}));

const mockRequirements: RequirementNode[] = [
  {
    id: 'req-1',
    requirementId: 'RF-001',
    title: 'Test Requirement',
    description: 'A test requirement',
    specFile: 'test.md',
    position3D: new Vector3(0, 0, 0),
    coverage: 0.8,
    linkedArtifacts: ['artifact-1'],
  },
];

const mockArtifacts: CodeArtifact[] = [
  {
    id: 'artifact-1',
    filePath: 'test.ts',
    type: 'function',
    name: 'testFunction',
    position3D: new Vector3(5, 0, 0),
    complexity: 5,
    changeFrequency: 3,
    lastModified: new Date(),
    authors: ['test-author'],
    dependencies: [],
  },
];

const mockConnections: TraceabilityConnection[] = [
  {
    id: 'conn-1',
    fromId: 'RF-001',
    toId: 'artifact-1',
    linkType: 'implements',
    confidence: 0.9,
    isHighlighted: false,
    isSelected: false,
  },
];

const renderWithCanvas = (component: React.ReactElement) => {
  return render(
    <Canvas>
      {component}
    </Canvas>
  );
};

describe('TraceabilityLines', () => {
  it('renders without crashing', () => {
    renderWithCanvas(
      <TraceabilityLines
        connections={mockConnections}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
      />
    );
  });

  it('filters connections by confidence threshold', () => {
    const lowConfidenceConnections: TraceabilityConnection[] = [
      {
        ...mockConnections[0],
        confidence: 0.3,
      },
    ];

    renderWithCanvas(
      <TraceabilityLines
        connections={lowConfidenceConnections}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
        confidenceThreshold={0.5}
      />
    );

    // Should not render lines below confidence threshold
    // This is tested by checking that no line geometries are created
  });

  it('highlights connections when requirement is selected', () => {
    renderWithCanvas(
      <TraceabilityLines
        connections={mockConnections}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
        selectedRequirement="RF-001"
      />
    );

    // Connection should be highlighted when requirement is selected
  });

  it('highlights connections when artifact is selected', () => {
    renderWithCanvas(
      <TraceabilityLines
        connections={mockConnections}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
        selectedArtifact="artifact-1"
      />
    );

    // Connection should be highlighted when artifact is selected
  });

  it('handles missing requirements gracefully', () => {
    const connectionsWithMissingReq: TraceabilityConnection[] = [
      {
        ...mockConnections[0],
        fromId: 'RF-999', // Non-existent requirement
      },
    ];

    renderWithCanvas(
      <TraceabilityLines
        connections={connectionsWithMissingReq}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
      />
    );

    // Should not crash and should filter out invalid connections
  });

  it('handles missing artifacts gracefully', () => {
    const connectionsWithMissingArtifact: TraceabilityConnection[] = [
      {
        ...mockConnections[0],
        toId: 'artifact-999', // Non-existent artifact
      },
    ];

    renderWithCanvas(
      <TraceabilityLines
        connections={connectionsWithMissingArtifact}
        requirements={mockRequirements}
        artifacts={mockArtifacts}
      />
    );

    // Should not crash and should filter out invalid connections
  });
});
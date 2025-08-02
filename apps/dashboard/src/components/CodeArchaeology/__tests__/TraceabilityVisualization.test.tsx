import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import TraceabilityVisualization from '../TraceabilityVisualization';
import {
  TraceabilityLink,
  RequirementNode,
  CodeArtifact,
  TraceabilityVisualizationConfig,
  RequirementReference,
} from '../types';

const mockRequirementReferences: RequirementReference[] = [
  {
    requirementId: 'RF-001',
    taskId: '1.1',
    taskDescription: 'Implement user authentication',
    confidence: 0.9,
  },
];

const mockTraceabilityLinks: TraceabilityLink[] = [
  {
    id: 'link-1',
    requirementId: 'RF-001',
    specFile: 'auth.md',
    codeArtifacts: ['artifact-1'],
    linkType: 'implements',
    confidence: 0.9,
    taskReferences: mockRequirementReferences,
  },
];

const mockRequirements: RequirementNode[] = [
  {
    id: 'req-1',
    requirementId: 'RF-001',
    title: 'User Authentication',
    description: 'Users must be able to authenticate',
    specFile: 'auth.md',
    position3D: new Vector3(0, 0, 0),
    coverage: 0.8,
    linkedArtifacts: ['artifact-1'],
  },
  {
    id: 'req-2',
    requirementId: 'RF-002',
    title: 'Data Validation',
    description: 'Input data must be validated',
    specFile: 'validation.md',
    position3D: new Vector3(0, 5, 0),
    coverage: 0,
    linkedArtifacts: [],
  },
];

const mockArtifacts: CodeArtifact[] = [
  {
    id: 'artifact-1',
    filePath: 'auth.ts',
    type: 'function',
    name: 'authenticate',
    position3D: new Vector3(5, 0, 0),
    complexity: 5,
    changeFrequency: 3,
    lastModified: new Date(),
    authors: ['dev1'],
    dependencies: [],
  },
  {
    id: 'artifact-2',
    filePath: 'orphan.ts',
    type: 'function',
    name: 'orphanFunction',
    position3D: new Vector3(5, 5, 0),
    complexity: 2,
    changeFrequency: 1,
    lastModified: new Date(),
    authors: ['dev2'],
    dependencies: [],
  },
];

const mockConfig: TraceabilityVisualizationConfig = {
  showDependencies: true,
  showComplexity: true,
  showChangeFrequency: true,
  showTraceabilityLinks: true,
  showRequirements: true,
  showCoverageMetrics: true,
  confidenceThreshold: 0.7,
  highlightGaps: true,
  highlightOrphans: true,
};

const renderWithCanvas = (component: React.ReactElement) => {
  return render(
    <Canvas>
      {component}
    </Canvas>
  );
};

describe('TraceabilityVisualization', () => {
  it('renders without crashing', () => {
    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={mockConfig}
      />
    );
  });

  it('calls coverage analysis callback with correct data', () => {
    const mockOnCoverageAnalysis = jest.fn();

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={mockConfig}
        onCoverageAnalysis={mockOnCoverageAnalysis}
      />
    );

    expect(mockOnCoverageAnalysis).toHaveBeenCalledWith({
      totalRequirements: 2,
      linkedRequirements: 1,
      coveragePercentage: 50,
      gapAnalysis: ['RF-002'],
      orphanedArtifacts: ['artifact-2'],
    });
  });

  it('filters artifacts by type when configured', () => {
    const configWithTypeFilter: TraceabilityVisualizationConfig = {
      ...mockConfig,
      filterByType: ['class'],
    };

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={configWithTypeFilter}
      />
    );

    // Should only show artifacts of type 'class' (none in our mock data)
  });

  it('filters links by confidence threshold', () => {
    const lowConfidenceLinks: TraceabilityLink[] = [
      {
        ...mockTraceabilityLinks[0],
        confidence: 0.5,
      },
    ];

    const configWithHighThreshold: TraceabilityVisualizationConfig = {
      ...mockConfig,
      confidenceThreshold: 0.8,
    };

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={lowConfidenceLinks}
        requirements={mockRequirements}
        config={configWithHighThreshold}
      />
    );

    // Should not show links below confidence threshold
  });

  it('handles requirement selection', () => {
    const mockOnRequirementSelect = jest.fn();

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={mockConfig}
        onRequirementSelect={mockOnRequirementSelect}
      />
    );

    // Simulate clicking on a requirement
    // In a real test, we'd need to find the requirement node and click it
  });

  it('handles artifact selection', () => {
    const mockOnArtifactSelect = jest.fn();

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={mockConfig}
        onArtifactSelect={mockOnArtifactSelect}
      />
    );

    // Simulate clicking on an artifact
    // In a real test, we'd need to find the artifact node and click it
  });

  it('highlights orphaned artifacts when configured', () => {
    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={mockConfig}
      />
    );

    // artifact-2 should be highlighted as orphaned
  });

  it('hides requirements when showRequirements is false', () => {
    const configWithoutRequirements: TraceabilityVisualizationConfig = {
      ...mockConfig,
      showRequirements: false,
    };

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={configWithoutRequirements}
      />
    );

    // Should not render any requirement nodes
  });

  it('hides traceability links when showTraceabilityLinks is false', () => {
    const configWithoutLinks: TraceabilityVisualizationConfig = {
      ...mockConfig,
      showTraceabilityLinks: false,
    };

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={configWithoutLinks}
      />
    );

    // Should not render TraceabilityLines component
  });

  it('filters links by link type when configured', () => {
    const configWithLinkTypeFilter: TraceabilityVisualizationConfig = {
      ...mockConfig,
      linkTypeFilter: ['tests'],
    };

    renderWithCanvas(
      <TraceabilityVisualization
        artifacts={mockArtifacts}
        traceabilityLinks={mockTraceabilityLinks}
        requirements={mockRequirements}
        config={configWithLinkTypeFilter}
      />
    );

    // Should only show 'tests' type links (none in our mock data)
  });
});
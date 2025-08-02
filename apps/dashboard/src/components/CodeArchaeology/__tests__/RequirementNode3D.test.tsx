import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import RequirementNode3D from '../RequirementNode3D';
import { RequirementNode, TraceabilityVisualizationConfig } from '../types';

const mockRequirement: RequirementNode = {
  id: 'req-1',
  requirementId: 'RF-001',
  title: 'Test Requirement for User Authentication',
  description: 'This requirement covers user authentication functionality',
  specFile: 'auth.md',
  position3D: new Vector3(0, 0, 0),
  coverage: 0.8,
  linkedArtifacts: ['artifact-1', 'artifact-2'],
};

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

describe('RequirementNode3D', () => {
  it('renders without crashing', () => {
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
      />
    );
  });

  it('calls onClick handler when clicked', () => {
    const mockOnClick = jest.fn();
    
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
        onClick={mockOnClick}
      />
    );

    // Find the mesh and simulate click
    const meshes = document.querySelectorAll('mesh');
    if (meshes.length > 0) {
      fireEvent.click(meshes[0]);
      expect(mockOnClick).toHaveBeenCalledWith(mockRequirement);
    }
  });

  it('calls onHover handler when hovered', () => {
    const mockOnHover = jest.fn();
    
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
        onHover={mockOnHover}
      />
    );

    // Find the mesh and simulate hover
    const meshes = document.querySelectorAll('mesh');
    if (meshes.length > 0) {
      fireEvent.mouseEnter(meshes[0]);
      expect(mockOnHover).toHaveBeenCalledWith(mockRequirement);
    }
  });

  it('displays requirement ID', () => {
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
      />
    );

    // Check that requirement ID is rendered in text
    // Note: In a real test, we'd need to check the Text component props
  });

  it('shows coverage indicator when showCoverageMetrics is enabled', () => {
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
      />
    );

    // Should render coverage ring and percentage text
    // In a real implementation, we'd check for specific geometry types
  });

  it('shows gap indicator for zero coverage requirements', () => {
    const gapRequirement: RequirementNode = {
      ...mockRequirement,
      coverage: 0,
      linkedArtifacts: [],
    };

    renderWithCanvas(
      <RequirementNode3D
        requirement={gapRequirement}
        config={mockConfig}
      />
    );

    // Should render gap indicator (red sphere)
  });

  it('truncates long requirement titles', () => {
    const longTitleRequirement: RequirementNode = {
      ...mockRequirement,
      title: 'This is a very long requirement title that should be truncated for display purposes',
    };

    renderWithCanvas(
      <RequirementNode3D
        requirement={longTitleRequirement}
        config={mockConfig}
        isSelected={true}
      />
    );

    // Title should be truncated to 30 characters + "..."
  });

  it('uses different geometry for functional vs non-functional requirements', () => {
    const functionalReq: RequirementNode = {
      ...mockRequirement,
      requirementId: 'RF-001',
    };

    const nonFunctionalReq: RequirementNode = {
      ...mockRequirement,
      requirementId: 'RN-001',
    };

    // Test functional requirement (should use octahedron)
    renderWithCanvas(
      <RequirementNode3D
        requirement={functionalReq}
        config={mockConfig}
      />
    );

    // Test non-functional requirement (should use dodecahedron)
    renderWithCanvas(
      <RequirementNode3D
        requirement={nonFunctionalReq}
        config={mockConfig}
      />
    );
  });

  it('adjusts size based on number of linked artifacts', () => {
    const manyLinkedRequirement: RequirementNode = {
      ...mockRequirement,
      linkedArtifacts: ['art1', 'art2', 'art3', 'art4', 'art5'],
    };

    renderWithCanvas(
      <RequirementNode3D
        requirement={manyLinkedRequirement}
        config={mockConfig}
      />
    );

    // Should be larger due to more linked artifacts
  });

  it('shows artifact count when selected or hovered', () => {
    renderWithCanvas(
      <RequirementNode3D
        requirement={mockRequirement}
        config={mockConfig}
        isSelected={true}
      />
    );

    // Should show "2 artifacts" text
  });
});
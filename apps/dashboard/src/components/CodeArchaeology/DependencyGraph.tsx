import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CodeArtifact } from './types';

interface DependencyInfo {
  id: string;
  name: string;
  type: 'imports' | 'exports' | 'calls' | 'extends';
  filePath: string;
}

interface DependencyGraphProps {
  centerArtifact: CodeArtifact;
  dependencies: DependencyInfo[];
  onNodeClick?: (dependency: DependencyInfo) => void;
  width?: number;
  height?: number;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'center' | 'dependency';
  dependencyType?: string;
  filePath?: string;
  radius: number;
  color: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  strength: number;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  centerArtifact,
  dependencies,
  onNodeClick,
  width = 350,
  height = 300,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || dependencies.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create nodes
    const nodes: GraphNode[] = [
      {
        id: centerArtifact.id,
        name: centerArtifact.name,
        type: 'center',
        radius: 20,
        color: '#1976d2',
        x: width / 2,
        y: height / 2,
      },
      ...dependencies.map((dep) => ({
        id: dep.id,
        name: dep.name,
        type: 'dependency' as const,
        dependencyType: dep.type,
        filePath: dep.filePath,
        radius: 12,
        color: getDependencyColor(dep.type),
      })),
    ];

    // Create links
    const links: GraphLink[] = dependencies.map((dep) => ({
      source: centerArtifact.id,
      target: dep.id,
      type: dep.type,
      strength: 0.5,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.radius + 5));

    // Create container group
    const container = svg
      .append('g')
      .attr('class', 'dependency-graph-container');

    // Create links
    const linkElements = container
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.type === 'calls' ? '5,5' : 'none'));

    // Create node groups
    const nodeGroups = container
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add circles to nodes
    nodeGroups
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    nodeGroups
      .append('text')
      .text((d) => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.type === 'center' ? 5 : 3)
      .attr('font-size', (d) => d.type === 'center' ? '12px' : '10px')
      .attr('font-weight', (d) => d.type === 'center' ? 'bold' : 'normal')
      .attr('fill', (d) => d.type === 'center' ? '#fff' : '#333')
      .attr('pointer-events', 'none');

    // Add dependency type labels
    nodeGroups
      .filter((d) => d.type === 'dependency')
      .append('text')
      .text((d) => d.dependencyType || '')
      .attr('text-anchor', 'middle')
      .attr('dy', -15)
      .attr('font-size', '8px')
      .attr('fill', '#666')
      .attr('font-weight', '500')
      .attr('text-transform', 'uppercase')
      .attr('pointer-events', 'none');

    // Add click handlers
    nodeGroups
      .filter((d) => d.type === 'dependency')
      .on('click', (event, d) => {
        const dependency = dependencies.find((dep) => dep.id === d.id);
        if (dependency && onNodeClick) {
          onNodeClick(dependency);
        }
      });

    // Add hover effects
    nodeGroups
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', d.radius * 1.2)
          .attr('stroke-width', 3);

        // Show tooltip
        if (d.type === 'dependency') {
          const tooltip = container
            .append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${d.x}, ${d.y! - d.radius - 20})`);

          const rect = tooltip
            .append('rect')
            .attr('fill', '#333')
            .attr('rx', 4)
            .attr('opacity', 0.9);

          const text = tooltip
            .append('text')
            .attr('fill', '#fff')
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle')
            .attr('dy', -5);

          text.append('tspan').text(d.name).attr('x', 0).attr('dy', 12);
          text.append('tspan').text(d.filePath || '').attr('x', 0).attr('dy', 12);

          const bbox = text.node()!.getBBox();
          rect
            .attr('x', bbox.x - 4)
            .attr('y', bbox.y - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4);
        }
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', d.radius)
          .attr('stroke-width', 2);

        container.select('.tooltip').remove();
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroups.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [centerArtifact, dependencies, onNodeClick, width, height]);

  const getDependencyColor = (type: string): string => {
    const colors = {
      imports: '#4CAF50',
      exports: '#FF9800',
      calls: '#2196F3',
      extends: '#E91E63',
    };
    return colors[type as keyof typeof colors] || '#757575';
  };

  if (dependencies.length === 0) {
    return (
      <div className="dependency-graph-empty">
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <p>No dependencies found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-graph-container">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          background: '#fafafa',
        }}
      />
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Imports</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
          <span>Exports</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
          <span>Calls</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#E91E63' }}></div>
          <span>Extends</span>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraph;
export { DependencyGraph };
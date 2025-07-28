import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChartData } from '../../types/dashboard';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface LineChartProps {
  data: ChartData;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 300,
  margin = { top: 20, right: 30, bottom: 40, left: 50 },
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { settings } = useAccessibility();
  const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (!svgRef.current || !data.datasets.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3.scalePoint()
      .domain(data.labels)
      .range([0, innerWidth])
      .padding(0.1);

    const allValues = data.datasets.flatMap(dataset => dataset.data);
    const yScale = d3.scaleLinear()
      .domain(d3.extent(allValues) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    // Create line generator
    const line = d3.line<number>()
      .x((_, i) => xScale(data.labels[i]) || 0)
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add lines for each dataset
    data.datasets.forEach((dataset, index) => {
      const color = dataset.borderColor || d3.schemeCategory10[index % 10];
      
      // Add line path
      g.append('path')
        .datum(dataset.data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', dataset.borderWidth || 2)
        .attr('d', line)
        .attr('class', 'line-path');

      // Add dots
      g.selectAll(`.dot-${index}`)
        .data(dataset.data)
        .enter().append('circle')
        .attr('class', `dot-${index}`)
        .attr('cx', (_, i) => xScale(data.labels[i]) || 0)
        .attr('cy', d => yScale(d))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          // Tooltip on hover
          const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

          tooltip.html(`${dataset.label}: ${d}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.selectAll('.tooltip').remove();
        });
    });

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 100}, 20)`);

    data.datasets.forEach((dataset, index) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${index * 20})`);

      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 2)
        .attr('fill', dataset.borderColor || d3.schemeCategory10[index % 10]);

      legendItem.append('text')
        .attr('x', 16)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text(dataset.label);
    });

  }, [data, width, height, margin]);

  const generateChartDescription = () => {
    const datasetDescriptions = data.datasets.map(dataset => {
      const values = dataset.data;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      return `${dataset.label}: ranges from ${min} to ${max}, with an average of ${avg.toFixed(2)}`;
    }).join('. ');
    
    return `Line chart with ${data.labels.length} data points. ${datasetDescriptions}`;
  };

  const generateDataTable = () => {
    return (
      <table className="chart-table" aria-label="Chart data table">
        <thead>
          <tr>
            <th scope="col">Time Period</th>
            {data.datasets.map((dataset, index) => (
              <th key={index} scope="col">{dataset.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.labels.map((label, index) => (
            <tr key={index}>
              <th scope="row">{label}</th>
              {data.datasets.map((dataset, datasetIndex) => (
                <td key={datasetIndex}>{dataset.data[index]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={`line-chart ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={`${chartId}-desc`}
        tabIndex={0}
      >
        <title id={`${chartId}-title`}>
          Line Chart: {data.datasets.map(d => d.label).join(', ')}
        </title>
        <desc id={`${chartId}-desc`}>
          {generateChartDescription()}
        </desc>
      </svg>
      
      {/* Data table for screen readers */}
      {settings.screenReaderMode && generateDataTable()}
      
      {/* Hidden description for screen readers */}
      <div className="sr-only" aria-live="polite">
        {generateChartDescription()}
      </div>
    </div>
  );
};

export default LineChart;
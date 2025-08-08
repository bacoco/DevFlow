import { ChartData, ChartConfig, BrushSelection, ZoomState } from '../types';
import { BaseChart } from './BaseChart';

export class HeatmapChart extends BaseChart {
  public readonly type = 'heatmap';
  private cells: SVGRectElement[] = [];
  private currentZoom: ZoomState = { x: [0, 1], y: [0, 1], scale: 1 };

  protected initialize(): void {
    this.createSVG();
    this.applyTheme();
    this.render();
  }

  protected render(): void {
    if (!this.svg) return;

    // Clear previous content
    this.svg.innerHTML = '';
    this.cells = [];

    this.addTitle();
    this.drawAxes();
    this.drawHeatmap();
    this.drawColorScale();
  }

  private drawHeatmap(): void {
    if (!this.svg || this.data.values.length === 0) return;

    // Get unique x and y values to create grid
    const xValues = [...new Set(this.data.values.map(d => d.x))].sort();
    const yValues = [...new Set(this.data.values.map(d => d.category || 'default'))].sort();
    
    const width = (this.config.width || 400) - 120; // Extra margin for color scale
    const height = (this.config.height || 300) - 80;
    
    const cellWidth = width / xValues.length;
    const cellHeight = height / yValues.length;
    
    // Get value range for color scaling
    const values = this.data.values.map(d => d.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Create cells
    this.data.values.forEach((point) => {
      const xIndex = xValues.indexOf(point.x);
      const yIndex = yValues.indexOf(point.category || 'default');
      
      if (xIndex === -1 || yIndex === -1) return;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      
      const x = 40 + (xIndex * cellWidth);
      const y = 40 + (yIndex * cellHeight);
      
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', cellWidth.toString());
      rect.setAttribute('height', cellHeight.toString());
      rect.setAttribute('fill', this.getHeatmapColor(point.y, minValue, maxValue));
      rect.setAttribute('stroke', this.config.theme === 'dark' ? '#333' : '#fff');
      rect.setAttribute('stroke-width', '1');
      
      // Add data attributes for interactions
      rect.setAttribute('data-x', point.x.toString());
      rect.setAttribute('data-y', point.y.toString());
      rect.setAttribute('data-category', point.category || 'default');
      
      // Add hover effects
      rect.addEventListener('mouseenter', () => {
        rect.setAttribute('stroke', '#ff6b35');
        rect.setAttribute('stroke-width', '2');
        this.handleHover(point);
      });
      
      rect.addEventListener('mouseleave', () => {
        rect.setAttribute('stroke', this.config.theme === 'dark' ? '#333' : '#fff');
        rect.setAttribute('stroke-width', '1');
      });
      
      rect.addEventListener('click', () => {
        this.handleClick(point);
      });

      this.svg!.appendChild(rect);
      this.cells.push(rect);
    });
    
    // Add grid labels
    this.addGridLabels(xValues, yValues, cellWidth, cellHeight);
  }

  private addGridLabels(
    xValues: any[],
    yValues: string[],
    cellWidth: number,
    cellHeight: number
  ): void {
    if (!this.svg) return;
    
    // X-axis labels
    xValues.forEach((value, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (40 + (index * cellWidth) + cellWidth / 2).toString());
      text.setAttribute('y', (40 + yValues.length * cellHeight + 15).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
      text.textContent = value.toString();
      this.svg.appendChild(text);
    });
    
    // Y-axis labels
    yValues.forEach((value, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '35');
      text.setAttribute('y', (40 + (index * cellHeight) + cellHeight / 2 + 3).toString());
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
      text.textContent = value;
      this.svg.appendChild(text);
    });
  }

  private drawColorScale(): void {
    if (!this.svg) return;
    
    const values = this.data.values.map(d => d.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    const scaleWidth = 20;
    const scaleHeight = 200;
    const scaleX = (this.config.width || 400) - 60;
    const scaleY = 40;
    
    // Create gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'heatmap-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '100%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '0%');
    
    // Add color stops
    for (let i = 0; i <= 10; i++) {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      const offset = (i / 10) * 100;
      const value = minValue + (maxValue - minValue) * (i / 10);
      const color = this.getHeatmapColor(value, minValue, maxValue);
      
      stop.setAttribute('offset', `${offset}%`);
      stop.setAttribute('stop-color', color);
      gradient.appendChild(stop);
    }
    
    defs.appendChild(gradient);
    this.svg.appendChild(defs);
    
    // Create scale rectangle
    const scaleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    scaleRect.setAttribute('x', scaleX.toString());
    scaleRect.setAttribute('y', scaleY.toString());
    scaleRect.setAttribute('width', scaleWidth.toString());
    scaleRect.setAttribute('height', scaleHeight.toString());
    scaleRect.setAttribute('fill', 'url(#heatmap-gradient)');
    scaleRect.setAttribute('stroke', this.config.theme === 'dark' ? '#666' : '#ccc');
    this.svg.appendChild(scaleRect);
    
    // Add scale labels
    const minLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    minLabel.setAttribute('x', (scaleX + scaleWidth + 5).toString());
    minLabel.setAttribute('y', (scaleY + scaleHeight).toString());
    minLabel.setAttribute('font-size', '10');
    minLabel.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
    minLabel.textContent = minValue.toFixed(1);
    this.svg.appendChild(minLabel);
    
    const maxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    maxLabel.setAttribute('x', (scaleX + scaleWidth + 5).toString());
    maxLabel.setAttribute('y', (scaleY + 5).toString());
    maxLabel.setAttribute('font-size', '10');
    maxLabel.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
    maxLabel.textContent = maxValue.toFixed(1);
    this.svg.appendChild(maxLabel);
  }

  private getHeatmapColor(value: number, min: number, max: number): string {
    // Normalize value to 0-1 range
    const normalized = (value - min) / (max - min);
    
    // Use a blue-to-red color scale
    const hue = (1 - normalized) * 240; // Blue (240) to Red (0)
    const saturation = 70;
    const lightness = 50;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  protected handleZoom(state: ZoomState): void {
    this.currentZoom = state;
    
    if (this.svg) {
      const scaleX = 1 / (state.x[1] - state.x[0]);
      const scaleY = 1 / (state.y[1] - state.y[0]);
      const translateX = -state.x[0] * (this.config.width || 400);
      const translateY = -state.y[0] * (this.config.height || 300);
      
      this.svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    }
  }

  protected handlePan(delta: { x: number; y: number }): void {
    if (this.svg) {
      const currentTransform = this.svg.style.transform || '';
      const newTransform = `${currentTransform} translate(${delta.x}px, ${delta.y}px)`;
      this.svg.style.transform = newTransform;
    }
  }

  protected handleBrush(selection: BrushSelection): void {
    // Highlight selected cells
    this.cells.forEach((cell) => {
      const x = cell.getAttribute('data-x');
      const y = parseFloat(cell.getAttribute('data-y') || '0');
      const category = cell.getAttribute('data-category');
      
      const isSelected = selection.data.some(d => 
        d.x.toString() === x && d.y === y && (d.category || 'default') === category
      );
      
      if (isSelected) {
        cell.setAttribute('stroke', '#ff6b35');
        cell.setAttribute('stroke-width', '3');
      } else {
        cell.setAttribute('stroke', this.config.theme === 'dark' ? '#333' : '#fff');
        cell.setAttribute('stroke-width', '1');
        cell.setAttribute('opacity', '0.3');
      }
    });
  }

  protected handleHover(data: any): void {
    // Create or update tooltip
    const tooltip = this.getOrCreateTooltip();
    tooltip.innerHTML = `
      <div><strong>${this.data.dimensions.x.label}:</strong> ${data.x}</div>
      <div><strong>Category:</strong> ${data.category || 'default'}</div>
      <div><strong>${this.data.dimensions.y.label}:</strong> ${data.y}</div>
    `;
    tooltip.style.display = 'block';
  }

  protected handleClick(data: any): void {
    // Emit click event or handle drill-down
    const event = new CustomEvent('chartClick', {
      detail: { data, chart: this }
    });
    this.element.dispatchEvent(event);
  }

  protected cleanup(): void {
    this.cells = [];
  }

  private getOrCreateTooltip(): HTMLElement {
    let tooltip = this.container.querySelector('.chart-tooltip') as HTMLElement;
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '1000';
      tooltip.style.display = 'none';
      this.container.appendChild(tooltip);
      
      // Position tooltip on mouse move
      this.container.addEventListener('mousemove', (event) => {
        const rect = this.container.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - rect.left + 10}px`;
        tooltip.style.top = `${event.clientY - rect.top - 10}px`;
      });
      
      this.container.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }
    
    return tooltip;
  }
}
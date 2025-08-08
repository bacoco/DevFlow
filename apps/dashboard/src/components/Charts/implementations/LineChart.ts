import { ChartData, ChartConfig, BrushSelection, ZoomState } from '../types';
import { BaseChart } from './BaseChart';

export class LineChart extends BaseChart {
  public readonly type = 'line';
  private path: SVGPathElement | null = null;
  private points: SVGCircleElement[] = [];
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
    this.points = [];

    this.addTitle();
    this.drawAxes();
    this.drawLine();
    this.drawPoints();
  }

  private drawLine(): void {
    if (!this.svg || this.data.values.length === 0) return;

    const { xScale, yScale } = this.getScales();
    
    // Create path element
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Build path data
    let pathData = '';
    this.data.values.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });

    this.path.setAttribute('d', pathData);
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke', this.getLineColor());
    this.path.setAttribute('stroke-width', '2');
    this.path.setAttribute('stroke-linejoin', 'round');
    this.path.setAttribute('stroke-linecap', 'round');

    this.svg.appendChild(this.path);
  }

  private drawPoints(): void {
    if (!this.svg) return;

    const { xScale, yScale } = this.getScales();
    
    this.data.values.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = xScale(point.x);
      const y = yScale(point.y);
      
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', this.getPointColor(point.category));
      circle.setAttribute('stroke', this.config.theme === 'dark' ? '#fff' : '#000');
      circle.setAttribute('stroke-width', '1');
      
      // Add data attributes for interactions
      circle.setAttribute('data-index', index.toString());
      circle.setAttribute('data-x', point.x.toString());
      circle.setAttribute('data-y', point.y.toString());
      
      // Add hover effects
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', '6');
        this.handleHover(point);
      });
      
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '4');
      });
      
      circle.addEventListener('click', () => {
        this.handleClick(point);
      });

      this.svg!.appendChild(circle);
      this.points.push(circle);
    });
  }

  private getLineColor(): string {
    const colors = {
      light: '#007acc',
      dark: '#4fc3f7'
    };
    return colors[this.config.theme || 'light'];
  }

  private getPointColor(category?: string): string {
    if (category) {
      // Simple category color mapping
      const hash = category.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 50%)`;
    }
    
    return this.getLineColor();
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
    // Highlight selected points
    this.points.forEach((point, index) => {
      const dataPoint = this.data.values[index];
      const isSelected = selection.data.some(d => d.x === dataPoint.x && d.y === dataPoint.y);
      
      if (isSelected) {
        point.setAttribute('stroke', '#ff6b35');
        point.setAttribute('stroke-width', '3');
      } else {
        point.setAttribute('stroke', this.config.theme === 'dark' ? '#fff' : '#000');
        point.setAttribute('stroke-width', '1');
      }
    });
  }

  protected handleHover(data: any): void {
    // Create or update tooltip
    const tooltip = this.getOrCreateTooltip();
    tooltip.innerHTML = `
      <div><strong>${this.data.dimensions.x.label}:</strong> ${data.x}</div>
      <div><strong>${this.data.dimensions.y.label}:</strong> ${data.y}</div>
      ${data.category ? `<div><strong>Category:</strong> ${data.category}</div>` : ''}
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
    this.path = null;
    this.points = [];
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
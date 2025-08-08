import { ChartData, ChartConfig, BrushSelection, ZoomState } from '../types';
import { BaseChart } from './BaseChart';

export class BarChart extends BaseChart {
  public readonly type = 'bar';
  private bars: SVGRectElement[] = [];
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
    this.bars = [];

    this.addTitle();
    this.drawAxes();
    this.drawBars();
  }

  private drawBars(): void {
    if (!this.svg || this.data.values.length === 0) return;

    const { xScale, yScale } = this.getScales();
    const width = (this.config.width || 400) - 80;
    const height = (this.config.height || 300) - 80;
    const barWidth = Math.max(10, (width / this.data.values.length) * 0.8);
    const barSpacing = (width / this.data.values.length) * 0.2;
    
    // Calculate baseline (zero line)
    const yValues = this.data.values.map(d => d.y);
    const yMin = Math.min(...yValues, 0);
    const baseline = yScale(0);
    
    this.data.values.forEach((point, index) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      
      const x = 40 + (index * (barWidth + barSpacing)) + barSpacing / 2;
      const y = Math.min(yScale(point.y), baseline);
      const rectHeight = Math.abs(yScale(point.y) - baseline);
      
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', barWidth.toString());
      rect.setAttribute('height', rectHeight.toString());
      rect.setAttribute('fill', this.getBarColor(point.category, index));
      rect.setAttribute('stroke', this.config.theme === 'dark' ? '#666' : '#ccc');
      rect.setAttribute('stroke-width', '1');
      
      // Add data attributes for interactions
      rect.setAttribute('data-index', index.toString());
      rect.setAttribute('data-x', point.x.toString());
      rect.setAttribute('data-y', point.y.toString());
      
      // Add hover effects
      rect.addEventListener('mouseenter', () => {
        rect.setAttribute('opacity', '0.8');
        this.handleHover(point);
      });
      
      rect.addEventListener('mouseleave', () => {
        rect.setAttribute('opacity', '1');
      });
      
      rect.addEventListener('click', () => {
        this.handleClick(point);
      });

      this.svg!.appendChild(rect);
      this.bars.push(rect);
    });
  }

  private getBarColor(category?: string, index?: number): string {
    if (category) {
      // Category-based coloring
      const hash = category.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 50%)`;
    }
    
    // Default color scheme
    const colors = {
      light: ['#007acc', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'],
      dark: ['#4fc3f7', '#66bb6a', '#ffeb3b', '#ef5350', '#ab47bc', '#ff9800']
    };
    
    const colorSet = colors[this.config.theme || 'light'];
    return colorSet[(index || 0) % colorSet.length];
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
    // Highlight selected bars
    this.bars.forEach((bar, index) => {
      const dataPoint = this.data.values[index];
      const isSelected = selection.data.some(d => d.x === dataPoint.x && d.y === dataPoint.y);
      
      if (isSelected) {
        bar.setAttribute('stroke', '#ff6b35');
        bar.setAttribute('stroke-width', '3');
      } else {
        bar.setAttribute('stroke', this.config.theme === 'dark' ? '#666' : '#ccc');
        bar.setAttribute('stroke-width', '1');
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
    this.bars = [];
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
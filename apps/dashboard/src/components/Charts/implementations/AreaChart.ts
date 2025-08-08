import { ChartData, ChartConfig, BrushSelection, ZoomState } from '../types';
import { BaseChart } from './BaseChart';

export class AreaChart extends BaseChart {
  public readonly type = 'area';
  private areas: SVGPathElement[] = [];
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
    this.areas = [];

    this.addTitle();
    this.drawAxes();
    this.drawAreas();
  }

  private drawAreas(): void {
    if (!this.svg || this.data.values.length === 0) return;

    const { xScale, yScale } = this.getScales();
    const height = (this.config.height || 300) - 80;
    const baseline = yScale(0);
    
    // Group data by category if available
    const categories = this.groupByCategory();
    
    categories.forEach((categoryData, categoryName) => {
      this.drawSingleArea(categoryData, categoryName, xScale, yScale, baseline);
    });
  }

  private groupByCategory(): Map<string, any[]> {
    const categories = new Map<string, any[]>();
    
    this.data.values.forEach(point => {
      const category = point.category || 'default';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(point);
    });
    
    return categories;
  }

  private drawSingleArea(
    categoryData: any[],
    categoryName: string,
    xScale: (x: any) => number,
    yScale: (y: number) => number,
    baseline: number
  ): void {
    if (!this.svg || categoryData.length === 0) return;

    // Sort data by x value for proper area rendering
    const sortedData = [...categoryData].sort((a, b) => {
      if (typeof a.x === 'number' && typeof b.x === 'number') {
        return a.x - b.x;
      }
      return 0;
    });

    // Create area path
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Build area path data
    let pathData = '';
    
    // Top line
    sortedData.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });
    
    // Bottom line (baseline)
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const x = xScale(sortedData[i].x);
      pathData += ` L ${x} ${baseline}`;
    }
    
    // Close path
    pathData += ' Z';

    area.setAttribute('d', pathData);
    area.setAttribute('fill', this.getAreaColor(categoryName));
    area.setAttribute('fill-opacity', '0.6');
    area.setAttribute('stroke', this.getStrokeColor(categoryName));
    area.setAttribute('stroke-width', '2');
    
    // Add data attributes for interactions
    area.setAttribute('data-category', categoryName);
    
    // Add hover effects
    area.addEventListener('mouseenter', () => {
      area.setAttribute('fill-opacity', '0.8');
      this.handleHover({ category: categoryName, data: categoryData });
    });
    
    area.addEventListener('mouseleave', () => {
      area.setAttribute('fill-opacity', '0.6');
    });
    
    area.addEventListener('click', () => {
      this.handleClick({ category: categoryName, data: categoryData });
    });

    this.svg!.appendChild(area);
    this.areas.push(area);
  }

  private getAreaColor(category: string): string {
    if (category === 'default') {
      return this.config.theme === 'dark' ? '#4fc3f7' : '#007acc';
    }
    
    // Category-based coloring
    const hash = category.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  private getStrokeColor(category: string): string {
    const fillColor = this.getAreaColor(category);
    // Darken the fill color for stroke
    return fillColor.replace('50%', '30%');
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
    // Highlight selected areas
    this.areas.forEach((area) => {
      const category = area.getAttribute('data-category') || '';
      const categoryData = this.data.values.filter(d => (d.category || 'default') === category);
      const hasSelectedData = categoryData.some(point => 
        selection.data.some(d => d.x === point.x && d.y === point.y)
      );
      
      if (hasSelectedData) {
        area.setAttribute('stroke', '#ff6b35');
        area.setAttribute('stroke-width', '4');
        area.setAttribute('fill-opacity', '0.9');
      } else {
        area.setAttribute('stroke', this.getStrokeColor(category));
        area.setAttribute('stroke-width', '2');
        area.setAttribute('fill-opacity', '0.3');
      }
    });
  }

  protected handleHover(data: any): void {
    // Create or update tooltip
    const tooltip = this.getOrCreateTooltip();
    
    if (data.category) {
      const categoryData = data.data as any[];
      const total = categoryData.reduce((sum, point) => sum + point.y, 0);
      const avg = total / categoryData.length;
      
      tooltip.innerHTML = `
        <div><strong>Category:</strong> ${data.category}</div>
        <div><strong>Data Points:</strong> ${categoryData.length}</div>
        <div><strong>Total:</strong> ${total.toFixed(2)}</div>
        <div><strong>Average:</strong> ${avg.toFixed(2)}</div>
      `;
    } else {
      tooltip.innerHTML = `
        <div><strong>${this.data.dimensions.x.label}:</strong> ${data.x}</div>
        <div><strong>${this.data.dimensions.y.label}:</strong> ${data.y}</div>
      `;
    }
    
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
    this.areas = [];
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
import { ChartData, ChartConfig, ChartInstance, ChartAccessibilityInfo, ExportOptions, BrushSelection, ZoomState } from '../types';
import { ChartAccessibility } from '../ChartAccessibility';
import { ChartExport } from '../ChartExport';

export abstract class BaseChart implements ChartInstance {
  public readonly id: string;
  public readonly type: any;
  public readonly data: ChartData;
  public readonly config: ChartConfig;
  public readonly element: HTMLElement;
  public readonly accessibility: ChartAccessibilityInfo;

  protected container: HTMLElement;
  protected svg: SVGElement | null = null;
  protected canvas: HTMLCanvasElement | null = null;

  constructor(data: ChartData, config: ChartConfig) {
    this.id = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.data = data;
    this.config = {
      width: 400,
      height: 300,
      responsive: true,
      theme: 'light',
      accessibility: {
        enabled: true,
        dataTable: true,
        keyboardNavigation: true
      },
      interactions: {
        zoom: false,
        pan: false,
        brush: false,
        tooltip: true,
        drillDown: false
      },
      export: {
        enabled: true,
        formats: ['png', 'svg', 'csv']
      },
      ...config
    };

    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'chart-container';
    this.container.style.position = 'relative';
    this.container.style.width = `${this.config.width}px`;
    this.container.style.height = `${this.config.height}px`;
    
    this.element = this.container;

    // Initialize accessibility
    this.accessibility = ChartAccessibility.createAccessibilityInfo(this);
    
    // Set up accessibility if enabled
    if (this.config.accessibility?.enabled) {
      this.setupAccessibility();
    }

    // Initialize the chart
    this.initialize();
  }

  public readonly interactions = {
    zoom: (state: ZoomState) => this.handleZoom(state),
    pan: (delta: { x: number; y: number }) => this.handlePan(delta),
    brush: (selection: BrushSelection) => this.handleBrush(selection),
    hover: (data: any) => this.handleHover(data),
    click: (data: any) => this.handleClick(data)
  };

  public async export(options: ExportOptions): Promise<Blob | string> {
    return ChartExport.export(this, options);
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.cleanup();
  }

  // Abstract methods to be implemented by specific chart types
  protected abstract initialize(): void;
  protected abstract render(): void;
  protected abstract handleZoom(state: ZoomState): void;
  protected abstract handlePan(delta: { x: number; y: number }): void;
  protected abstract handleBrush(selection: BrushSelection): void;
  protected abstract handleHover(data: any): void;
  protected abstract handleClick(data: any): void;
  protected abstract cleanup(): void;

  protected setupAccessibility(): void {
    if (this.config.accessibility?.keyboardNavigation) {
      ChartAccessibility.addKeyboardNavigation(this);
    }
  }

  protected createSVG(): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.config.width?.toString() || '400');
    svg.setAttribute('height', this.config.height?.toString() || '300');
    svg.setAttribute('viewBox', `0 0 ${this.config.width || 400} ${this.config.height || 300}`);
    
    if (this.config.responsive) {
      svg.style.width = '100%';
      svg.style.height = '100%';
    }

    this.container.appendChild(svg);
    this.svg = svg;
    return svg;
  }

  protected createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.config.width || 400;
    canvas.height = this.config.height || 300;
    
    if (this.config.responsive) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }

    this.container.appendChild(canvas);
    this.canvas = canvas;
    return canvas;
  }

  protected applyTheme(): void {
    const isDark = this.config.theme === 'dark';
    
    this.container.style.backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
    this.container.style.color = isDark ? '#ffffff' : '#000000';
    
    if (this.svg) {
      this.svg.style.backgroundColor = isDark ? '#1a1a1a' : '#ffffff';
    }
  }

  protected getScales(): { xScale: any; yScale: any } {
    // This is a simplified scale calculation
    // Real implementation would use D3 scales or similar
    const xValues = this.data.values.map(d => d.x);
    const yValues = this.data.values.map(d => d.y);
    
    const xMin = Math.min(...xValues.map(v => typeof v === 'number' ? v : 0));
    const xMax = Math.max(...xValues.map(v => typeof v === 'number' ? v : 0));
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    const width = (this.config.width || 400) - 80; // Account for margins
    const height = (this.config.height || 300) - 80;
    
    const xScale = (value: any) => {
      if (typeof value === 'number') {
        return ((value - xMin) / (xMax - xMin)) * width + 40;
      }
      return 40; // Default position
    };
    
    const yScale = (value: number) => {
      return height - ((value - yMin) / (yMax - yMin)) * height + 40;
    };
    
    return { xScale, yScale };
  }

  protected drawAxes(): void {
    if (!this.svg) return;
    
    const { xScale, yScale } = this.getScales();
    const width = (this.config.width || 400) - 80;
    const height = (this.config.height || 300) - 80;
    
    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '40');
    xAxis.setAttribute('y1', (height + 40).toString());
    xAxis.setAttribute('x2', (width + 40).toString());
    xAxis.setAttribute('y2', (height + 40).toString());
    xAxis.setAttribute('stroke', this.config.theme === 'dark' ? '#666' : '#ccc');
    xAxis.setAttribute('stroke-width', '1');
    this.svg.appendChild(xAxis);
    
    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '40');
    yAxis.setAttribute('y1', '40');
    yAxis.setAttribute('x2', '40');
    yAxis.setAttribute('y2', (height + 40).toString());
    yAxis.setAttribute('stroke', this.config.theme === 'dark' ? '#666' : '#ccc');
    yAxis.setAttribute('stroke-width', '1');
    this.svg.appendChild(yAxis);
    
    // Add axis labels
    this.addAxisLabels();
  }

  protected addAxisLabels(): void {
    if (!this.svg) return;
    
    const width = (this.config.width || 400) - 80;
    const height = (this.config.height || 300) - 80;
    
    // X-axis label
    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', (width / 2 + 40).toString());
    xLabel.setAttribute('y', (height + 70).toString());
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
    xLabel.textContent = this.data.dimensions.x.label;
    this.svg.appendChild(xLabel);
    
    // Y-axis label
    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.setAttribute('x', '15');
    yLabel.setAttribute('y', (height / 2 + 40).toString());
    yLabel.setAttribute('text-anchor', 'middle');
    yLabel.setAttribute('transform', `rotate(-90, 15, ${height / 2 + 40})`);
    yLabel.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
    yLabel.textContent = this.data.dimensions.y.label;
    this.svg.appendChild(yLabel);
  }

  protected addTitle(): void {
    if (!this.svg || !this.data.metadata?.title) return;
    
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', ((this.config.width || 400) / 2).toString());
    title.setAttribute('y', '25');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '16');
    title.setAttribute('font-weight', 'bold');
    title.setAttribute('fill', this.config.theme === 'dark' ? '#fff' : '#000');
    title.textContent = this.data.metadata.title;
    this.svg.appendChild(title);
  }
}
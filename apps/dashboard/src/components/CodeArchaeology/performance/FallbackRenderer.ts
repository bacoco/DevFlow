import { CodeArtifact } from '../types';

export interface FallbackRenderConfig {
  mode: 'canvas2d' | 'svg' | 'disabled';
  maxArtifacts: number;
  enableAnimations: boolean;
  enableInteractions: boolean;
  simplifiedGeometry: boolean;
  colorScheme: 'full' | 'simplified' | 'monochrome';
}

export interface Canvas2DRenderOptions {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  labelsEnabled: boolean;
  connectionLinesEnabled: boolean;
}

export interface SVGRenderOptions {
  width: number;
  height: number;
  viewBox: string;
  backgroundColor: string;
  enableCSS3D: boolean;
  enableTransitions: boolean;
}

export class FallbackRenderer {
  private config: FallbackRenderConfig;
  private canvas2DRenderer: Canvas2DRenderer | null = null;
  private svgRenderer: SVGRenderer | null = null;

  constructor(config: FallbackRenderConfig) {
    this.config = config;
    this.initializeRenderer();
  }

  /**
   * Initialize the appropriate fallback renderer
   */
  private initializeRenderer(): void {
    switch (this.config.mode) {
      case 'canvas2d':
        this.canvas2DRenderer = new Canvas2DRenderer();
        break;
      case 'svg':
        this.svgRenderer = new SVGRenderer();
        break;
      case 'disabled':
        // No rendering, just show a message
        break;
    }
  }

  /**
   * Render artifacts using the fallback method
   */
  render(
    container: HTMLElement,
    artifacts: CodeArtifact[],
    options: Canvas2DRenderOptions | SVGRenderOptions
  ): void {
    // Clear container
    container.innerHTML = '';

    if (this.config.mode === 'disabled') {
      this.renderDisabledMessage(container);
      return;
    }

    // Limit artifacts for performance
    const limitedArtifacts = artifacts.slice(0, this.config.maxArtifacts);

    switch (this.config.mode) {
      case 'canvas2d':
        if (this.canvas2DRenderer) {
          this.canvas2DRenderer.render(
            container,
            limitedArtifacts,
            options as Canvas2DRenderOptions,
            this.config
          );
        }
        break;
      case 'svg':
        if (this.svgRenderer) {
          this.svgRenderer.render(
            container,
            limitedArtifacts,
            options as SVGRenderOptions,
            this.config
          );
        }
        break;
    }
  }

  /**
   * Render disabled message
   */
  private renderDisabledMessage(container: HTMLElement): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'fallback-disabled-message';
    messageDiv.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: #666;
      ">
        <h3>3D Visualization Unavailable</h3>
        <p>Your device does not support WebGL or has limited graphics capabilities.</p>
        <p>Please try using a different browser or device for the full 3D experience.</p>
        <button onclick="window.location.reload()" style="
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">
          Retry
        </button>
      </div>
    `;
    container.appendChild(messageDiv);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FallbackRenderConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeRenderer();
  }

  /**
   * Get current configuration
   */
  getConfig(): FallbackRenderConfig {
    return { ...this.config };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.canvas2DRenderer?.dispose();
    this.svgRenderer?.dispose();
  }
}

/**
 * Canvas 2D fallback renderer
 */
class Canvas2DRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrame: number | null = null;

  /**
   * Render artifacts using Canvas 2D
   */
  render(
    container: HTMLElement,
    artifacts: CodeArtifact[],
    options: Canvas2DRenderOptions,
    config: FallbackRenderConfig
  ): void {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'pointer';

    this.context = this.canvas.getContext('2d');
    if (!this.context) {
      console.error('Failed to get 2D context');
      return;
    }

    container.appendChild(this.canvas);

    // Add event listeners for interactions
    if (config.enableInteractions) {
      this.addInteractionListeners(artifacts);
    }

    // Start rendering
    this.renderFrame(artifacts, options, config);
  }

  /**
   * Render a single frame
   */
  private renderFrame(
    artifacts: CodeArtifact[],
    options: Canvas2DRenderOptions,
    config: FallbackRenderConfig
  ): void {
    if (!this.context || !this.canvas) return;

    const ctx = this.context;
    const { width, height } = this.canvas;

    // Clear canvas
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid if enabled
    if (options.gridEnabled) {
      this.drawGrid(ctx, width, height);
    }

    // Transform 3D positions to 2D screen coordinates
    const screenArtifacts = artifacts.map(artifact => ({
      ...artifact,
      screenX: (artifact.position3D.x + 50) * (width / 100),
      screenY: (artifact.position3D.z + 50) * (height / 100),
      size: Math.max(4, Math.min(20, artifact.complexity * 2)),
    }));

    // Draw connection lines if enabled
    if (options.connectionLinesEnabled) {
      this.drawConnections(ctx, screenArtifacts);
    }

    // Draw artifacts
    screenArtifacts.forEach(artifact => {
      this.drawArtifact(ctx, artifact, config);
    });

    // Draw labels if enabled
    if (options.labelsEnabled) {
      screenArtifacts.forEach(artifact => {
        this.drawLabel(ctx, artifact);
      });
    }
  }

  /**
   * Draw grid background
   */
  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    const gridSize = 50;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  /**
   * Draw connections between artifacts
   */
  private drawConnections(ctx: CanvasRenderingContext2D, artifacts: any[]): void {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    artifacts.forEach(artifact => {
      artifact.dependencies.forEach((depId: string) => {
        const dependency = artifacts.find(a => a.id === depId);
        if (dependency) {
          ctx.beginPath();
          ctx.moveTo(artifact.screenX, artifact.screenY);
          ctx.lineTo(dependency.screenX, dependency.screenY);
          ctx.stroke();
        }
      });
    });
  }

  /**
   * Draw a single artifact
   */
  private drawArtifact(ctx: CanvasRenderingContext2D, artifact: any, config: FallbackRenderConfig): void {
    const { screenX, screenY, size } = artifact;

    // Choose color based on artifact type and config
    let color = this.getArtifactColor(artifact, config);

    // Draw artifact shape based on type
    ctx.fillStyle = color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    switch (artifact.type) {
      case 'file':
        // Draw rectangle for files
        ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
        ctx.strokeRect(screenX - size/2, screenY - size/2, size, size);
        break;
      case 'class':
        // Draw circle for classes
        ctx.beginPath();
        ctx.arc(screenX, screenY, size/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      case 'function':
        // Draw triangle for functions
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - size/2);
        ctx.lineTo(screenX - size/2, screenY + size/2);
        ctx.lineTo(screenX + size/2, screenY + size/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'interface':
        // Draw diamond for interfaces
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - size/2);
        ctx.lineTo(screenX + size/2, screenY);
        ctx.lineTo(screenX, screenY + size/2);
        ctx.lineTo(screenX - size/2, screenY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }
  }

  /**
   * Get color for artifact based on configuration
   */
  private getArtifactColor(artifact: any, config: FallbackRenderConfig): string {
    switch (config.colorScheme) {
      case 'monochrome':
        return '#666666';
      case 'simplified':
        switch (artifact.type) {
          case 'file': return '#4CAF50';
          case 'class': return '#2196F3';
          case 'function': return '#FF9800';
          case 'interface': return '#9C27B0';
          default: return '#666666';
        }
      case 'full':
      default:
        // Use complexity and change frequency for color
        const hue = (artifact.complexity / 20) * 120; // 0-120 degrees (red to green)
        const saturation = Math.min(100, artifact.changeFrequency * 10);
        return `hsl(${hue}, ${saturation}%, 50%)`;
    }
  }

  /**
   * Draw label for artifact
   */
  private drawLabel(ctx: CanvasRenderingContext2D, artifact: any): void {
    const { screenX, screenY, size } = artifact;
    
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const label = artifact.name.length > 15 ? 
      artifact.name.substring(0, 12) + '...' : 
      artifact.name;
    
    ctx.fillText(label, screenX, screenY + size/2 + 4);
  }

  /**
   * Add interaction listeners
   */
  private addInteractionListeners(artifacts: CodeArtifact[]): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Find clicked artifact (simplified hit detection)
      const clickedArtifact = artifacts.find(artifact => {
        const screenX = (artifact.position3D.x + 50) * (this.canvas!.width / 100);
        const screenY = (artifact.position3D.z + 50) * (this.canvas!.height / 100);
        const size = Math.max(4, Math.min(20, artifact.complexity * 2));
        
        return Math.abs(x - screenX) < size && Math.abs(y - screenY) < size;
      });

      if (clickedArtifact) {
        console.log('Clicked artifact:', clickedArtifact.name);
        // Emit custom event for artifact selection
        const customEvent = new CustomEvent('artifactSelected', { 
          detail: clickedArtifact 
        });
        this.canvas!.dispatchEvent(customEvent);
      }
    });
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas = null;
    this.context = null;
  }
}

/**
 * SVG fallback renderer
 */
class SVGRenderer {
  private svg: SVGSVGElement | null = null;

  /**
   * Render artifacts using SVG
   */
  render(
    container: HTMLElement,
    artifacts: CodeArtifact[],
    options: SVGRenderOptions,
    config: FallbackRenderConfig
  ): void {
    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', options.width.toString());
    this.svg.setAttribute('height', options.height.toString());
    this.svg.setAttribute('viewBox', options.viewBox);
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.backgroundColor = options.backgroundColor;

    container.appendChild(this.svg);

    // Add CSS for transitions if enabled
    if (options.enableTransitions) {
      this.addTransitionStyles();
    }

    // Transform 3D positions to 2D screen coordinates
    const screenArtifacts = artifacts.map(artifact => ({
      ...artifact,
      screenX: (artifact.position3D.x + 50) * (options.width / 100),
      screenY: (artifact.position3D.z + 50) * (options.height / 100),
      size: Math.max(4, Math.min(20, artifact.complexity * 2)),
    }));

    // Draw grid
    this.drawSVGGrid(options);

    // Draw connections
    this.drawSVGConnections(screenArtifacts);

    // Draw artifacts
    screenArtifacts.forEach(artifact => {
      this.drawSVGArtifact(artifact, config);
    });
  }

  /**
   * Add CSS transition styles
   */
  private addTransitionStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .svg-artifact {
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .svg-artifact:hover {
        transform: scale(1.2);
        filter: brightness(1.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Draw SVG grid
   */
  private drawSVGGrid(options: SVGRenderOptions): void {
    if (!this.svg) return;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'grid');
    pattern.setAttribute('width', '50');
    pattern.setAttribute('height', '50');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 50 0 L 0 0 0 50');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#e0e0e0');
    path.setAttribute('stroke-width', '1');

    pattern.appendChild(path);
    defs.appendChild(pattern);
    this.svg.appendChild(defs);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'url(#grid)');
    this.svg.appendChild(rect);
  }

  /**
   * Draw SVG connections
   */
  private drawSVGConnections(artifacts: any[]): void {
    if (!this.svg) return;

    artifacts.forEach(artifact => {
      artifact.dependencies.forEach((depId: string) => {
        const dependency = artifacts.find(a => a.id === depId);
        if (dependency) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', artifact.screenX.toString());
          line.setAttribute('y1', artifact.screenY.toString());
          line.setAttribute('x2', dependency.screenX.toString());
          line.setAttribute('y2', dependency.screenY.toString());
          line.setAttribute('stroke', '#cccccc');
          line.setAttribute('stroke-width', '1');
          this.svg.appendChild(line);
        }
      });
    });
  }

  /**
   * Draw SVG artifact
   */
  private drawSVGArtifact(artifact: any, config: FallbackRenderConfig): void {
    if (!this.svg) return;

    const { screenX, screenY, size } = artifact;
    const color = this.getArtifactColor(artifact, config);

    let element: SVGElement;

    switch (artifact.type) {
      case 'file':
        element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        element.setAttribute('x', (screenX - size/2).toString());
        element.setAttribute('y', (screenY - size/2).toString());
        element.setAttribute('width', size.toString());
        element.setAttribute('height', size.toString());
        break;
      case 'class':
        element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        element.setAttribute('cx', screenX.toString());
        element.setAttribute('cy', screenY.toString());
        element.setAttribute('r', (size/2).toString());
        break;
      case 'function':
        element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = [
          `${screenX},${screenY - size/2}`,
          `${screenX - size/2},${screenY + size/2}`,
          `${screenX + size/2},${screenY + size/2}`
        ].join(' ');
        element.setAttribute('points', points);
        break;
      case 'interface':
      default:
        element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const diamondPoints = [
          `${screenX},${screenY - size/2}`,
          `${screenX + size/2},${screenY}`,
          `${screenX},${screenY + size/2}`,
          `${screenX - size/2},${screenY}`
        ].join(' ');
        element.setAttribute('points', diamondPoints);
        break;
    }

    element.setAttribute('fill', color);
    element.setAttribute('stroke', '#333');
    element.setAttribute('stroke-width', '1');
    element.setAttribute('class', 'svg-artifact');
    element.setAttribute('data-artifact-id', artifact.id);

    // Add click handler
    element.addEventListener('click', () => {
      console.log('Clicked artifact:', artifact.name);
      const customEvent = new CustomEvent('artifactSelected', { 
        detail: artifact 
      });
      this.svg!.dispatchEvent(customEvent);
    });

    this.svg.appendChild(element);

    // Add label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', screenX.toString());
    text.setAttribute('y', (screenY + size/2 + 16).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#333');
    
    const label = artifact.name.length > 15 ? 
      artifact.name.substring(0, 12) + '...' : 
      artifact.name;
    text.textContent = label;
    
    this.svg.appendChild(text);
  }

  /**
   * Get color for artifact based on configuration
   */
  private getArtifactColor(artifact: any, config: FallbackRenderConfig): string {
    switch (config.colorScheme) {
      case 'monochrome':
        return '#666666';
      case 'simplified':
        switch (artifact.type) {
          case 'file': return '#4CAF50';
          case 'class': return '#2196F3';
          case 'function': return '#FF9800';
          case 'interface': return '#9C27B0';
          default: return '#666666';
        }
      case 'full':
      default:
        const hue = (artifact.complexity / 20) * 120;
        const saturation = Math.min(100, artifact.changeFrequency * 10);
        return `hsl(${hue}, ${saturation}%, 50%)`;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.svg = null;
  }
}

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackRenderConfig = {
  mode: 'canvas2d',
  maxArtifacts: 500,
  enableAnimations: false,
  enableInteractions: true,
  simplifiedGeometry: true,
  colorScheme: 'simplified',
};
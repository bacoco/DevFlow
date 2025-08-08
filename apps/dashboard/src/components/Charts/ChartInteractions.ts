import { ChartInstance, BrushSelection, ZoomState, InteractionEvent, LinkedChart } from './types';

export class ChartInteractions {
  private static linkedCharts: Map<string, LinkedChart[]> = new Map();
  private static interactionHistory: Map<string, InteractionEvent[]> = new Map();

  /**
   * Enables zoom functionality on a chart
   */
  public static enableZoom(chart: ChartInstance, config: {
    minZoom?: number;
    maxZoom?: number;
    wheelZoom?: boolean;
    doubleClickZoom?: boolean;
  } = {}): void {
    const { minZoom = 0.1, maxZoom = 10, wheelZoom = true, doubleClickZoom = true } = config;
    const element = chart.element;
    
    let currentZoom: ZoomState = {
      x: [0, 1],
      y: [0, 1],
      scale: 1
    };

    if (wheelZoom) {
      element.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(minZoom, Math.min(maxZoom, currentZoom.scale * zoomFactor));
        
        if (newScale !== currentZoom.scale) {
          currentZoom = this.calculateZoomState(currentZoom, newScale, x, y);
          chart.interactions.zoom(currentZoom);
          
          this.recordInteraction(chart.id, {
            type: 'zoom',
            data: { zoom: currentZoom, pointer: { x, y } },
            timestamp: new Date(),
            target: 'chart'
          });
          
          this.propagateZoom(chart.id, currentZoom);
        }
      });
    }

    if (doubleClickZoom) {
      element.addEventListener('dblclick', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        // Reset zoom or zoom in
        const newScale = currentZoom.scale > 1 ? 1 : 2;
        currentZoom = this.calculateZoomState(currentZoom, newScale, x, y);
        chart.interactions.zoom(currentZoom);
        
        this.recordInteraction(chart.id, {
          type: 'zoom',
          data: { zoom: currentZoom, reset: newScale === 1 },
          timestamp: new Date(),
          target: 'chart'
        });
      });
    }
  }

  /**
   * Enables pan functionality on a chart
   */
  public static enablePan(chart: ChartInstance): void {
    const element = chart.element;
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    let currentPan = { x: 0, y: 0 };

    element.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left mouse button
        isPanning = true;
        startPoint = { x: event.clientX, y: event.clientY };
        element.style.cursor = 'grabbing';
        event.preventDefault();
      }
    });

    element.addEventListener('mousemove', (event) => {
      if (isPanning) {
        const deltaX = event.clientX - startPoint.x;
        const deltaY = event.clientY - startPoint.y;
        
        currentPan = { x: deltaX, y: deltaY };
        chart.interactions.pan(currentPan);
        
        this.recordInteraction(chart.id, {
          type: 'pan',
          data: { delta: currentPan },
          timestamp: new Date(),
          target: 'chart'
        });
      }
    });

    element.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        element.style.cursor = 'default';
      }
    });

    element.addEventListener('mouseleave', () => {
      if (isPanning) {
        isPanning = false;
        element.style.cursor = 'default';
      }
    });

    // Touch support for mobile
    this.addTouchPanSupport(chart, element);
  }

  /**
   * Enables brush selection on a chart
   */
  public static enableBrushing(chart: ChartInstance, callback: (selection: BrushSelection) => void): void {
    const element = chart.element;
    let isBrushing = false;
    let brushStart = { x: 0, y: 0 };
    let brushOverlay: HTMLElement | null = null;

    element.addEventListener('mousedown', (event) => {
      if (event.shiftKey) { // Brush only when shift is held
        isBrushing = true;
        const rect = element.getBoundingClientRect();
        brushStart = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        
        brushOverlay = this.createBrushOverlay(element);
        event.preventDefault();
      }
    });

    element.addEventListener('mousemove', (event) => {
      if (isBrushing && brushOverlay) {
        const rect = element.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        
        this.updateBrushOverlay(brushOverlay, brushStart, { x: currentX, y: currentY });
      }
    });

    element.addEventListener('mouseup', (event) => {
      if (isBrushing && brushOverlay) {
        const rect = element.getBoundingClientRect();
        const endX = event.clientX - rect.left;
        const endY = event.clientY - rect.top;
        
        const selection = this.calculateBrushSelection(
          chart,
          brushStart,
          { x: endX, y: endY },
          rect
        );
        
        callback(selection);
        chart.interactions.brush(selection);
        
        this.recordInteraction(chart.id, {
          type: 'brush',
          data: { selection },
          timestamp: new Date(),
          target: 'chart'
        });
        
        this.propagateBrush(chart.id, selection);
        
        // Clean up
        brushOverlay.remove();
        brushOverlay = null;
        isBrushing = false;
      }
    });
  }

  /**
   * Adds tooltip functionality to charts
   */
  public static addTooltips(chart: ChartInstance, formatter: (data: any) => string): void {
    const element = chart.element;
    let tooltip: HTMLElement | null = null;

    element.addEventListener('mousemove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Find nearest data point (implementation depends on chart type)
      const nearestData = this.findNearestDataPoint(chart, x, y);
      
      if (nearestData) {
        if (!tooltip) {
          tooltip = this.createTooltip();
        }
        
        tooltip.innerHTML = formatter(nearestData);
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY - 10}px`;
        tooltip.style.display = 'block';
        
        chart.interactions.hover(nearestData);
      }
    });

    element.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    });
  }

  /**
   * Links multiple charts for coordinated interactions
   */
  public static linkCharts(charts: ChartInstance[], linkType: 'brush' | 'zoom' | 'filter' | 'highlight'): void {
    const linkId = `link_${Date.now()}`;
    
    const linkedCharts: LinkedChart[] = charts.map(chart => ({
      id: chart.id,
      chart,
      linkType,
      syncedProperties: this.getSyncedProperties(linkType)
    }));
    
    this.linkedCharts.set(linkId, linkedCharts);
    
    // Set up event propagation
    charts.forEach(chart => {
      this.setupLinkEventHandlers(chart, linkId, linkType);
    });
  }

  /**
   * Enables drill-down functionality
   */
  public static enableDrillDown(chart: ChartInstance, drillDownHandler: (data: any) => void): void {
    const element = chart.element;
    
    element.addEventListener('click', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const clickedData = this.findNearestDataPoint(chart, x, y);
      
      if (clickedData && clickedData.metadata?.drillDownAvailable) {
        drillDownHandler(clickedData);
        
        this.recordInteraction(chart.id, {
          type: 'click',
          data: { drillDown: true, data: clickedData },
          timestamp: new Date(),
          target: 'dataPoint'
        });
      }
    });
  }

  private static calculateZoomState(
    currentZoom: ZoomState,
    newScale: number,
    pointerX: number,
    pointerY: number
  ): ZoomState {
    const scaleRatio = newScale / currentZoom.scale;
    
    return {
      x: [
        pointerX - (pointerX - currentZoom.x[0]) * scaleRatio,
        pointerX + (currentZoom.x[1] - pointerX) * scaleRatio
      ],
      y: [
        pointerY - (pointerY - currentZoom.y[0]) * scaleRatio,
        pointerY + (currentZoom.y[1] - pointerY) * scaleRatio
      ],
      scale: newScale
    };
  }

  private static addTouchPanSupport(chart: ChartInstance, element: HTMLElement): void {
    let touchStart = { x: 0, y: 0 };
    let isTouchPanning = false;

    element.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) {
        isTouchPanning = true;
        touchStart = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
        event.preventDefault();
      }
    });

    element.addEventListener('touchmove', (event) => {
      if (isTouchPanning && event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - touchStart.x;
        const deltaY = event.touches[0].clientY - touchStart.y;
        
        chart.interactions.pan({ x: deltaX, y: deltaY });
        event.preventDefault();
      }
    });

    element.addEventListener('touchend', () => {
      isTouchPanning = false;
    });
  }

  private static createBrushOverlay(parent: HTMLElement): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.border = '1px dashed #007acc';
    overlay.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    parent.appendChild(overlay);
    return overlay;
  }

  private static updateBrushOverlay(
    overlay: HTMLElement,
    start: { x: number; y: number },
    current: { x: number; y: number }
  ): void {
    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  }

  private static calculateBrushSelection(
    chart: ChartInstance,
    start: { x: number; y: number },
    end: { x: number; y: number },
    rect: DOMRect
  ): BrushSelection {
    const xMin = Math.min(start.x, end.x) / rect.width;
    const xMax = Math.max(start.x, end.x) / rect.width;
    const yMin = Math.min(start.y, end.y) / rect.height;
    const yMax = Math.max(start.y, end.y) / rect.height;
    
    // Filter data points within selection
    const selectedData = chart.data.values.filter((point, index) => {
      // This is a simplified calculation - real implementation would depend on chart scales
      const pointX = index / chart.data.values.length;
      const pointY = (point.y - Math.min(...chart.data.values.map(d => d.y))) / 
                     (Math.max(...chart.data.values.map(d => d.y)) - Math.min(...chart.data.values.map(d => d.y)));
      
      return pointX >= xMin && pointX <= xMax && pointY >= yMin && pointY <= yMax;
    });
    
    return {
      x: [xMin, xMax],
      y: [yMin, yMax],
      data: selectedData
    };
  }

  private static createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1001';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  private static findNearestDataPoint(chart: ChartInstance, x: number, y: number): any {
    // Simplified implementation - real version would use chart scales
    const rect = chart.element.getBoundingClientRect();
    const relativeX = x / rect.width;
    const index = Math.round(relativeX * (chart.data.values.length - 1));
    return chart.data.values[index];
  }

  private static recordInteraction(chartId: string, interaction: InteractionEvent): void {
    if (!this.interactionHistory.has(chartId)) {
      this.interactionHistory.set(chartId, []);
    }
    
    const history = this.interactionHistory.get(chartId)!;
    history.push(interaction);
    
    // Keep only last 100 interactions
    if (history.length > 100) {
      history.shift();
    }
  }

  private static propagateZoom(chartId: string, zoomState: ZoomState): void {
    this.linkedCharts.forEach(linkedGroup => {
      const sourceChart = linkedGroup.find(lc => lc.id === chartId);
      if (sourceChart && sourceChart.linkType === 'zoom') {
        linkedGroup.forEach(linkedChart => {
          if (linkedChart.id !== chartId) {
            linkedChart.chart.interactions.zoom(zoomState);
          }
        });
      }
    });
  }

  private static propagateBrush(chartId: string, selection: BrushSelection): void {
    this.linkedCharts.forEach(linkedGroup => {
      const sourceChart = linkedGroup.find(lc => lc.id === chartId);
      if (sourceChart && sourceChart.linkType === 'brush') {
        linkedGroup.forEach(linkedChart => {
          if (linkedChart.id !== chartId) {
            linkedChart.chart.interactions.brush(selection);
          }
        });
      }
    });
  }

  private static getSyncedProperties(linkType: string): string[] {
    switch (linkType) {
      case 'zoom':
        return ['xScale', 'yScale'];
      case 'brush':
        return ['selection', 'highlight'];
      case 'filter':
        return ['dataFilter'];
      case 'highlight':
        return ['highlightedData'];
      default:
        return [];
    }
  }

  private static setupLinkEventHandlers(chart: ChartInstance, linkId: string, linkType: string): void {
    // Implementation would set up specific event handlers based on link type
    // This is a placeholder for the actual implementation
  }
}
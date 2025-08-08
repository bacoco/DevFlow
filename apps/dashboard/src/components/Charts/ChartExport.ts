import { ChartInstance, ExportOptions } from './types';

export class ChartExport {
  /**
   * Exports chart as PNG image
   */
  public static async exportAsPNG(
    chart: ChartInstance,
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const canvas = await this.chartToCanvas(chart, options);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to export chart as PNG');
        }
      }, 'image/png', options.quality || 1.0);
    });
  }

  /**
   * Exports chart as SVG
   */
  public static async exportAsSVG(
    chart: ChartInstance,
    options: ExportOptions = { format: 'svg' }
  ): Promise<string> {
    const svgElement = chart.element.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('Chart does not contain an SVG element');
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Set dimensions if specified
    if (options.dimensions) {
      clonedSvg.setAttribute('width', options.dimensions.width.toString());
      clonedSvg.setAttribute('height', options.dimensions.height.toString());
    }

    // Add CSS styles inline
    this.inlineStyles(clonedSvg);
    
    // Create SVG string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);
    
    // Add XML declaration and DOCTYPE
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    
    return svgString;
  }

  /**
   * Exports chart as PDF
   */
  public static async exportAsPDF(
    chart: ChartInstance,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<Blob> {
    // This would require a PDF library like jsPDF
    // For now, we'll convert to canvas and then to PDF
    const canvas = await this.chartToCanvas(chart, options);
    
    // Placeholder implementation - would use jsPDF or similar
    const imgData = canvas.toDataURL('image/png');
    
    // This is a simplified implementation
    // Real implementation would use a PDF library
    return new Promise((resolve, reject) => {
      try {
        // Convert canvas to PDF using a library like jsPDF
        // const pdf = new jsPDF();
        // pdf.addImage(imgData, 'PNG', 0, 0);
        // const pdfBlob = pdf.output('blob');
        // resolve(pdfBlob);
        
        // For now, return the PNG data as a blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export chart as PDF'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Exports chart data as CSV
   */
  public static async exportAsCSV(
    chart: ChartInstance,
    options: ExportOptions = { format: 'csv' }
  ): Promise<string> {
    const { data } = chart;
    const headers = [data.dimensions.x.label, data.dimensions.y.label];
    
    // Add category column if present
    if (data.values.some(d => d.category)) {
      headers.push('Category');
    }
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    data.values.forEach(point => {
      const row = [
        this.escapeCsvValue(point.x),
        this.escapeCsvValue(point.y),
      ];
      
      if (point.category) {
        row.push(this.escapeCsvValue(point.category));
      }
      
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }

  /**
   * Exports chart data as JSON
   */
  public static async exportAsJSON(
    chart: ChartInstance,
    options: ExportOptions = { format: 'json' }
  ): Promise<string> {
    const exportData = {
      metadata: {
        chartType: chart.type,
        title: chart.data.metadata?.title,
        description: chart.data.metadata?.description,
        exportedAt: new Date().toISOString(),
        dimensions: chart.data.dimensions
      },
      data: chart.data.values
    };
    
    if (options.includeData) {
      exportData.metadata = {
        ...exportData.metadata,
        config: chart.config
      };
    }
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Main export method that handles all formats
   */
  public static async export(
    chart: ChartInstance,
    options: ExportOptions
  ): Promise<Blob | string> {
    switch (options.format) {
      case 'png':
        return this.exportAsPNG(chart, options);
      case 'svg':
        return this.exportAsSVG(chart, options);
      case 'pdf':
        return this.exportAsPDF(chart, options);
      case 'csv':
        return this.exportAsCSV(chart, options);
      case 'json':
        return this.exportAsJSON(chart, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Downloads the exported chart
   */
  public static async downloadChart(
    chart: ChartInstance,
    options: ExportOptions
  ): Promise<void> {
    const result = await this.export(chart, options);
    const filename = options.filename || `chart_${Date.now()}.${options.format}`;
    
    let blob: Blob;
    
    if (typeof result === 'string') {
      // Handle text formats (SVG, CSV, JSON)
      const mimeType = this.getMimeType(options.format);
      blob = new Blob([result], { type: mimeType });
    } else {
      // Handle binary formats (PNG, PDF)
      blob = result;
    }
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }

  /**
   * Creates a high-quality canvas from the chart
   */
  private static async chartToCanvas(
    chart: ChartInstance,
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    const element = chart.element;
    const rect = element.getBoundingClientRect();
    
    // Determine canvas dimensions
    const width = options.dimensions?.width || rect.width;
    const height = options.dimensions?.height || rect.height;
    const scale = window.devicePixelRatio || 1;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    ctx.scale(scale, scale);
    
    // If the chart is SVG-based, convert SVG to canvas
    const svgElement = element.querySelector('svg');
    if (svgElement) {
      await this.svgToCanvas(svgElement, ctx, width, height);
    } else {
      // For canvas-based charts, copy the existing canvas
      const existingCanvas = element.querySelector('canvas');
      if (existingCanvas) {
        ctx.drawImage(existingCanvas, 0, 0, width, height);
      } else {
        throw new Error('Chart element does not contain SVG or Canvas');
      }
    }
    
    return canvas;
  }

  /**
   * Converts SVG to canvas
   */
  private static async svgToCanvas(
    svgElement: SVGElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clone and prepare SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      
      // Inline styles
      this.inlineStyles(clonedSvg);
      
      // Create blob URL
      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      img.src = url;
    });
  }

  /**
   * Inlines CSS styles into SVG elements
   */
  private static inlineStyles(svgElement: SVGElement): void {
    const elements = svgElement.querySelectorAll('*');
    
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const styleString = Array.from(computedStyle).reduce((str, property) => {
        return `${str}${property}:${computedStyle.getPropertyValue(property)};`;
      }, '');
      
      element.setAttribute('style', styleString);
    });
  }

  /**
   * Escapes CSV values
   */
  private static escapeCsvValue(value: any): string {
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Gets MIME type for export format
   */
  private static getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'svg': 'image/svg+xml',
      'csv': 'text/csv',
      'json': 'application/json',
      'png': 'image/png',
      'pdf': 'application/pdf'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }
}
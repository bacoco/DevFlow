export interface ChartData {
  id: string;
  values: Array<{
    x: number | string | Date;
    y: number;
    category?: string;
    metadata?: Record<string, any>;
  }>;
  dimensions: {
    x: {
      type: 'numeric' | 'categorical' | 'temporal';
      label: string;
      format?: string;
    };
    y: {
      type: 'numeric';
      label: string;
      format?: string;
    };
  };
  metadata?: {
    title?: string;
    description?: string;
    source?: string;
  };
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'scatter' 
  | 'area' 
  | 'heatmap' 
  | 'histogram' 
  | 'box' 
  | 'pie' 
  | 'treemap';

export interface ChartConfig {
  type: ChartType;
  width?: number;
  height?: number;
  responsive?: boolean;
  theme?: 'light' | 'dark';
  accessibility?: {
    enabled: boolean;
    altText?: string;
    dataTable?: boolean;
    keyboardNavigation?: boolean;
  };
  interactions?: {
    zoom?: boolean;
    pan?: boolean;
    brush?: boolean;
    tooltip?: boolean;
    drillDown?: boolean;
  };
  export?: {
    enabled: boolean;
    formats: Array<'png' | 'svg' | 'pdf' | 'csv' | 'json'>;
  };
}

export interface ChartSuggestion {
  type: ChartType;
  confidence: number;
  reasoning: string;
  suitability: {
    dataSize: number;
    complexity: number;
    readability: number;
  };
}

export interface InteractionEvent {
  type: 'zoom' | 'pan' | 'brush' | 'hover' | 'click' | 'keydown';
  data: any;
  timestamp: Date;
  target: string;
}

export interface BrushSelection {
  x: [number, number];
  y?: [number, number];
  data: ChartData['values'];
}

export interface ZoomState {
  x: [number, number];
  y: [number, number];
  scale: number;
}

export interface ChartAccessibilityInfo {
  altText: string;
  dataTable: {
    headers: string[];
    rows: string[][];
  };
  summary: string;
  trends: string[];
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv' | 'json';
  quality?: number;
  dimensions?: { width: number; height: number };
  includeData?: boolean;
  filename?: string;
}

export interface LinkedChart {
  id: string;
  chart: any;
  linkType: 'brush' | 'zoom' | 'filter' | 'highlight';
  syncedProperties: string[];
}

export interface ChartInstance {
  id: string;
  type: ChartType;
  data: ChartData;
  config: ChartConfig;
  element: HTMLElement;
  interactions: {
    zoom: (state: ZoomState) => void;
    pan: (delta: { x: number; y: number }) => void;
    brush: (selection: BrushSelection) => void;
    hover: (data: any) => void;
    click: (data: any) => void;
  };
  accessibility: ChartAccessibilityInfo;
  export: (options: ExportOptions) => Promise<Blob | string>;
  destroy: () => void;
}
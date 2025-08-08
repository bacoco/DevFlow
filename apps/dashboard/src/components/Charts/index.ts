// Main exports
export { Chart as default } from './Chart';
export { Chart } from './Chart';
export { ChartSuggestionPanel } from './ChartSuggestionPanel';
export { LinkedChartsManager } from './LinkedChartsManager';

// Core classes and utilities
export { ChartFactory, chartFactory } from './ChartFactory';
export { ChartAccessibility } from './ChartAccessibility';
export { ChartInteractions } from './ChartInteractions';
export { ChartExport } from './ChartExport';

// Chart implementations
export { BaseChart } from './implementations/BaseChart';
export { LineChart } from './implementations/LineChart';
export { BarChart } from './implementations/BarChart';
export { ScatterChart } from './implementations/ScatterChart';
export { AreaChart } from './implementations/AreaChart';
export { HeatmapChart } from './implementations/HeatmapChart';

// Types
export type {
  ChartData,
  ChartType,
  ChartConfig,
  ChartSuggestion,
  ChartInstance,
  ChartAccessibilityInfo,
  ExportOptions,
  BrushSelection,
  ZoomState,
  InteractionEvent,
  LinkedChart
} from './types';
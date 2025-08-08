export type ExportFormat = 'csv' | 'json' | 'pdf' | 'png';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  name: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  dataType: 'dashboard' | 'tasks' | 'analytics' | 'chart' | 'widget';
  dataId?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  customFields?: string[];
}

export interface ExportOptions {
  format: ExportFormat;
  name?: string;
  metadata: ExportMetadata;
  async?: boolean;
  notify?: boolean;
  schedule?: ExportSchedule;
}

export interface ExportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone: string;
  enabled: boolean;
  recipients?: string[];
}

export interface ExportProgress {
  jobId: string;
  progress: number;
  status: ExportStatus;
  message?: string;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  jobId: string;
  downloadUrl?: string;
  error?: string;
  metadata: {
    fileSize: number;
    recordCount: number;
    format: ExportFormat;
    generatedAt: Date;
  };
}

export interface CSVExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  encoding?: 'utf-8' | 'utf-16';
}

export interface PDFExportOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'letter';
  includeCharts?: boolean;
  includeMetadata?: boolean;
}

export interface PNGExportOptions {
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
}

export interface JSONExportOptions {
  pretty?: boolean;
  includeSchema?: boolean;
}

// Dashboard Sharing Types
export type SharePermission = 'view' | 'comment' | 'edit';

export interface ShareLink {
  id: string;
  url: string;
  token: string;
  dashboardId: string;
  permission: SharePermission;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  allowedEmails?: string[];
  requireAuth?: boolean;
  password?: string;
  viewCount: number;
  lastAccessedAt?: Date;
}

export interface ShareOptions {
  permission: SharePermission;
  expiresIn?: number; // Duration in milliseconds
  allowedEmails?: string[];
  requireAuth?: boolean;
  password?: string;
  allowDownload?: boolean;
  allowPrint?: boolean;
  watermark?: boolean;
}

export interface EmbedOptions {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark' | 'auto';
  showHeader?: boolean;
  showFooter?: boolean;
  allowInteraction?: boolean;
  autoRefresh?: number; // Refresh interval in seconds
  filters?: Record<string, any>;
}

export interface ShareAnalytics {
  linkId: string;
  totalViews: number;
  uniqueViewers: number;
  viewsByDate: Record<string, number>;
  viewerLocations: Record<string, number>;
  averageViewDuration: number;
  lastViewedAt?: Date;
}

export interface ShareNotification {
  id: string;
  linkId: string;
  type: 'access' | 'expired' | 'limit_reached';
  message: string;
  createdAt: Date;
  read: boolean;
}
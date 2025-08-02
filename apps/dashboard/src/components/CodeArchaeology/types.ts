import { Vector3 } from 'three';

export interface CodeArtifact {
  id: string;
  filePath: string;
  type: 'file' | 'function' | 'class' | 'interface';
  name: string;
  position3D: Vector3;
  complexity: number;
  changeFrequency: number;
  lastModified: Date;
  authors: string[];
  dependencies: string[];
  size?: number;
  color?: string;
}

export interface VisualizationConfig {
  showDependencies: boolean;
  showComplexity: boolean;
  showChangeFrequency: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filterByType?: ('file' | 'function' | 'class' | 'interface')[];
  filterByAuthor?: string[];
}

export interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
}

export interface Scene3DProps {
  artifacts: CodeArtifact[];
  config: VisualizationConfig;
  onArtifactSelect?: (artifact: CodeArtifact) => void;
  onCameraChange?: (state: CameraState) => void;
}

export interface CodeArtifact3DProps {
  artifact: CodeArtifact;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: (artifact: CodeArtifact) => void;
  onHover?: (artifact: CodeArtifact | null) => void;
}

export interface CameraControlsProps {
  onReset?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onPan?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

// Traceability types
export interface TraceabilityLink {
  id: string;
  requirementId: string;
  specFile: string;
  codeArtifacts: string[];
  linkType: 'implements' | 'tests' | 'documents';
  confidence: number;
  taskReferences: RequirementReference[];
}

export interface RequirementReference {
  requirementId: string;
  taskId: string;
  taskDescription: string;
  confidence: number;
}

export interface TraceabilityMatrix {
  requirementId: string;
  hookName?: string;
  testCase?: string;
  codeArtifacts: string[];
  coverage: number;
}

export interface RequirementNode {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  specFile: string;
  position3D: Vector3;
  coverage: number;
  linkedArtifacts: string[];
}

export interface TraceabilityConnection {
  id: string;
  fromId: string; // requirement ID
  toId: string; // artifact ID
  linkType: 'implements' | 'tests' | 'documents';
  confidence: number;
  isHighlighted: boolean;
  isSelected: boolean;
}

export interface TraceabilityVisualizationConfig extends VisualizationConfig {
  showTraceabilityLinks: boolean;
  showRequirements: boolean;
  showCoverageMetrics: boolean;
  confidenceThreshold: number;
  linkTypeFilter?: ('implements' | 'tests' | 'documents')[];
  highlightGaps: boolean;
  highlightOrphans: boolean;
}

export interface CoverageAnalysis {
  totalRequirements: number;
  linkedRequirements: number;
  coveragePercentage: number;
  gapAnalysis: string[];
  orphanedArtifacts: string[];
}

// Collaborative exploration types
export interface CollaborativeSession {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  participants: SessionParticipant[];
  currentView: SharedView;
  annotations: Annotation3D[];
  isActive: boolean;
  permissions: SessionPermissions;
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  role: 'owner' | 'moderator' | 'viewer';
  joinedAt: Date;
  isActive: boolean;
  cursor3D?: Vector3;
  selectedArtifacts: string[];
}

export interface SharedView {
  id: string;
  name: string;
  cameraState: CameraState;
  visualizationConfig: VisualizationConfig;
  selectedArtifacts: string[];
  highlightedArtifacts: string[];
  annotations: string[];
  timestamp: Date;
  createdBy: string;
}

export interface Annotation3D {
  id: string;
  position: Vector3;
  type: 'note' | 'highlight' | 'question' | 'issue' | 'suggestion';
  title: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  attachedArtifacts: string[];
  isVisible: boolean;
  color: string;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SessionPermissions {
  canAnnotate: boolean;
  canModifyView: boolean;
  canInviteUsers: boolean;
  canManageAnnotations: boolean;
  canExportSession: boolean;
}

export interface ViewBookmark {
  id: string;
  name: string;
  description?: string;
  view: SharedView;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

export interface CollaborativeEvent {
  type: 'user_joined' | 'user_left' | 'view_changed' | 'annotation_added' | 'annotation_updated' | 'annotation_deleted' | 'cursor_moved' | 'artifact_selected';
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: any;
}

export interface CursorIndicator {
  userId: string;
  userName: string;
  position: Vector3;
  color: string;
  isVisible: boolean;
  lastUpdate: Date;
}
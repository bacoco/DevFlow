import { Vector3 } from 'three';
import {
  CollaborativeSession,
  SessionParticipant,
  SharedView,
  Annotation3D,
  AnnotationReply,
  ViewBookmark,
  CollaborativeEvent,
  CursorIndicator,
  SessionPermissions,
  CameraState,
  VisualizationConfig
} from './types';

export class CollaborativeSessionService {
  private sessions: Map<string, CollaborativeSession> = new Map();
  private bookmarks: Map<string, ViewBookmark> = new Map();
  private eventListeners: Map<string, ((event: CollaborativeEvent) => void)[]> = new Map();
  private websocket: WebSocket | null = null;
  private currentUserId: string = '';
  private currentUserName: string = '';

  constructor(websocketUrl?: string) {
    if (websocketUrl) {
      this.initializeWebSocket(websocketUrl);
    }
    this.loadBookmarksFromStorage();
  }

  // WebSocket connection management
  private initializeWebSocket(url: string): void {
    try {
      this.websocket = new WebSocket(url);
      
      this.websocket.onopen = () => {
        console.log('Collaborative session WebSocket connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const collaborativeEvent: CollaborativeEvent = JSON.parse(event.data);
          this.handleRemoteEvent(collaborativeEvent);
        } catch (error) {
          console.error('Error parsing collaborative event:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Collaborative session WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.initializeWebSocket(url), 3000);
      };

      this.websocket.onerror = (error) => {
        console.error('Collaborative session WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  // Session management
  async createSession(name: string, initialView: SharedView): Promise<CollaborativeSession> {
    const sessionId = this.generateId();
    const session: CollaborativeSession = {
      id: sessionId,
      name,
      createdBy: this.currentUserId,
      createdAt: new Date(),
      participants: [{
        userId: this.currentUserId,
        userName: this.currentUserName,
        role: 'owner',
        joinedAt: new Date(),
        isActive: true,
        selectedArtifacts: []
      }],
      currentView: initialView,
      annotations: [],
      isActive: true,
      permissions: {
        canAnnotate: true,
        canModifyView: true,
        canInviteUsers: true,
        canManageAnnotations: true,
        canExportSession: true
      }
    };

    this.sessions.set(sessionId, session);
    this.broadcastEvent({
      type: 'user_joined',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { participant: session.participants[0] }
    });

    return session;
  }

  async joinSession(sessionId: string): Promise<CollaborativeSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return null;
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(p => p.userId === this.currentUserId);
    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    } else {
      const newParticipant: SessionParticipant = {
        userId: this.currentUserId,
        userName: this.currentUserName,
        role: 'viewer',
        joinedAt: new Date(),
        isActive: true,
        selectedArtifacts: []
      };
      session.participants.push(newParticipant);
    }

    this.broadcastEvent({
      type: 'user_joined',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { participant: session.participants.find(p => p.userId === this.currentUserId) }
    });

    return session;
  }

  async leaveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === this.currentUserId);
    if (participant) {
      participant.isActive = false;
    }

    this.broadcastEvent({
      type: 'user_left',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: {}
    });

    // Remove inactive participants after 5 minutes
    setTimeout(() => {
      const updatedSession = this.sessions.get(sessionId);
      if (updatedSession) {
        updatedSession.participants = updatedSession.participants.filter(
          p => p.isActive || (Date.now() - p.joinedAt.getTime()) < 5 * 60 * 1000
        );
      }
    }, 5 * 60 * 1000);
  }

  // View synchronization
  async updateSharedView(sessionId: string, view: SharedView): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === this.currentUserId);
    if (!participant || !session.permissions.canModifyView) return;

    session.currentView = { ...view, timestamp: new Date(), createdBy: this.currentUserId };

    this.broadcastEvent({
      type: 'view_changed',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { view: session.currentView }
    });
  }

  async updateCursor(sessionId: string, position: Vector3): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === this.currentUserId);
    if (!participant) return;

    participant.cursor3D = position;

    this.broadcastEvent({
      type: 'cursor_moved',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { position }
    });
  }

  async selectArtifacts(sessionId: string, artifactIds: string[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === this.currentUserId);
    if (!participant) return;

    participant.selectedArtifacts = artifactIds;

    this.broadcastEvent({
      type: 'artifact_selected',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { artifactIds }
    });
  }

  // Annotation management
  async addAnnotation(sessionId: string, annotation: Omit<Annotation3D, 'id' | 'createdBy' | 'createdAt' | 'replies'>): Promise<Annotation3D> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.permissions.canAnnotate) {
      throw new Error('Cannot add annotation to this session');
    }

    const newAnnotation: Annotation3D = {
      ...annotation,
      id: this.generateId(),
      createdBy: this.currentUserId,
      createdAt: new Date(),
      replies: []
    };

    session.annotations.push(newAnnotation);

    this.broadcastEvent({
      type: 'annotation_added',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { annotation: newAnnotation }
    });

    return newAnnotation;
  }

  async updateAnnotation(sessionId: string, annotationId: string, updates: Partial<Annotation3D>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const annotation = session.annotations.find(a => a.id === annotationId);
    if (!annotation) return;

    // Check permissions
    const canEdit = annotation.createdBy === this.currentUserId || session.permissions.canManageAnnotations;
    if (!canEdit) return;

    Object.assign(annotation, updates, { updatedAt: new Date() });

    this.broadcastEvent({
      type: 'annotation_updated',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { annotationId, updates }
    });
  }

  async deleteAnnotation(sessionId: string, annotationId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const annotationIndex = session.annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex === -1) return;

    const annotation = session.annotations[annotationIndex];
    const canDelete = annotation.createdBy === this.currentUserId || session.permissions.canManageAnnotations;
    if (!canDelete) return;

    session.annotations.splice(annotationIndex, 1);

    this.broadcastEvent({
      type: 'annotation_deleted',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { annotationId }
    });
  }

  async addAnnotationReply(sessionId: string, annotationId: string, content: string): Promise<AnnotationReply> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.permissions.canAnnotate) {
      throw new Error('Cannot add reply to this session');
    }

    const annotation = session.annotations.find(a => a.id === annotationId);
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    const reply: AnnotationReply = {
      id: this.generateId(),
      content,
      createdBy: this.currentUserId,
      createdAt: new Date()
    };

    annotation.replies.push(reply);

    this.broadcastEvent({
      type: 'annotation_updated',
      sessionId,
      userId: this.currentUserId,
      timestamp: new Date(),
      data: { annotationId, updates: { replies: annotation.replies } }
    });

    return reply;
  }

  // Bookmark management
  async saveBookmark(bookmark: Omit<ViewBookmark, 'id' | 'createdBy' | 'createdAt' | 'usageCount' | 'lastUsed'>): Promise<ViewBookmark> {
    const newBookmark: ViewBookmark = {
      ...bookmark,
      id: this.generateId(),
      createdBy: this.currentUserId,
      createdAt: new Date(),
      usageCount: 0
    };

    this.bookmarks.set(newBookmark.id, newBookmark);
    this.saveBookmarksToStorage();

    return newBookmark;
  }

  async loadBookmark(bookmarkId: string): Promise<ViewBookmark | null> {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return null;

    // Update usage statistics
    bookmark.usageCount++;
    bookmark.lastUsed = new Date();
    this.saveBookmarksToStorage();

    return bookmark;
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.createdBy !== this.currentUserId) return;

    this.bookmarks.delete(bookmarkId);
    this.saveBookmarksToStorage();
  }

  getBookmarks(isPublic?: boolean): ViewBookmark[] {
    const allBookmarks = Array.from(this.bookmarks.values());
    if (isPublic === undefined) {
      return allBookmarks.filter(b => b.createdBy === this.currentUserId || b.isPublic);
    }
    return allBookmarks.filter(b => b.isPublic === isPublic && (b.createdBy === this.currentUserId || isPublic));
  }

  // Event handling
  addEventListener(sessionId: string, callback: (event: CollaborativeEvent) => void): void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, []);
    }
    this.eventListeners.get(sessionId)!.push(callback);
  }

  removeEventListener(sessionId: string, callback: (event: CollaborativeEvent) => void): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private handleRemoteEvent(event: CollaborativeEvent): void {
    // Don't process our own events
    if (event.userId === this.currentUserId) return;

    const session = this.sessions.get(event.sessionId);
    if (!session) return;

    switch (event.type) {
      case 'user_joined':
        const existingParticipant = session.participants.find(p => p.userId === event.userId);
        if (!existingParticipant) {
          session.participants.push(event.data.participant);
        } else {
          existingParticipant.isActive = true;
          existingParticipant.joinedAt = new Date();
        }
        break;

      case 'user_left':
        const participant = session.participants.find(p => p.userId === event.userId);
        if (participant) {
          participant.isActive = false;
        }
        break;

      case 'view_changed':
        session.currentView = event.data.view;
        break;

      case 'cursor_moved':
        const cursorParticipant = session.participants.find(p => p.userId === event.userId);
        if (cursorParticipant) {
          cursorParticipant.cursor3D = event.data.position;
        }
        break;

      case 'artifact_selected':
        const selectParticipant = session.participants.find(p => p.userId === event.userId);
        if (selectParticipant) {
          selectParticipant.selectedArtifacts = event.data.artifactIds;
        }
        break;

      case 'annotation_added':
        session.annotations.push(event.data.annotation);
        break;

      case 'annotation_updated':
        const annotation = session.annotations.find(a => a.id === event.data.annotationId);
        if (annotation) {
          Object.assign(annotation, event.data.updates);
        }
        break;

      case 'annotation_deleted':
        const annotationIndex = session.annotations.findIndex(a => a.id === event.data.annotationId);
        if (annotationIndex > -1) {
          session.annotations.splice(annotationIndex, 1);
        }
        break;
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event.sessionId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private broadcastEvent(event: CollaborativeEvent): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(event));
    }

    // Also notify local listeners
    const listeners = this.eventListeners.get(event.sessionId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveBookmarksToStorage(): void {
    try {
      const bookmarksArray = Array.from(this.bookmarks.entries());
      localStorage.setItem('codeArchaeology_bookmarks', JSON.stringify(bookmarksArray));
    } catch (error) {
      console.error('Failed to save bookmarks to storage:', error);
    }
  }

  private loadBookmarksFromStorage(): void {
    try {
      const stored = localStorage.getItem('codeArchaeology_bookmarks');
      if (stored) {
        const bookmarksArray = JSON.parse(stored);
        this.bookmarks = new Map(bookmarksArray);
      }
    } catch (error) {
      console.error('Failed to load bookmarks from storage:', error);
    }
  }

  // Getters
  getSession(sessionId: string): CollaborativeSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getActiveSessions(): CollaborativeSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  getCurrentUser(): { id: string; name: string } {
    return { id: this.currentUserId, name: this.currentUserName };
  }

  setCurrentUser(userId: string, userName: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
  }

  getCursorIndicators(sessionId: string): CursorIndicator[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.participants
      .filter(p => p.isActive && p.userId !== this.currentUserId && p.cursor3D)
      .map(p => ({
        userId: p.userId,
        userName: p.userName,
        position: p.cursor3D!,
        color: this.getUserColor(p.userId),
        isVisible: true,
        lastUpdate: new Date()
      }));
  }

  private getUserColor(userId: string): string {
    // Generate consistent color for user based on their ID
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }
}

// Singleton instance
export const collaborativeSessionService = new CollaborativeSessionService();
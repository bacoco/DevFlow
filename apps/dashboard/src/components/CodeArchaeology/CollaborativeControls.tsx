import React, { useState, useEffect, useCallback } from 'react';
import { Vector3 } from 'three';
import { collaborativeSessionService } from './CollaborativeSessionService';
import {
  CollaborativeSession,
  SessionParticipant,
  SharedView,
  Annotation3D,
  ViewBookmark,
  CursorIndicator,
  CollaborativeEvent
} from './types';

interface CollaborativeControlsProps {
  currentView: SharedView;
  onViewChange: (view: SharedView) => void;
  onAnnotationAdd: (annotation: Omit<Annotation3D, 'id' | 'createdBy' | 'createdAt' | 'replies'>) => void;
  onCursorMove: (position: Vector3) => void;
  onArtifactSelect: (artifactIds: string[]) => void;
  selectedArtifacts: string[];
  className?: string;
}

const CollaborativeControls: React.FC<CollaborativeControlsProps> = ({
  currentView,
  onViewChange,
  onAnnotationAdd,
  onCursorMove,
  onArtifactSelect,
  selectedArtifacts,
  className = '',
}) => {
  // State management
  const [currentSession, setCurrentSession] = useState<CollaborativeSession | null>(null);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  const [isBookmarkPanelOpen, setIsBookmarkPanelOpen] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<CollaborativeSession[]>([]);
  const [bookmarks, setBookmarks] = useState<ViewBookmark[]>([]);
  const [cursorIndicators, setCursorIndicators] = useState<CursorIndicator[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [sessionInviteCode, setSessionInviteCode] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Initialize collaborative service
  useEffect(() => {
    // Set current user (in real app, this would come from auth context)
    collaborativeSessionService.setCurrentUser('current-user-id', 'Current User');
    
    // Load available sessions and bookmarks
    loadAvailableSessions();
    loadBookmarks();
    
    // Set up connection status monitoring
    setConnectionStatus('connected'); // Mock connection status
  }, []);

  // Handle collaborative events
  useEffect(() => {
    if (currentSession) {
      const handleCollaborativeEvent = (event: CollaborativeEvent) => {
        switch (event.type) {
          case 'view_changed':
            onViewChange(event.data.view);
            break;
          case 'cursor_moved':
            updateCursorIndicators();
            break;
          case 'artifact_selected':
            // Update UI to show other users' selections
            break;
          case 'user_joined':
          case 'user_left':
            // Update participant list
            setCurrentSession(prev => prev ? { ...prev } : null);
            break;
        }
      };

      collaborativeSessionService.addEventListener(currentSession.id, handleCollaborativeEvent);
      
      return () => {
        collaborativeSessionService.removeEventListener(currentSession.id, handleCollaborativeEvent);
      };
    }
  }, [currentSession, onViewChange]);

  // Update cursor indicators
  const updateCursorIndicators = useCallback(() => {
    if (currentSession) {
      const indicators = collaborativeSessionService.getCursorIndicators(currentSession.id);
      setCursorIndicators(indicators);
    }
  }, [currentSession]);

  // Load available sessions
  const loadAvailableSessions = useCallback(async () => {
    const sessions = collaborativeSessionService.getActiveSessions();
    setAvailableSessions(sessions);
  }, []);

  // Load bookmarks
  const loadBookmarks = useCallback(() => {
    const userBookmarks = collaborativeSessionService.getBookmarks();
    setBookmarks(userBookmarks);
  }, []);

  // Session management
  const handleCreateSession = useCallback(async () => {
    if (!newSessionName.trim()) return;

    setIsCreatingSession(true);
    try {
      const session = await collaborativeSessionService.createSession(newSessionName.trim(), currentView);
      setCurrentSession(session);
      setNewSessionName('');
      setIsSessionPanelOpen(false);
      loadAvailableSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  }, [newSessionName, currentView]);

  const handleJoinSession = useCallback(async (sessionId: string) => {
    try {
      const session = await collaborativeSessionService.joinSession(sessionId);
      if (session) {
        setCurrentSession(session);
        setIsSessionPanelOpen(false);
        // Sync to session's current view
        onViewChange(session.currentView);
      }
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  }, [onViewChange]);

  const handleJoinByCode = useCallback(async () => {
    if (!sessionInviteCode.trim()) return;
    
    try {
      await handleJoinSession(sessionInviteCode.trim());
      setSessionInviteCode('');
    } catch (error) {
      console.error('Failed to join session by code:', error);
    }
  }, [sessionInviteCode, handleJoinSession]);

  const handleLeaveSession = useCallback(async () => {
    if (currentSession) {
      await collaborativeSessionService.leaveSession(currentSession.id);
      setCurrentSession(null);
      setCursorIndicators([]);
      loadAvailableSessions();
    }
  }, [currentSession]);

  // View synchronization
  const handleShareView = useCallback(async () => {
    if (currentSession) {
      await collaborativeSessionService.updateSharedView(currentSession.id, currentView);
    }
  }, [currentSession, currentView]);

  // Bookmark management
  const handleSaveBookmark = useCallback(async () => {
    if (!newBookmarkName.trim()) return;

    try {
      await collaborativeSessionService.saveBookmark({
        name: newBookmarkName.trim(),
        view: currentView,
        description: `Saved view: ${newBookmarkName}`,
        tags: [],
        isPublic: false
      });
      setNewBookmarkName('');
      setIsBookmarkPanelOpen(false);
      loadBookmarks();
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  }, [newBookmarkName, currentView]);

  const handleLoadBookmark = useCallback(async (bookmarkId: string) => {
    try {
      const bookmark = await collaborativeSessionService.loadBookmark(bookmarkId);
      if (bookmark) {
        onViewChange(bookmark.view);
        setIsBookmarkPanelOpen(false);
      }
    } catch (error) {
      console.error('Failed to load bookmark:', error);
    }
  }, [onViewChange]);

  const handleDeleteBookmark = useCallback(async (bookmarkId: string) => {
    try {
      await collaborativeSessionService.deleteBookmark(bookmarkId);
      loadBookmarks();
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  }, []);

  // Annotation creation
  const handleCreateAnnotation = useCallback((type: Annotation3D['type'], position: Vector3) => {
    const title = prompt(`Enter ${type} title:`);
    const content = prompt(`Enter ${type} content:`);
    
    if (title && content) {
      onAnnotationAdd({
        type,
        title: title.trim(),
        content: content.trim(),
        position,
        color: getAnnotationColor(type),
        isVisible: true
      });
    }
  }, [onAnnotationAdd]);

  const getAnnotationColor = (type: Annotation3D['type']): string => {
    switch (type) {
      case 'note': return '#3B82F6';
      case 'highlight': return '#F59E0B';
      case 'question': return '#8B5CF6';
      case 'issue': return '#EF4444';
      case 'suggestion': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Handle cursor movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (currentSession) {
        // Convert mouse position to 3D coordinates (simplified)
        const position = new Vector3(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
          0
        );
        collaborativeSessionService.updateCursor(currentSession.id, position);
        onCursorMove(position);
      }
    };

    if (currentSession) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [currentSession, onCursorMove]);

  // Handle artifact selection
  useEffect(() => {
    if (currentSession) {
      collaborativeSessionService.selectArtifacts(currentSession.id, selectedArtifacts);
    }
  }, [currentSession, selectedArtifacts]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className={`collaborative-controls ${className}`}>
      {/* Main Control Bar */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          {/* Session Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{getConnectionStatusIcon()}</span>
              <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>

            {currentSession && (
              <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
                <span className="text-sm text-gray-600">Session:</span>
                <span className="text-sm font-medium text-gray-800">{currentSession.name}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                  {currentSession.participants.filter(p => p.isActive).length} active
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Bookmark Controls */}
            <button
              onClick={() => setIsBookmarkPanelOpen(!isBookmarkPanelOpen)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Manage bookmarks"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            {/* Session Controls */}
            <button
              onClick={() => setIsSessionPanelOpen(!isSessionPanelOpen)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Manage sessions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* Share View Button */}
            {currentSession && (
              <button
                onClick={handleShareView}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="Share current view with session"
              >
                Share View
              </button>
            )}

            {/* Leave Session Button */}
            {currentSession && (
              <button
                onClick={handleLeaveSession}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                title="Leave current session"
              >
                Leave
              </button>
            )}
          </div>
        </div>

        {/* Participants Bar */}
        {currentSession && currentSession.participants.filter(p => p.isActive).length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Participants:</span>
              <div className="flex items-center space-x-2">
                {currentSession.participants.filter(p => p.isActive).map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: collaborativeSessionService.getUserColor?.(participant.userId) || '#6B7280' }}
                    />
                    <span className="text-xs text-gray-700">{participant.userName}</span>
                    {participant.role === 'owner' && (
                      <span className="text-xs text-yellow-600">👑</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Management Panel */}
      {isSessionPanelOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Collaborative Sessions</h3>

            {/* Create New Session */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Create New Session</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Session name"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim() || isCreatingSession}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingSession ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>

            {/* Join by Code */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Join by Code</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={sessionInviteCode}
                  onChange={(e) => setSessionInviteCode(e.target.value)}
                  placeholder="Session code"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={!sessionInviteCode.trim()}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Available Sessions */}
            <div>
              <h4 className="text-sm font-medium mb-2">Available Sessions</h4>
              {availableSessions.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium">{session.name}</h5>
                          <p className="text-xs text-gray-500">
                            {session.participants.filter(p => p.isActive).length} participants • 
                            Created {formatDate(session.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinSession(session.id)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No active sessions available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Management Panel */}
      {isBookmarkPanelOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">View Bookmarks</h3>

            {/* Save Current View */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Save Current View</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newBookmarkName}
                  onChange={(e) => setNewBookmarkName(e.target.value)}
                  placeholder="Bookmark name"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveBookmark}
                  disabled={!newBookmarkName.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Saved Bookmarks */}
            <div>
              <h4 className="text-sm font-medium mb-2">Saved Bookmarks</h4>
              {bookmarks.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium truncate">{bookmark.name}</h5>
                          <p className="text-xs text-gray-500">
                            {bookmark.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            Created {formatDate(bookmark.createdAt)}
                            {bookmark.usageCount !== undefined && (
                              <span> • Used {bookmark.usageCount} times</span>
                            )}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => handleLoadBookmark(bookmark.id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Load bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteBookmark(bookmark.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No bookmarks saved yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Annotation Quick Actions */}
      {currentSession && (
        <div className="absolute bottom-full left-0 mb-2 flex space-x-2">
          <button
            onClick={() => handleCreateAnnotation('note', new Vector3(0, 0, 0))}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            title="Add note"
          >
            📝
          </button>
          <button
            onClick={() => handleCreateAnnotation('question', new Vector3(0, 0, 0))}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-lg"
            title="Add question"
          >
            ❓
          </button>
          <button
            onClick={() => handleCreateAnnotation('issue', new Vector3(0, 0, 0))}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
            title="Report issue"
          >
            ⚠️
          </button>
          <button
            onClick={() => handleCreateAnnotation('suggestion', new Vector3(0, 0, 0))}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-lg"
            title="Add suggestion"
          >
            💡
          </button>
        </div>
      )}

      {/* Cursor Indicators (rendered in 3D space) */}
      {cursorIndicators.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-40"
          style={{
            left: `${(cursor.position.x + 1) * 50}%`,
            top: `${(-cursor.position.y + 1) * 50}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cursor.color }}
            />
            <span className="text-xs font-medium text-gray-800">{cursor.userName}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollaborativeControls;
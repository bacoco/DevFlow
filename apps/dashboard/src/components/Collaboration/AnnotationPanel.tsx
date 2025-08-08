/**
 * AnnotationPanel
 * Component for collaborative annotations on dashboards and charts
 */

import React, { useState, useEffect } from 'react';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  Annotation,
  AnnotationType,
  AnnotationTarget,
  VisibilityScope,
  ReactionType
} from '../../services/collaboration/types';

interface AnnotationPanelProps {
  currentUser: User;
  collaborationManager: CollaborationManager;
  annotations: Annotation[];
  loading: boolean;
  onAnnotationCreated: () => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  currentUser,
  collaborationManager,
  annotations,
  loading,
  onAnnotationCreated
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    type: AnnotationTarget;
    id: string;
    name: string;
  } | null>(null);

  const [newAnnotation, setNewAnnotation] = useState<{
    content: string;
    type: AnnotationType;
    visibility: VisibilityScope;
    position: { x: number; y: number };
  }>({
    content: '',
    type: 'comment',
    visibility: 'team',
    position: { x: 0, y: 0 }
  });

  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());

  // Mock targets for demonstration
  const availableTargets = [
    { type: 'dashboard' as AnnotationTarget, id: 'main-dashboard', name: 'Main Dashboard' },
    { type: 'chart' as AnnotationTarget, id: 'productivity-chart', name: 'Productivity Chart' },
    { type: 'widget' as AnnotationTarget, id: 'metrics-widget', name: 'Metrics Widget' },
    { type: 'insight' as AnnotationTarget, id: 'team-insight', name: 'Team Performance Insight' }
  ];

  const handleCreateAnnotation = async () => {
    if (!selectedTarget || !newAnnotation.content.trim()) {
      return;
    }

    try {
      const annotationData = {
        authorId: currentUser.id,
        content: newAnnotation.content,
        type: newAnnotation.type,
        visibility: newAnnotation.visibility,
        position: newAnnotation.position
      };

      const response = await collaborationManager.createAnnotation(
        selectedTarget.type,
        selectedTarget.id,
        annotationData
      );

      if (response.success) {
        setShowCreateForm(false);
        resetCreateForm();
        onAnnotationCreated();
      } else {
        alert(`Failed to create annotation: ${response.error}`);
      }
    } catch (error) {
      console.error('Error creating annotation:', error);
      alert('Failed to create annotation. Please try again.');
    }
  };

  const resetCreateForm = () => {
    setNewAnnotation({
      content: '',
      type: 'comment',
      visibility: 'team',
      position: { x: 0, y: 0 }
    });
    setSelectedTarget(null);
  };

  const handleReply = async (annotationId: string) => {
    const content = replyContent[annotationId];
    if (!content?.trim()) return;

    try {
      const response = await collaborationManager.replyToAnnotation(annotationId, {
        authorId: currentUser.id,
        content: content.trim()
      });

      if (response.success) {
        setReplyContent(prev => ({ ...prev, [annotationId]: '' }));
        onAnnotationCreated(); // Refresh annotations
      } else {
        alert(`Failed to reply: ${response.error}`);
      }
    } catch (error) {
      console.error('Error replying to annotation:', error);
      alert('Failed to reply. Please try again.');
    }
  };

  const handleReaction = async (annotationId: string, reactionType: ReactionType, replyId?: string) => {
    // In a real implementation, this would call the collaboration manager
    console.log(`Adding ${reactionType} reaction to ${replyId ? 'reply' : 'annotation'} ${annotationId}`);
  };

  const toggleAnnotationExpansion = (annotationId: string) => {
    setExpandedAnnotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(annotationId)) {
        newSet.delete(annotationId);
      } else {
        newSet.add(annotationId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getAnnotationIcon = (type: AnnotationType) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'question':
        return '❓';
      case 'suggestion':
        return '💡';
      case 'issue':
        return '⚠️';
      case 'highlight':
        return '✨';
      default:
        return '📝';
    }
  };

  const getVisibilityIcon = (visibility: VisibilityScope) => {
    switch (visibility) {
      case 'public':
        return '🌐';
      case 'team':
        return '👥';
      case 'private':
        return '🔒';
      case 'mentioned_users':
        return '👤';
      default:
        return '👥';
    }
  };

  const groupedAnnotations = annotations.reduce((groups, annotation) => {
    const key = `${annotation.targetType}-${annotation.targetId}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(annotation);
    return groups;
  }, {} as Record<string, Annotation[]>);

  return (
    <div className="annotation-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Annotations</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Annotation
        </button>
      </div>

      {/* Create Annotation Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Create Annotation</h4>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annotate On *
                </label>
                <select
                  value={selectedTarget ? `${selectedTarget.type}-${selectedTarget.id}` : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [type, id] = e.target.value.split('-');
                      const target = availableTargets.find(t => t.type === type && t.id === id);
                      setSelectedTarget(target || null);
                    } else {
                      setSelectedTarget(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select target...</option>
                  {availableTargets.map(target => (
                    <option key={`${target.type}-${target.id}`} value={`${target.type}-${target.id}`}>
                      {target.name} ({target.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Annotation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newAnnotation.type}
                  onChange={(e) => setNewAnnotation(prev => ({ ...prev, type: e.target.value as AnnotationType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="comment">Comment</option>
                  <option value="question">Question</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="issue">Issue</option>
                  <option value="highlight">Highlight</option>
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={newAnnotation.content}
                  onChange={(e) => setNewAnnotation(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter your annotation..."
                  required
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={newAnnotation.visibility}
                  onChange={(e) => setNewAnnotation(prev => ({ ...prev, visibility: e.target.value as VisibilityScope }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="team">Team</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="mentioned_users">Mentioned Users Only</option>
                </select>
              </div>

              {/* Position (simplified) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X Position
                  </label>
                  <input
                    type="number"
                    value={newAnnotation.position.x}
                    onChange={(e) => setNewAnnotation(prev => ({
                      ...prev,
                      position: { ...prev.position, x: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y Position
                  </label>
                  <input
                    type="number"
                    value={newAnnotation.position.y}
                    onChange={(e) => setNewAnnotation(prev => ({
                      ...prev,
                      position: { ...prev.position, y: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnotation}
                disabled={!selectedTarget || !newAnnotation.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotations List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading annotations...</p>
          </div>
        ) : Object.keys(groupedAnnotations).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <p>No annotations yet</p>
            <p className="text-sm">Add your first annotation to start collaborating</p>
          </div>
        ) : (
          Object.entries(groupedAnnotations).map(([targetKey, targetAnnotations]) => {
            const [targetType, targetId] = targetKey.split('-');
            const target = availableTargets.find(t => t.type === targetType && t.id === targetId);
            
            return (
              <div key={targetKey} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <h4 className="font-medium text-gray-900">
                    {target?.name || `${targetType} ${targetId}`}
                  </h4>
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {targetAnnotations.length} annotation{targetAnnotations.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {targetAnnotations.map(annotation => {
                    const isExpanded = expandedAnnotations.has(annotation.id);
                    
                    return (
                      <div key={annotation.id} className="border-l-4 border-blue-200 pl-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
                              <span className="font-medium text-gray-900">
                                {annotation.authorId}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(annotation.createdAt)}
                              </span>
                              <span className="text-sm" title={`Visible to: ${annotation.visibility}`}>
                                {getVisibilityIcon(annotation.visibility)}
                              </span>
                              {annotation.isResolved && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Resolved
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-700 mb-2">{annotation.content}</p>
                            
                            {/* Reactions */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                {(['like', 'helpful', 'agree'] as ReactionType[]).map(reactionType => (
                                  <button
                                    key={reactionType}
                                    onClick={() => handleReaction(annotation.id, reactionType)}
                                    className="flex items-center space-x-1 hover:text-blue-600"
                                  >
                                    <span>{reactionType === 'like' ? '👍' : reactionType === 'helpful' ? '💡' : '✅'}</span>
                                    <span>{annotation.reactions.filter(r => r.type === reactionType).length}</span>
                                  </button>
                                ))}
                              </div>
                              
                              <button
                                onClick={() => toggleAnnotationExpansion(annotation.id)}
                                className="hover:text-blue-600"
                              >
                                {isExpanded ? 'Hide' : 'Show'} replies ({annotation.replies.length})
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {annotation.replies.map(reply => (
                              <div key={reply.id} className="ml-4 p-3 bg-gray-50 rounded-md">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {reply.authorId}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">{reply.content}</p>
                                
                                {/* Reply reactions */}
                                <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                  {(['like', 'helpful'] as ReactionType[]).map(reactionType => (
                                    <button
                                      key={reactionType}
                                      onClick={() => handleReaction(annotation.id, reactionType, reply.id)}
                                      className="flex items-center space-x-1 hover:text-blue-600"
                                    >
                                      <span>{reactionType === 'like' ? '👍' : '💡'}</span>
                                      <span>{reply.reactions.filter(r => r.type === reactionType).length}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Reply form */}
                            <div className="ml-4">
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={replyContent[annotation.id] || ''}
                                  onChange={(e) => setReplyContent(prev => ({
                                    ...prev,
                                    [annotation.id]: e.target.value
                                  }))}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="Add a reply..."
                                />
                                <button
                                  onClick={() => handleReply(annotation.id)}
                                  disabled={!replyContent[annotation.id]?.trim()}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;
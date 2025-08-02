import React, { useState, useRef, useEffect } from 'react';
import { Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { Annotation3D, AnnotationReply } from './types';

interface AnnotationMarkerProps {
  annotation: Annotation3D;
  isSelected: boolean;
  onSelect: (annotation: Annotation3D) => void;
  onUpdate: (annotation: Annotation3D) => void;
  onDelete: (annotationId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({
  annotation,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canEdit,
  canDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const getAnnotationIcon = (type: Annotation3D['type']) => {
    switch (type) {
      case 'note': return '📝';
      case 'highlight': return '✨';
      case 'question': return '❓';
      case 'issue': return '⚠️';
      case 'suggestion': return '💡';
      default: return '📌';
    }
  };

  const getAnnotationColor = (type: Annotation3D['type']) => {
    switch (type) {
      case 'note': return '#3B82F6';
      case 'highlight': return '#F59E0B';
      case 'question': return '#8B5CF6';
      case 'issue': return '#EF4444';
      case 'suggestion': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <group position={annotation.position}>
      {/* 3D Marker */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(annotation);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setIsHovered(false);
        }}
        scale={isSelected ? 1.5 : isHovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={annotation.color || getAnnotationColor(annotation.type)}
          transparent
          opacity={annotation.isVisible ? 0.8 : 0.3}
          emissive={isSelected ? annotation.color || getAnnotationColor(annotation.type) : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Pulsing ring for active annotations */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.3, 0.4, 32]} />
          <meshBasicMaterial
            color={annotation.color || getAnnotationColor(annotation.type)}
            transparent
            opacity={0.5}
            side={2}
          />
        </mesh>
      )}

      {/* HTML overlay for annotation details */}
      {(isSelected || isHovered) && (
        <Html
          position={[0, 0.5, 0]}
          center
          distanceFactor={10}
          occlude
          style={{
            pointerEvents: 'auto',
            userSelect: 'none'
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs border border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getAnnotationIcon(annotation.type)}</span>
                <span className="text-sm font-semibold text-gray-800">{annotation.title}</span>
              </div>
              <div className="flex space-x-1">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger edit mode
                    }}
                    className="text-gray-500 hover:text-blue-600 text-xs"
                    title="Edit annotation"
                  >
                    ✏️
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(annotation.id);
                    }}
                    className="text-gray-500 hover:text-red-600 text-xs"
                    title="Delete annotation"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{annotation.content}</p>
            
            <div className="text-xs text-gray-500 mb-2">
              By {annotation.createdBy} • {annotation.createdAt.toLocaleDateString()}
              {annotation.updatedAt && (
                <span> • Updated {annotation.updatedAt.toLocaleDateString()}</span>
              )}
            </div>

            {annotation.replies.length > 0 && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {annotation.replies.length} {annotation.replies.length === 1 ? 'Reply' : 'Replies'}
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1">
                  {annotation.replies.slice(-2).map((reply) => (
                    <div key={reply.id} className="text-xs bg-gray-50 rounded p-1">
                      <div className="font-medium text-gray-700">{reply.createdBy}:</div>
                      <div className="text-gray-600">{reply.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

interface AnnotationPanelProps {
  annotation: Annotation3D | null;
  onClose: () => void;
  onUpdate: (annotation: Annotation3D) => void;
  onDelete: (annotationId: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotation,
  onClose,
  onUpdate,
  onDelete,
  onAddReply,
  canEdit,
  canDelete,
  canReply
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<Annotation3D['type']>('note');
  const [replyContent, setReplyContent] = useState('');
  const [showAllReplies, setShowAllReplies] = useState(false);

  useEffect(() => {
    if (annotation) {
      setEditTitle(annotation.title);
      setEditContent(annotation.content);
      setEditType(annotation.type);
    }
  }, [annotation]);

  if (!annotation) return null;

  const handleSaveEdit = () => {
    const updatedAnnotation: Annotation3D = {
      ...annotation,
      title: editTitle,
      content: editContent,
      type: editType,
      updatedAt: new Date()
    };
    onUpdate(updatedAnnotation);
    setIsEditing(false);
  };

  const handleAddReply = () => {
    if (replyContent.trim()) {
      onAddReply(annotation.id, replyContent.trim());
      setReplyContent('');
    }
  };

  const getTypeIcon = (type: Annotation3D['type']) => {
    switch (type) {
      case 'note': return '📝';
      case 'highlight': return '✨';
      case 'question': return '❓';
      case 'issue': return '⚠️';
      case 'suggestion': return '💡';
      default: return '📌';
    }
  };

  return (
    <div className="fixed right-4 top-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(annotation.type)}</span>
          <h3 className="font-semibold text-gray-800">Annotation Details</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as Annotation3D['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="note">📝 Note</option>
                <option value="highlight">✨ Highlight</option>
                <option value="question">❓ Question</option>
                <option value="issue">⚠️ Issue</option>
                <option value="suggestion">💡 Suggestion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Annotation title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Annotation content"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">{annotation.title}</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{annotation.content}</p>
            </div>

            <div className="text-sm text-gray-500 border-t pt-3">
              <div>Created by {annotation.createdBy}</div>
              <div>{annotation.createdAt.toLocaleString()}</div>
              {annotation.updatedAt && (
                <div>Updated {annotation.updatedAt.toLocaleString()}</div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2 pt-2">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this annotation?')) {
                      onDelete(annotation.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Replies section */}
            {annotation.replies.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-800">
                    Replies ({annotation.replies.length})
                  </h5>
                  {annotation.replies.length > 3 && (
                    <button
                      onClick={() => setShowAllReplies(!showAllReplies)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAllReplies ? 'Show less' : 'Show all'}
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {(showAllReplies ? annotation.replies : annotation.replies.slice(-3)).map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{reply.createdBy}</span>
                        <span className="text-xs text-gray-500">{reply.createdAt.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add reply */}
            {canReply && (
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Add a reply..."
                  />
                  <button
                    onClick={handleAddReply}
                    disabled={!replyContent.trim()}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface AnnotationSystemProps {
  annotations: Annotation3D[];
  selectedAnnotation: Annotation3D | null;
  onAnnotationSelect: (annotation: Annotation3D | null) => void;
  onAnnotationUpdate: (annotation: Annotation3D) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationReply: (annotationId: string, content: string) => void;
  currentUserId: string;
  canAnnotate: boolean;
  canManageAnnotations: boolean;
}

const AnnotationSystem: React.FC<AnnotationSystemProps> = ({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationReply,
  currentUserId,
  canAnnotate,
  canManageAnnotations
}) => {
  return (
    <>
      {/* 3D Annotation Markers */}
      {annotations.map((annotation) => (
        <AnnotationMarker
          key={annotation.id}
          annotation={annotation}
          isSelected={selectedAnnotation?.id === annotation.id}
          onSelect={onAnnotationSelect}
          onUpdate={onAnnotationUpdate}
          onDelete={onAnnotationDelete}
          canEdit={annotation.createdBy === currentUserId || canManageAnnotations}
          canDelete={annotation.createdBy === currentUserId || canManageAnnotations}
        />
      ))}

      {/* Annotation Detail Panel */}
      <AnnotationPanel
        annotation={selectedAnnotation}
        onClose={() => onAnnotationSelect(null)}
        onUpdate={onAnnotationUpdate}
        onDelete={onAnnotationDelete}
        onAddReply={onAnnotationReply}
        canEdit={selectedAnnotation ? (selectedAnnotation.createdBy === currentUserId || canManageAnnotations) : false}
        canDelete={selectedAnnotation ? (selectedAnnotation.createdBy === currentUserId || canManageAnnotations) : false}
        canReply={canAnnotate}
      />
    </>
  );
};

export default AnnotationSystem;
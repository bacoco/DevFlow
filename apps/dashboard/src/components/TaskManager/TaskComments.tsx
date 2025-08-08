/**
 * Task Comments Component
 * Manages task comments with rich text editing and real-time updates
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Edit3,
  Trash2,
  MoreHorizontal,
  Reply,
  Heart,
  AtSign,
} from 'lucide-react';
import { TaskComment, TaskUser } from '../../types/design-system';
import { Button } from '../ui/Button';
import RichTextEditor, { RichTextEditorRef } from '../ui/RichTextEditor';

export interface TaskCommentsProps {
  comments: TaskComment[];
  currentUser: TaskUser;
  onAddComment: (content: string, mentions?: TaskUser[]) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onMentionUser?: (user: TaskUser) => void;
  availableUsers?: TaskUser[];
  className?: string;
  testId?: string;
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

const UserAvatar: React.FC<{ user: TaskUser; size?: 'sm' | 'md' | 'lg' }> = ({ 
  user, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-medium text-primary-700 dark:text-primary-300 overflow-hidden`}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </div>
  );
};

const CommentItem: React.FC<{
  comment: TaskComment;
  currentUser: TaskUser;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  availableUsers: TaskUser[];
}> = ({ comment, currentUser, onUpdate, onDelete, availableUsers }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);

  const isOwner = comment.author.id === currentUser.id;
  const canEdit = isOwner;
  const canDelete = isOwner;

  const handleSaveEdit = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      if (content.trim()) {
        onUpdate(comment.id, content);
        setIsEditing(false);
      }
    }
  }, [comment.id, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    if (editorRef.current) {
      editorRef.current.setContent(comment.content);
    }
  }, [comment.content]);

  return (
    <motion.div
      className="flex gap-3 group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <UserAvatar user={comment.author} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {comment.author.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimeAgo(comment.createdAt)}
          </span>
          {comment.edited && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (edited)
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <RichTextEditor
              ref={editorRef}
              content={comment.content}
              placeholder="Edit your comment..."
              mentions={availableUsers.map(user => ({
                id: user.id,
                label: user.name,
                avatar: user.avatar,
              }))}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: comment.content }}
            />
            
            {/* Action buttons */}
            <AnimatePresence>
              {showActions && (canEdit || canDelete) && (
                <motion.div
                  className="absolute top-0 right-0 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="p-1 min-w-0"
                      title="Edit comment"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(comment.id)}
                      className="p-1 min-w-0 text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mentions */}
        {comment.mentions && comment.mentions.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <AtSign className="w-3 h-3" />
            <span>
              Mentioned: {comment.mentions.map(user => user.name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const TaskComments: React.FC<TaskCommentsProps> = ({
  comments,
  currentUser,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onMentionUser,
  availableUsers = [],
  className = '',
  testId,
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const editorRef = useRef<RichTextEditorRef>(null);

  const handleSubmitComment = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      if (content.trim()) {
        // Extract mentions from content (simplified - in real app, this would be more sophisticated)
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const mentions: TaskUser[] = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedUser = availableUsers.find(user => user.id === match[2]);
          if (mentionedUser) {
            mentions.push(mentionedUser);
          }
        }

        onAddComment(content, mentions);
        editorRef.current.setContent('');
        setNewCommentContent('');
        setIsComposing(false);
      }
    }
  }, [onAddComment, availableUsers]);

  const handleCancelComment = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
    setNewCommentContent('');
    setIsComposing(false);
  }, []);

  const containerClasses = [
    'space-y-4',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Comments
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({comments.length})
        </span>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        <AnimatePresence>
          {comments.length === 0 ? (
            <motion.div
              className="text-center py-8 text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to add a comment</p>
            </motion.div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                onUpdate={onUpdateComment}
                onDelete={onDeleteComment}
                availableUsers={availableUsers}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* New comment form */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex gap-3">
          <UserAvatar user={currentUser} />
          
          <div className="flex-1 space-y-3">
            {!isComposing ? (
              <button
                onClick={() => setIsComposing(true)}
                className="w-full p-3 text-left text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Add a comment...
              </button>
            ) : (
              <>
                <RichTextEditor
                  ref={editorRef}
                  content={newCommentContent}
                  placeholder="Add a comment..."
                  onChange={setNewCommentContent}
                  mentions={availableUsers.map(user => ({
                    id: user.id,
                    label: user.name,
                    avatar: user.avatar,
                  }))}
                  onMention={onMentionUser}
                  className="text-sm"
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Use @ to mention team members
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelComment}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newCommentContent.trim()}
                      icon={<Send className="w-4 h-4" />}
                    >
                      Comment
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskComments;
/**
 * SharePanel
 * Component for sharing content with granular permissions and expiration controls
 */

import React, { useState, useEffect } from 'react';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  SharedContent,
  ShareRequest,
  ShareRecipient,
  SharePermission,
  ShareAction,
  ShareableContent
} from '../../services/collaboration/types';

interface SharePanelProps {
  currentUser: User;
  collaborationManager: CollaborationManager;
  sharedContent: SharedContent[];
  loading: boolean;
  onContentShared: () => void;
}

export const SharePanel: React.FC<SharePanelProps> = ({
  currentUser,
  collaborationManager,
  sharedContent,
  loading,
  onContentShared
}) => {
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareFormData, setShareFormData] = useState<{
    contentType: string;
    title: string;
    description: string;
    recipients: ShareRecipient[];
    permissions: ShareAction[];
    expiresAt: string;
    message: string;
    notifyRecipients: boolean;
  }>({
    contentType: 'dashboard',
    title: '',
    description: '',
    recipients: [],
    permissions: ['view'],
    expiresAt: '',
    message: '',
    notifyRecipients: true
  });

  const [availableUsers] = useState<User[]>([
    { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '', role: 'developer', teamId: 'team1', preferences: {} as any },
    { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', avatar: '', role: 'team_lead', teamId: 'team1', preferences: {} as any },
    { id: 'user3', name: 'Carol Davis', email: 'carol@example.com', avatar: '', role: 'manager', teamId: 'team1', preferences: {} as any }
  ]);

  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recipientType, setRecipientType] = useState<'user' | 'team' | 'role'>('user');

  const handleShareContent = async () => {
    try {
      // Create shareable content
      const content: ShareableContent = {
        id: `content_${Date.now()}`,
        type: shareFormData.contentType as any,
        title: shareFormData.title,
        description: shareFormData.description,
        data: {}, // In real implementation, would contain actual content
        createdBy: currentUser.id,
        createdAt: new Date(),
        metadata: {
          tags: [],
          category: shareFormData.contentType,
          version: 1,
          size: 0,
          format: 'json'
        }
      };

      // Create share request
      const shareRequest: ShareRequest = {
        contentId: content.id,
        recipients: shareFormData.recipients,
        permissions: shareFormData.permissions.map(action => ({
          action,
          granted: true,
          conditions: shareFormData.expiresAt ? [{
            type: 'time_limit',
            value: shareFormData.expiresAt
          }] : []
        })),
        message: shareFormData.message,
        expiresAt: shareFormData.expiresAt ? new Date(shareFormData.expiresAt) : undefined,
        notifyRecipients: shareFormData.notifyRecipients
      };

      const response = await collaborationManager.shareContent(content, shareRequest);
      
      if (response.success) {
        setShowShareForm(false);
        resetShareForm();
        onContentShared();
      } else {
        alert(`Failed to share content: ${response.error}`);
      }
    } catch (error) {
      console.error('Error sharing content:', error);
      alert('Failed to share content. Please try again.');
    }
  };

  const resetShareForm = () => {
    setShareFormData({
      contentType: 'dashboard',
      title: '',
      description: '',
      recipients: [],
      permissions: ['view'],
      expiresAt: '',
      message: '',
      notifyRecipients: true
    });
  };

  const addRecipient = () => {
    if (!selectedRecipient) return;

    const recipient: ShareRecipient = {
      type: recipientType,
      id: selectedRecipient,
      name: recipientType === 'user' 
        ? availableUsers.find(u => u.id === selectedRecipient)?.name || selectedRecipient
        : selectedRecipient
    };

    if (!shareFormData.recipients.some(r => r.id === recipient.id && r.type === recipient.type)) {
      setShareFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipient]
      }));
    }

    setSelectedRecipient('');
  };

  const removeRecipient = (recipientId: string, recipientType: string) => {
    setShareFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => !(r.id === recipientId && r.type === recipientType))
    }));
  };

  const togglePermission = (permission: ShareAction) => {
    setShareFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const revokeShare = async (shareId: string) => {
    try {
      const response = await collaborationManager.revokeShare(shareId, currentUser.id);
      if (response.success) {
        onContentShared(); // Refresh the list
      } else {
        alert(`Failed to revoke share: ${response.error}`);
      }
    } catch (error) {
      console.error('Error revoking share:', error);
      alert('Failed to revoke share. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getExpirationStatus = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return { status: 'expired', text: 'Expired', color: 'text-red-600' };
    }
    
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    if (daysLeft <= 1) {
      return { status: 'expiring', text: 'Expires soon', color: 'text-orange-600' };
    }
    
    return { status: 'active', text: `${daysLeft} days left`, color: 'text-green-600' };
  };

  return (
    <div className="share-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Content Sharing</h3>
        <button
          onClick={() => setShowShareForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Share Content
        </button>
      </div>

      {/* Share Form Modal */}
      {showShareForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Share Content</h4>
              <button
                onClick={() => setShowShareForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select
                  value={shareFormData.contentType}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, contentType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="chart">Chart</option>
                  <option value="insight">Insight</option>
                  <option value="report">Report</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={shareFormData.title}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter content title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={shareFormData.description}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share With
                </label>
                <div className="flex space-x-2 mb-2">
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="team">Team</option>
                    <option value="role">Role</option>
                  </select>
                  
                  {recipientType === 'user' ? (
                    <select
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select user...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${recipientType} name`}
                    />
                  )}
                  
                  <button
                    onClick={addRecipient}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>

                {/* Selected Recipients */}
                {shareFormData.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {shareFormData.recipients.map((recipient, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {recipient.name}
                        <button
                          onClick={() => removeRecipient(recipient.id, recipient.type)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['view', 'comment', 'edit', 'share', 'download'] as ShareAction[]).map(permission => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareFormData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={shareFormData.expiresAt}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Add a message for recipients"
                />
              </div>

              {/* Notify Recipients */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shareFormData.notifyRecipients}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, notifyRecipients: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Notify recipients via email</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowShareForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShareContent}
                disabled={!shareFormData.title || shareFormData.recipients.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Share Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading shared content...</p>
          </div>
        ) : sharedContent.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <p>No shared content yet</p>
            <p className="text-sm">Share your first dashboard or insight to get started</p>
          </div>
        ) : (
          sharedContent.map(share => {
            const expiration = getExpirationStatus(share.expiresAt);
            
            return (
              <div key={share.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Shared Content #{share.id.slice(-6)}
                      </h4>
                      {expiration && (
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${expiration.color}`}>
                          {expiration.text}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Shared with:</strong> {share.sharedWith.map(r => r.name).join(', ')}
                      </p>
                      <p>
                        <strong>Permissions:</strong> {share.permissions.filter(p => p.granted).map(p => p.action).join(', ')}
                      </p>
                      <p>
                        <strong>Created:</strong> {formatDate(share.createdAt)}
                      </p>
                      <p>
                        <strong>Access count:</strong> {share.accessCount}
                      </p>
                      {share.lastAccessed && (
                        <p>
                          <strong>Last accessed:</strong> {formatDate(share.lastAccessed)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(share.shareUrl)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Copy share URL"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                    
                    {share.sharedBy === currentUser.id && (
                      <button
                        onClick={() => revokeShare(share.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                        title="Revoke share"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SharePanel;
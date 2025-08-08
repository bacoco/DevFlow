import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Toast } from './Toast';
import { 
  ShareLink, 
  ShareOptions, 
  SharePermission,
  EmbedOptions 
} from '../../types/export';
import { sharingService } from '../../services/sharingService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardName: string;
  currentUserId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  dashboardId,
  dashboardName,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'email'>('link');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Link sharing state
  const [permission, setPermission] = useState<SharePermission>('view');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [requireAuth, setRequireAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [allowedEmails, setAllowedEmails] = useState('');

  // Embed options state
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>({
    width: 800,
    height: 600,
    theme: 'light',
    showHeader: true,
    showFooter: false,
    allowInteraction: true,
  });

  // Email sharing state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen, dashboardId]);

  const loadShareLinks = async () => {
    const links = sharingService.getShareLinks(dashboardId);
    setShareLinks(links);
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreateShareLink = async () => {
    setIsCreating(true);
    
    try {
      const options: ShareOptions = {
        permission,
        expiresIn: expiresIn === 'never' ? undefined : parseInt(expiresIn) * 24 * 60 * 60 * 1000,
        requireAuth,
        password: password || undefined,
        allowedEmails: allowedEmails ? allowedEmails.split(',').map(e => e.trim()) : undefined,
      };

      const shareLink = await sharingService.createShareLink(
        dashboardId,
        options,
        currentUserId
      );

      setShareLinks(prev => [shareLink, ...prev]);
      showToastMessage('Share link created successfully!');
      
      // Reset form
      setPermission('view');
      setExpiresIn('never');
      setRequireAuth(false);
      setPassword('');
      setAllowedEmails('');
    } catch (error) {
      showToastMessage('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToastMessage('Link copied to clipboard!');
    } catch (error) {
      showToastMessage('Failed to copy link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const success = await sharingService.deleteShareLink(linkId);
    if (success) {
      setShareLinks(prev => prev.filter(link => link.id !== linkId));
      showToastMessage('Share link deleted');
    }
  };

  const handleCopyEmbedCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToastMessage('Embed code copied to clipboard!');
    } catch (error) {
      showToastMessage('Failed to copy embed code');
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) return;

    const recipients = emailRecipients.split(',').map(e => e.trim());
    
    // For demo purposes, create a temporary share link
    const shareLink = await sharingService.createShareLink(
      dashboardId,
      { permission: 'view' },
      currentUserId
    );

    const success = await sharingService.sendShareLink(
      shareLink.id,
      recipients,
      emailMessage
    );

    if (success) {
      showToastMessage(`Dashboard shared with ${recipients.length} recipient(s)`);
      setEmailRecipients('');
      setEmailMessage('');
    } else {
      showToastMessage('Failed to send email');
    }
  };

  const getExpirationText = (expiresAt?: Date) => {
    if (!expiresAt) return 'Never expires';
    
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const getPermissionIcon = (permission: SharePermission) => {
    switch (permission) {
      case 'view':
        return '👁️';
      case 'comment':
        return '💬';
      case 'edit':
        return '✏️';
      default:
        return '👁️';
    }
  };

  const generateEmbedCode = () => {
    if (shareLinks.length === 0) return '';
    
    const firstLink = shareLinks[0];
    return sharingService.generateEmbedCode(firstLink.token, embedOptions);
  };

  const generateResponsiveEmbedCode = () => {
    if (shareLinks.length === 0) return '';
    
    const firstLink = shareLinks[0];
    return sharingService.generateResponsiveEmbedCode(firstLink.token, embedOptions);
  };

  const tabs = [
    { id: 'link', label: 'Share Link', icon: '🔗' },
    { id: 'embed', label: 'Embed', icon: '📋' },
    { id: 'email', label: 'Email', icon: '📧' },
  ] as const;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Share Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {dashboardName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'link' && (
                <div className="space-y-6">
                  {/* Create New Link */}
                  <Card variant="outlined" padding="lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Create Share Link
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Permission Level
                        </label>
                        <select
                          value={permission}
                          onChange={(e) => setPermission(e.target.value as SharePermission)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="view">View Only</option>
                          <option value="comment">View & Comment</option>
                          <option value="edit">Full Access</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Expires In
                        </label>
                        <select
                          value={expiresIn}
                          onChange={(e) => setExpiresIn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="never">Never</option>
                          <option value="1">1 Day</option>
                          <option value="7">1 Week</option>
                          <option value="30">1 Month</option>
                          <option value="90">3 Months</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 mb-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={requireAuth}
                          onChange={(e) => setRequireAuth(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Require authentication
                        </span>
                      </label>

                      <Input
                        type="password"
                        label="Password Protection (Optional)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />

                      <Input
                        type="text"
                        label="Allowed Emails (Optional)"
                        value={allowedEmails}
                        onChange={(e) => setAllowedEmails(e.target.value)}
                        placeholder="user1@example.com, user2@example.com"
                        helperText="Comma-separated list of email addresses"
                      />
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleCreateShareLink}
                      loading={isCreating}
                      className="w-full"
                    >
                      Create Share Link
                    </Button>
                  </Card>

                  {/* Existing Links */}
                  {shareLinks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Existing Share Links
                      </h3>
                      <div className="space-y-3">
                        {shareLinks.map((link) => (
                          <Card key={link.id} variant="outlined" padding="md">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-lg">{getPermissionIcon(link.permission)}</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                    {link.permission} Access
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    link.isActive 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  }`}>
                                    {link.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {getExpirationText(link.expiresAt)} • {link.viewCount} views
                                </p>
                                <div className="flex items-center space-x-2">
                                  <code className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono truncate">
                                    {link.url}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyLink(link.url)}
                                  >
                                    Copy
                                  </Button>
                                </div>
                              </div>
                              <div className="ml-4 flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'embed' && (
                <div className="space-y-6">
                  <Card variant="outlined" padding="lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Embed Options
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Input
                        type="number"
                        label="Width (px)"
                        value={embedOptions.width?.toString() || ''}
                        onChange={(e) => setEmbedOptions(prev => ({ 
                          ...prev, 
                          width: parseInt(e.target.value) || 800 
                        }))}
                      />
                      <Input
                        type="number"
                        label="Height (px)"
                        value={embedOptions.height?.toString() || ''}
                        onChange={(e) => setEmbedOptions(prev => ({ 
                          ...prev, 
                          height: parseInt(e.target.value) || 600 
                        }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme
                        </label>
                        <select
                          value={embedOptions.theme}
                          onChange={(e) => setEmbedOptions(prev => ({ 
                            ...prev, 
                            theme: e.target.value as 'light' | 'dark' | 'auto' 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>
                      
                      <Input
                        type="number"
                        label="Auto Refresh (seconds)"
                        value={embedOptions.autoRefresh?.toString() || ''}
                        onChange={(e) => setEmbedOptions(prev => ({ 
                          ...prev, 
                          autoRefresh: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="space-y-2 mb-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={embedOptions.showHeader}
                          onChange={(e) => setEmbedOptions(prev => ({ 
                            ...prev, 
                            showHeader: e.target.checked 
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show header</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={embedOptions.showFooter}
                          onChange={(e) => setEmbedOptions(prev => ({ 
                            ...prev, 
                            showFooter: e.target.checked 
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show footer</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={embedOptions.allowInteraction}
                          onChange={(e) => setEmbedOptions(prev => ({ 
                            ...prev, 
                            allowInteraction: e.target.checked 
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Allow interaction</span>
                      </label>
                    </div>
                  </Card>

                  {shareLinks.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Standard Embed Code
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyEmbedCode(generateEmbedCode())}
                          >
                            Copy
                          </Button>
                        </div>
                        <textarea
                          value={generateEmbedCode()}
                          readOnly
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Responsive Embed Code
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyEmbedCode(generateResponsiveEmbedCode())}
                          >
                            Copy
                          </Button>
                        </div>
                        <textarea
                          value={generateResponsiveEmbedCode()}
                          readOnly
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {shareLinks.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        Create a share link first to generate embed code
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-6">
                  <Card variant="outlined" padding="lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Share via Email
                    </h3>
                    
                    <div className="space-y-4">
                      <Input
                        type="text"
                        label="Recipients"
                        value={emailRecipients}
                        onChange={(e) => setEmailRecipients(e.target.value)}
                        placeholder="user1@example.com, user2@example.com"
                        helperText="Comma-separated list of email addresses"
                        required
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Message (Optional)
                        </label>
                        <textarea
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="Add a personal message..."
                        />
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleSendEmail}
                        disabled={!emailRecipients.trim()}
                        className="w-full"
                      >
                        Send Email
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
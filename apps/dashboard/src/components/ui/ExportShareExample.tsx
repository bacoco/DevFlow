import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { ExportButton } from './ExportButton';
import { ShareButton } from './ShareButton';
import { ExportHistory } from './ExportHistory';
import { ShareAnalytics } from './ShareAnalytics';

/**
 * Example component demonstrating the comprehensive export and sharing system
 * This shows how to integrate export and sharing capabilities into a dashboard
 */
export const ExportShareExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'share' | 'analytics'>('export');
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  // Mock data for demonstration
  const mockDashboard = {
    id: 'dashboard-123',
    name: 'Developer Productivity Dashboard',
    description: 'Comprehensive view of team productivity metrics',
  };

  const mockUser = {
    id: 'user-456',
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  const handleExportStart = (jobId: string) => {
    setExportJobId(jobId);
    console.log('Export started:', jobId);
  };

  const handleExportComplete = (job: any) => {
    console.log('Export completed:', job);
  };

  const tabs = [
    { id: 'export', label: 'Export Data', icon: '📊' },
    { id: 'share', label: 'Share Dashboard', icon: '🔗' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Export & Share System Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive data export and dashboard sharing capabilities
        </p>
      </div>

      {/* Dashboard Info Card */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mockDashboard.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {mockDashboard.description}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <ExportButton
              dataType="dashboard"
              dataId={mockDashboard.id}
              defaultName={mockDashboard.name}
              onExportStart={handleExportStart}
              variant="secondary"
            />
            
            <ShareButton
              dashboardId={mockDashboard.id}
              dashboardName={mockDashboard.name}
              currentUserId={mockUser.id}
              variant="primary"
            />
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'export' && (
          <div className="space-y-6">
            <Card variant="outlined" padding="lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Export Options
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Export your dashboard data in multiple formats with advanced options and progress tracking.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ExportButton
                  dataType="dashboard"
                  dataId={mockDashboard.id}
                  defaultName="Dashboard Data"
                  onExportStart={handleExportStart}
                  variant="secondary"
                  className="w-full"
                />
                
                <ExportButton
                  dataType="tasks"
                  defaultName="Task Data"
                  onExportStart={handleExportStart}
                  variant="secondary"
                  className="w-full"
                />
                
                <ExportButton
                  dataType="analytics"
                  defaultName="Analytics Data"
                  onExportStart={handleExportStart}
                  variant="secondary"
                  className="w-full"
                />
                
                <ExportButton
                  dataType="chart"
                  defaultName="Chart Data"
                  onExportStart={handleExportStart}
                  variant="secondary"
                  className="w-full"
                />
              </div>
            </Card>

            <ExportHistory onExportComplete={handleExportComplete} />
          </div>
        )}

        {activeTab === 'share' && (
          <div className="space-y-6">
            <Card variant="outlined" padding="lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Sharing Options
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Share your dashboard with team members or external stakeholders with granular permissions and security controls.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Share Links
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create secure, time-limited links with customizable permissions
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Embed Code
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generate responsive embed code for external websites
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📧</span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Email Sharing
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Send dashboard access directly to team members via email
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <ShareButton
                  dashboardId={mockDashboard.id}
                  dashboardName={mockDashboard.name}
                  currentUserId={mockUser.id}
                  variant="primary"
                  size="lg"
                />
              </div>
            </Card>

            <Card variant="outlined" padding="lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Security Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Access Control
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Permission levels (View, Comment, Edit)</li>
                    <li>• Email-based access restrictions</li>
                    <li>• Password protection</li>
                    <li>• Time-limited access</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Monitoring
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• View tracking and analytics</li>
                    <li>• Access notifications</li>
                    <li>• Link expiration alerts</li>
                    <li>• Usage statistics</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card variant="outlined" padding="lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Usage Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Track how your shared dashboards are being used and accessed.
              </p>
            </Card>

            <ShareAnalytics dashboardId={mockDashboard.id} />
          </div>
        )}
      </motion.div>

      {/* Feature Highlights */}
      <Card variant="outlined" padding="lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Key Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              📊 Multiple Export Formats
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              CSV, JSON, PDF, and PNG exports with customizable options and format-specific settings.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              ⚡ Asynchronous Processing
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Large datasets are processed in the background with real-time progress tracking.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              🔒 Secure Sharing
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Granular permissions, password protection, and time-limited access controls.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              📱 Responsive Embeds
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate responsive embed code that works perfectly on any website or platform.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              📈 Usage Analytics
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Detailed analytics on how your shared content is being accessed and used.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              🔔 Smart Notifications
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get notified about export completions, share link access, and expiration alerts.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
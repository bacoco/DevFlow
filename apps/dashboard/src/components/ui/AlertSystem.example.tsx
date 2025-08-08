/**
 * Alert System Integration Example
 * Demonstrates how to use the real-time alert system
 */

import React, { useState } from 'react';
import { AlertCenter } from './AlertCenter';
import { AlertPreferences } from './AlertPreferences';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { alertService, createAlert, createCriticalAlert } from '../../services/alertService';

export const AlertSystemExample: React.FC = () => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences'>('alerts');

  const handleCreateTestAlert = async () => {
    await createAlert(
      'Test Alert',
      'This is a test alert to demonstrate the system',
      'medium',
      'test',
      {
        tags: ['demo', 'test'],
        metadata: { source: 'demo' },
      }
    );
  };

  const handleCreateCriticalAlert = async () => {
    await createCriticalAlert(
      'Critical System Alert',
      'This is a critical alert that requires immediate attention',
      'system',
      {
        tags: ['critical', 'system'],
        metadata: { severity: 'high', source: 'monitoring' },
      }
    );
  };

  const handleCreateSecurityAlert = async () => {
    await createAlert(
      'Security Breach Detected',
      'Suspicious activity detected from IP 192.168.1.100',
      'high',
      'security',
      {
        tags: ['security', 'breach', 'urgent'],
        metadata: { 
          ip: '192.168.1.100',
          location: 'Unknown',
          attempts: 5 
        },
      }
    );
  };

  const handleCreatePerformanceAlert = async () => {
    await createAlert(
      'High Response Time',
      'API response time has exceeded 2 seconds for the last 5 minutes',
      'medium',
      'performance',
      {
        tags: ['performance', 'api', 'latency'],
        metadata: { 
          endpoint: '/api/users',
          responseTime: '2.3s',
          threshold: '1s' 
        },
      }
    );
  };

  const handleBulkAlerts = async () => {
    const alerts = [
      { title: 'Database Connection Lost', severity: 'critical' as const, category: 'database' },
      { title: 'Memory Usage High', severity: 'high' as const, category: 'system' },
      { title: 'Disk Space Low', severity: 'medium' as const, category: 'system' },
      { title: 'SSL Certificate Expiring', severity: 'low' as const, category: 'security' },
    ];

    for (const alert of alerts) {
      await createAlert(
        alert.title,
        `Alert message for ${alert.title.toLowerCase()}`,
        alert.severity,
        alert.category,
        {
          tags: [alert.category, 'bulk-test'],
          metadata: { bulkCreated: true },
        }
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Alert System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive real-time alert management system with multiple delivery channels
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant={activeTab === 'alerts' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('alerts')}
          >
            Alert Center
          </Button>
          <Button
            variant={activeTab === 'preferences' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </Button>
        </div>
      </div>

      {/* Demo Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button
            variant="secondary"
            onClick={handleCreateTestAlert}
            className="w-full"
          >
            Test Alert
          </Button>
          
          <Button
            variant="danger"
            onClick={handleCreateCriticalAlert}
            className="w-full"
          >
            Critical Alert
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleCreateSecurityAlert}
            className="w-full"
          >
            Security Alert
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleCreatePerformanceAlert}
            className="w-full"
          >
            Performance Alert
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleBulkAlerts}
            className="w-full"
          >
            Bulk Alerts
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Alert System Features:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Real-time alert creation and updates</li>
            <li>• Multiple severity levels (low, medium, high, critical)</li>
            <li>• Alert acknowledgment and resolution</li>
            <li>• Snooze functionality with customizable durations</li>
            <li>• Automatic escalation for unacknowledged alerts</li>
            <li>• Multiple delivery channels (in-app, email, SMS, push, webhook)</li>
            <li>• User preference management</li>
            <li>• Category-based filtering and organization</li>
            <li>• Search and advanced filtering</li>
            <li>• Alert statistics and reporting</li>
          </ul>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'alerts' && (
          <AlertCenter 
            className="min-h-[600px]"
            showFilters={true}
            maxAlerts={20}
          />
        )}

        {activeTab === 'preferences' && (
          <AlertPreferences 
            className="min-h-[600px]"
            userId="demo-user"
          />
        )}
      </div>

      {/* Statistics Card */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Alert Statistics</h2>
        <AlertStatistics />
      </Card>
    </div>
  );
};

// Alert Statistics Component
const AlertStatistics: React.FC = () => {
  const [stats, setStats] = useState(alertService.getAlertStatistics());

  React.useEffect(() => {
    const unsubscribe = alertService.subscribe(() => {
      setStats(alertService.getAlertStatistics());
    });

    return unsubscribe;
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {stats.total}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">
          {stats.active}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">
          {stats.acknowledged}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Acknowledged</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {stats.resolved}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
          {stats.escalated}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Escalated</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-600">
          {stats.snoozed}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Snoozed</div>
      </div>
    </div>
  );
};

export default AlertSystemExample;
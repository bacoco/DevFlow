import React, { useState } from 'react';
import { SmartNotificationSystem } from './SmartNotificationSystem';
import { createNotification, createProductivityAlert, createSecurityAlert } from '../../services/notifications';

export const NotificationDemo: React.FC = () => {
  const [userId] = useState('demo-user-123');
  const [notifications, setNotifications] = useState<any[]>([]);

  const addProductivityAlert = () => {
    const notification = createProductivityAlert(
      'Productivity Boost',
      'Your coding velocity has increased by 25% this week!',
      userId,
      { metric: 'velocity', change: 0.25 }
    );
    setNotifications(prev => [...prev, notification]);
  };

  const addSecurityAlert = () => {
    const notification = createSecurityAlert(
      'Security Alert',
      'Unusual login activity detected from a new location.',
      userId,
      { location: 'San Francisco, CA', ip: '192.168.1.1' }
    );
    setNotifications(prev => [...prev, notification]);
  };

  const addTeamInsight = () => {
    const notification = createNotification(
      'team_insight',
      'Team Performance',
      'Your team completed 15% more tasks this sprint compared to last sprint.',
      {
        userId,
        category: 'team',
        priority: 'low',
        metadata: { improvement: 0.15, metric: 'task_completion' }
      }
    );
    setNotifications(prev => [...prev, notification]);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Smart Notification System Demo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test Notifications
          </h2>
          
          <div className="space-x-4">
            <button
              onClick={addProductivityAlert}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Productivity Alert
            </button>
            
            <button
              onClick={addSecurityAlert}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Add Security Alert
            </button>
            
            <button
              onClick={addTeamInsight}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add Team Insight
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Features Demonstrated
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Contextual Learning
              </h3>
              <p className="text-gray-600 text-sm">
                The system learns from your interaction patterns to show more relevant notifications over time.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Smart Grouping
              </h3>
              <p className="text-gray-600 text-sm">
                Similar notifications are automatically grouped to reduce noise and improve focus.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Priority-Based Display
              </h3>
              <p className="text-gray-600 text-sm">
                Notifications are styled and positioned based on their priority level and urgency.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Batch Operations
              </h3>
              <p className="text-gray-600 text-sm">
                Perform actions on multiple notifications at once with batch operations.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Escalation Management
              </h3>
              <p className="text-gray-600 text-sm">
                Important notifications can escalate through different channels based on user availability.
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Analytics & Optimization
              </h3>
              <p className="text-gray-600 text-sm">
                Comprehensive analytics help optimize notification relevance and reduce fatigue.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Current Notifications ({notifications.length})
          </h2>
          
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet. Click the buttons above to create some!</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800">{notification.title}</h4>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {notification.priority} priority
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {notification.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Smart Notification System */}
      <SmartNotificationSystem
        userId={userId}
        position="top-right"
        maxVisible={5}
        autoHide={true}
      />
    </div>
  );
};
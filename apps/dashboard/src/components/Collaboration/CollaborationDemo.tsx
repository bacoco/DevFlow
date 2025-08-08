/**
 * CollaborationDemo
 * Demo component showcasing all collaboration and social features
 */

import React, { useState } from 'react';
import { CollaborationHub } from './CollaborationHub';
import { User } from '../../services/collaboration/types';

export const CollaborationDemo: React.FC = () => {
  const [currentUser] = useState<User>({
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@example.com',
    avatar: '',
    role: 'developer',
    teamId: 'demo-team-1',
    preferences: {
      notifications: {
        email: true,
        inApp: true,
        push: false,
        frequency: 'daily',
        types: ['share', 'comment', 'achievement', 'recommendation']
      },
      privacy: {
        profileVisibility: 'team',
        activityVisibility: 'team',
        metricsVisibility: 'team',
        allowDataCollection: true
      },
      collaboration: {
        autoShare: false,
        allowAnnotations: true,
        mentionNotifications: true,
        teamInsightsParticipation: true
      }
    }
  });

  const [showFeatureInfo, setShowFeatureInfo] = useState(false);

  const features = [
    {
      title: 'Content Sharing',
      description: 'Share dashboards, charts, and insights with granular permissions and expiration controls',
      icon: '🤝',
      benefits: [
        'Granular permission control (view, edit, comment, share)',
        'Time-based expiration for sensitive content',
        'IP and device restrictions for security',
        'Notification system for recipients'
      ]
    },
    {
      title: 'Collaborative Annotations',
      description: 'Add comments, questions, and suggestions directly on dashboards and charts',
      icon: '📝',
      benefits: [
        'Context-aware annotations with precise positioning',
        'Reply threads and reactions for discussions',
        'Visibility controls (public, team, private)',
        'Resolution tracking for issues and questions'
      ]
    },
    {
      title: 'Team Insights',
      description: 'Privacy-protected team analytics with anonymized individual contributions',
      icon: '📊',
      benefits: [
        'Anonymized individual data protection',
        'Team-level productivity and collaboration metrics',
        'Industry benchmark comparisons',
        'Trend analysis with confidence scoring'
      ]
    },
    {
      title: 'Achievement System',
      description: 'Gamification through achievements, points, and leaderboards',
      icon: '🏆',
      benefits: [
        'Multiple achievement categories and difficulties',
        'Progress tracking for cumulative achievements',
        'Streak tracking for consistent behavior',
        'Team leaderboards with privacy protection'
      ]
    },
    {
      title: 'Social Learning',
      description: 'Best practice sharing with personalized recommendations',
      icon: '📚',
      benefits: [
        'Personalized learning recommendations',
        'Community-driven best practices',
        'Implementation tracking and feedback',
        'Trending content discovery'
      ]
    }
  ];

  return (
    <div className="collaboration-demo min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Collaboration & Social Features Demo
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Interactive Demo
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFeatureInfo(!showFeatureInfo)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showFeatureInfo ? 'Hide' : 'Show'} Feature Info
              </button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {currentUser.name.charAt(0)}
                  </span>
                </div>
                <span>{currentUser.name}</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Information Panel */}
      {showFeatureInfo && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              Collaboration Features Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{feature.icon}</span>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Key Benefits:
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-1">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Privacy & Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-1">Data Protection:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Individual metrics are anonymized in team insights</li>
                    <li>• Granular sharing permissions with expiration controls</li>
                    <li>• User consent required for data collection</li>
                    <li>• Automatic data cleanup after retention period</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Access Control:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Role-based access to collaboration features</li>
                    <li>• IP and device restrictions for sensitive content</li>
                    <li>• Annotation visibility controls</li>
                    <li>• Team-level privacy settings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
          <CollaborationHub
            currentUser={currentUser}
            teamId="demo-team-1"
            className="h-full"
          />
        </div>
      </div>

      {/* Demo Instructions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            🎮 How to Use This Demo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Getting Started:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Click on any feature button in the collaboration toolbar</li>
                <li>Explore the different panels (Share, Annotations, Insights, etc.)</li>
                <li>Try creating new content like shares or annotations</li>
                <li>Check out your achievements and learning recommendations</li>
                <li>View team insights with privacy-protected data</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Demo Features:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>All data is simulated for demonstration purposes</li>
                <li>Real-time notifications show collaboration activity</li>
                <li>Achievement system tracks your demo interactions</li>
                <li>Best practices include interactive examples</li>
                <li>Team insights use anonymized sample data</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-900">Demo Note</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  This is a fully functional demo with simulated data. In a production environment, 
                  all features would integrate with real user data, team metrics, and external systems 
                  while maintaining strict privacy and security controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationDemo;
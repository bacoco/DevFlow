/**
 * CollaborationHub
 * Main component that orchestrates all collaboration and social features
 */

import React, { useState, useEffect } from 'react';
import { SharePanel } from './SharePanel';
import { AnnotationPanel } from './AnnotationPanel';
import { TeamInsightsPanel } from './TeamInsightsPanel';
import { AchievementPanel } from './AchievementPanel';
import { SocialLearningPanel } from './SocialLearningPanel';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  SharedContent,
  Annotation,
  TeamInsights,
  UserAchievement,
  BestPractice,
  CollaborationEvent
} from '../../services/collaboration/types';

interface CollaborationHubProps {
  currentUser: User;
  teamId: string;
  className?: string;
}

type ActivePanel = 'share' | 'annotations' | 'insights' | 'achievements' | 'learning' | null;

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  currentUser,
  teamId,
  className = ''
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [collaborationManager] = useState(() => new CollaborationManager());
  
  // State for different collaboration features
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [teamInsights, setTeamInsights] = useState<TeamInsights | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [bestPractices, setBestPractices] = useState<BestPractice[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<CollaborationEvent[]>([]);

  useEffect(() => {
    // Initialize collaboration features
    initializeCollaboration();
    
    // Set up event listeners
    setupEventListeners();
    
    return () => {
      // Cleanup event listeners
      cleanupEventListeners();
    };
  }, [currentUser.id, teamId]);

  const initializeCollaboration = async () => {
    try {
      // Load initial data
      await Promise.all([
        loadSharedContent(),
        loadUserAchievements(),
        loadBestPractices(),
        loadTeamInsights()
      ]);
    } catch (error) {
      console.error('Failed to initialize collaboration features:', error);
    }
  };

  const setupEventListeners = () => {
    // Listen for collaboration events
    collaborationManager.addEventListener('content_shared', handleContentShared);
    collaborationManager.addEventListener('annotation_created', handleAnnotationCreated);
    collaborationManager.addEventListener('achievement_unlocked', handleAchievementUnlocked);
    collaborationManager.addEventListener('team_insights_generated', handleTeamInsightsGenerated);
  };

  const cleanupEventListeners = () => {
    collaborationManager.removeEventListener('content_shared', handleContentShared);
    collaborationManager.removeEventListener('annotation_created', handleAnnotationCreated);
    collaborationManager.removeEventListener('achievement_unlocked', handleAchievementUnlocked);
    collaborationManager.removeEventListener('team_insights_generated', handleTeamInsightsGenerated);
  };

  // Event handlers
  const handleContentShared = (event: CollaborationEvent) => {
    setNotifications(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 notifications
    loadSharedContent(); // Refresh shared content
  };

  const handleAnnotationCreated = (event: CollaborationEvent) => {
    setNotifications(prev => [event, ...prev.slice(0, 9)]);
    // Refresh annotations if viewing annotation panel
    if (activePanel === 'annotations') {
      loadAnnotations();
    }
  };

  const handleAchievementUnlocked = (event: CollaborationEvent) => {
    setNotifications(prev => [event, ...prev.slice(0, 9)]);
    loadUserAchievements(); // Refresh achievements
    
    // Show celebration animation
    showAchievementCelebration(event.targetId);
  };

  const handleTeamInsightsGenerated = (event: CollaborationEvent) => {
    loadTeamInsights(); // Refresh team insights
  };

  // Data loading functions
  const loadSharedContent = async () => {
    setLoading(prev => ({ ...prev, sharedContent: true }));
    try {
      const response = await collaborationManager.getSharedContent(currentUser.id);
      if (response.success && response.data) {
        setSharedContent(response.data);
      }
    } catch (error) {
      console.error('Failed to load shared content:', error);
    } finally {
      setLoading(prev => ({ ...prev, sharedContent: false }));
    }
  };

  const loadAnnotations = async () => {
    setLoading(prev => ({ ...prev, annotations: true }));
    try {
      // Load annotations for current context (simplified)
      const response = await collaborationManager.getAnnotations('dashboard', 'current');
      if (response.success && response.data) {
        setAnnotations(response.data);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoading(prev => ({ ...prev, annotations: false }));
    }
  };

  const loadUserAchievements = async () => {
    setLoading(prev => ({ ...prev, achievements: true }));
    try {
      const response = await collaborationManager.getUserAchievements(currentUser.id);
      if (response.success && response.data) {
        setUserAchievements(response.data);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(prev => ({ ...prev, achievements: false }));
    }
  };

  const loadBestPractices = async () => {
    setLoading(prev => ({ ...prev, bestPractices: true }));
    try {
      const response = await collaborationManager.getBestPractices();
      if (response.success && response.data) {
        setBestPractices(response.data);
      }
    } catch (error) {
      console.error('Failed to load best practices:', error);
    } finally {
      setLoading(prev => ({ ...prev, bestPractices: false }));
    }
  };

  const loadTeamInsights = async () => {
    setLoading(prev => ({ ...prev, teamInsights: true }));
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const response = await collaborationManager.getTeamInsights(teamId, {
        start: startDate,
        end: endDate
      });
      
      if (response.success && response.data) {
        setTeamInsights(response.data);
      }
    } catch (error) {
      console.error('Failed to load team insights:', error);
    } finally {
      setLoading(prev => ({ ...prev, teamInsights: false }));
    }
  };

  const showAchievementCelebration = (achievementId: string) => {
    // Trigger celebration animation/notification
    console.log(`🎉 Achievement unlocked: ${achievementId}`);
    // In a real implementation, this would trigger a toast notification or modal
  };

  const handlePanelToggle = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const getNotificationCount = () => {
    return notifications.length;
  };

  const getUnreadNotifications = () => {
    // In a real implementation, would track read status
    return notifications.slice(0, 3);
  };

  return (
    <div className={`collaboration-hub ${className}`}>
      {/* Collaboration Toolbar */}
      <div className="collaboration-toolbar bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Collaboration Hub
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* Notification indicator */}
            {getNotificationCount() > 0 && (
              <div className="relative">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 relative"
                  title={`${getNotificationCount()} new notifications`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getNotificationCount()}
                  </span>
                </button>
              </div>
            )}

            {/* Panel toggle buttons */}
            <div className="flex space-x-1">
              <button
                onClick={() => handlePanelToggle('share')}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'share'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Share Content"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>

              <button
                onClick={() => handlePanelToggle('annotations')}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'annotations'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Annotations"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => handlePanelToggle('insights')}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'insights'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Team Insights"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </button>

              <button
                onClick={() => handlePanelToggle('achievements')}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'achievements'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Achievements"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                onClick={() => handlePanelToggle('learning')}
                className={`p-2 rounded-md text-sm font-medium transition-colors ${
                  activePanel === 'learning'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Social Learning"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Recent notifications */}
        {getUnreadNotifications().length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <strong>Recent Activity:</strong>
              {getUnreadNotifications().map((notification, index) => (
                <div key={index} className="mt-1">
                  {formatNotification(notification)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Panel Content */}
      <div className="collaboration-content">
        {activePanel === 'share' && (
          <SharePanel
            currentUser={currentUser}
            collaborationManager={collaborationManager}
            sharedContent={sharedContent}
            loading={loading.sharedContent}
            onContentShared={loadSharedContent}
          />
        )}

        {activePanel === 'annotations' && (
          <AnnotationPanel
            currentUser={currentUser}
            collaborationManager={collaborationManager}
            annotations={annotations}
            loading={loading.annotations}
            onAnnotationCreated={loadAnnotations}
          />
        )}

        {activePanel === 'insights' && (
          <TeamInsightsPanel
            teamId={teamId}
            currentUser={currentUser}
            collaborationManager={collaborationManager}
            teamInsights={teamInsights}
            loading={loading.teamInsights}
            onInsightsRefresh={loadTeamInsights}
          />
        )}

        {activePanel === 'achievements' && (
          <AchievementPanel
            currentUser={currentUser}
            collaborationManager={collaborationManager}
            userAchievements={userAchievements}
            loading={loading.achievements}
            onAchievementUpdate={loadUserAchievements}
          />
        )}

        {activePanel === 'learning' && (
          <SocialLearningPanel
            currentUser={currentUser}
            collaborationManager={collaborationManager}
            bestPractices={bestPractices}
            loading={loading.bestPractices}
            onLearningUpdate={loadBestPractices}
          />
        )}

        {!activePanel && (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Collaboration Hub
            </h3>
            <p className="text-gray-500 mb-4">
              Choose a feature above to start collaborating with your team
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <strong>Share</strong> dashboards and insights
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <strong>Annotate</strong> charts and widgets
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <strong>View</strong> team insights
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <strong>Learn</strong> best practices
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function formatNotification(notification: CollaborationEvent): string {
    switch (notification.type) {
      case 'content_shared':
        return `New content shared by ${notification.userId}`;
      case 'annotation_created':
        return `New annotation added by ${notification.userId}`;
      case 'achievement_unlocked':
        return `Achievement unlocked: ${notification.targetId}`;
      case 'team_insights_generated':
        return 'Team insights updated';
      default:
        return 'New activity';
    }
  }
};

export default CollaborationHub;
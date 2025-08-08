import React, { useCallback } from 'react';
import { Widget } from './Widget';
import { Widget as WidgetType } from '../../types/dashboard';
import { ActivityFeed, ActivityItem } from '../ui/ActivityFeed';

interface ActivityFeedWidgetProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
}

// Mock data generator for the widget
const generateMockActivities = (count: number, offset: number = 0): Promise<ActivityItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const activities: ActivityItem[] = [];
      const types = ['commit', 'pull_request', 'comment', 'bug', 'task_complete', 'review'] as const;
      const users = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
        { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
        { id: '5', name: 'Alex Chen', email: 'alex@example.com' },
      ];
      const repositories = ['frontend-app', 'backend-api', 'mobile-app', 'dashboard'];

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const repo = repositories[Math.floor(Math.random() * repositories.length)];
        const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        activities.push({
          id: `activity-${offset + i}`,
          type,
          title: `${type.replace('_', ' ')} in ${repo}`,
          description: `Sample ${type} activity description for testing purposes.`,
          user,
          timestamp,
          metadata: {
            repository: repo,
            branch: Math.random() > 0.5 ? 'main' : 'develop',
            commitHash: Math.random().toString(36).substring(2, 9),
            pullRequestId: Math.floor(Math.random() * 1000).toString(),
            priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
            tags: ['feature', 'bugfix', 'hotfix'].slice(0, Math.floor(Math.random() * 3) + 1)
          }
        });
      }

      resolve(activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    }, 300); // Simulate API delay
  });
};

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  loading,
  error,
}) => {
  // Handle activity item clicks
  const handleActivityClick = useCallback((activity: ActivityItem) => {
    // In a real implementation, this might open a modal, navigate to details, etc.
    console.log('Activity clicked:', activity);
    
    // Example: Open external URL if available
    if (activity.metadata?.url) {
      window.open(activity.metadata.url, '_blank');
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  return (
    <Widget
      widget={widget}
      onRefresh={onRefresh}
      onConfigure={onConfigure}
      onRemove={onRemove}
      loading={loading}
      error={error}
    >
      <ActivityFeed
        height={widget.size?.height || 400}
        enableRealTime={true}
        enableFiltering={true}
        enableSearch={true}
        onItemClick={handleActivityClick}
        onRefresh={handleRefresh}
        fetchActivities={generateMockActivities}
        emptyMessage="No recent activities found"
        loadingMessage="Loading activities..."
        filters={{
          // Add any widget-specific filters here
          teamId: widget.config?.teamId,
          repository: widget.config?.repository
        }}
      />
    </Widget>
  );
};

export default ActivityFeedWidget;
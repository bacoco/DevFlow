import React from 'react';
import { ActivityFeed, ActivityItem } from './ActivityFeed';

// Example usage of the ActivityFeed component
const ActivityFeedExample: React.FC = () => {
  // Mock data for demonstration
  const mockFetchActivities = async (offset: number, limit: number): Promise<ActivityItem[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const activities: ActivityItem[] = [];
    const types = ['commit', 'pull_request', 'comment', 'bug', 'task_complete', 'review', 'deployment', 'merge'] as const;
    const users = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
      { id: '5', name: 'Alex Chen', email: 'alex@example.com' },
    ];
    const repositories = ['frontend-app', 'backend-api', 'mobile-app', 'dashboard', 'shared-lib'];

    for (let i = 0; i < limit; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const repo = repositories[Math.floor(Math.random() * repositories.length)];
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

      activities.push({
        id: `activity-${offset + i}`,
        type,
        title: `${type.replace('_', ' ')} in ${repo}`,
        description: `Sample ${type} activity description for testing virtual scrolling and real-time updates. This demonstrates the comprehensive activity feed component.`,
        user,
        timestamp,
        metadata: {
          repository: repo,
          branch: Math.random() > 0.5 ? 'main' : 'develop',
          commitHash: Math.random().toString(36).substring(2, 9),
          pullRequestId: Math.floor(Math.random() * 1000).toString(),
          priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          tags: ['feature', 'bugfix', 'hotfix', 'refactor', 'docs'].slice(0, Math.floor(Math.random() * 3) + 1),
          url: `https://github.com/example/${repo}/commit/${Math.random().toString(36).substring(2, 9)}`
        },
        isNew: Math.random() > 0.9 // 10% chance of being new
      });
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const handleActivityClick = (activity: ActivityItem) => {
    console.log('Activity clicked:', activity);
    
    // Example: Open external URL if available
    if (activity.metadata?.url) {
      window.open(activity.metadata.url, '_blank');
    }
  };

  const handleRefresh = () => {
    console.log('Refreshing activity feed...');
  };

  return (
    <div className="w-full h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Activity Feed Example
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <ActivityFeed
            height={600}
            itemHeight={120}
            enableRealTime={true}
            enableFiltering={true}
            enableSearch={true}
            onItemClick={handleActivityClick}
            onRefresh={handleRefresh}
            fetchActivities={mockFetchActivities}
            emptyMessage="No activities found. Try adjusting your filters or check back later."
            loadingMessage="Loading activities..."
            filters={{
              // Example filters
              teamId: 'team-1',
              repository: undefined // Show all repositories
            }}
            className="border-0"
          />
        </div>

        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <h2 className="font-semibold mb-2">Features Demonstrated:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Virtual scrolling for performance with large datasets</li>
            <li>Real-time activity updates with smooth animations</li>
            <li>Advanced filtering by activity type, priority, and date range</li>
            <li>Full-text search across titles, descriptions, users, and metadata</li>
            <li>Infinite scroll loading with loading states</li>
            <li>Accessibility support with keyboard navigation and screen reader compatibility</li>
            <li>Responsive design with dark theme support</li>
            <li>Interactive activity items with click handlers</li>
            <li>Error handling and retry mechanisms</li>
            <li>Offline indicator and connection status</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeedExample;
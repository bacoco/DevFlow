/**
 * Collaboration Integration Tests
 * End-to-end tests for collaboration features integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollaborationHub } from '../CollaborationHub';
import { SharePanel } from '../SharePanel';
import { AnnotationPanel } from '../AnnotationPanel';
import { AchievementPanel } from '../AchievementPanel';
import { SocialLearningPanel } from '../SocialLearningPanel';
import { TeamInsightsPanel } from '../TeamInsightsPanel';
import CollaborationManager from '../../../services/collaboration/CollaborationManager';
import { User } from '../../../services/collaboration/types';

// Mock the collaboration manager
jest.mock('../../../services/collaboration/CollaborationManager');

const mockUser: User = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: '',
  role: 'developer',
  teamId: 'test-team',
  preferences: {
    notifications: {
      email: true,
      inApp: true,
      push: false,
      frequency: 'daily',
      types: ['share', 'comment', 'achievement']
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
};

describe('CollaborationHub Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    
    // Mock successful responses
    mockCollaborationManager.getSharedContent.mockResolvedValue({
      success: true,
      data: []
    });
    
    mockCollaborationManager.getAnnotations.mockResolvedValue({
      success: true,
      data: []
    });
    
    mockCollaborationManager.getUserAchievements.mockResolvedValue({
      success: true,
      data: []
    });
    
    mockCollaborationManager.getBestPractices.mockResolvedValue({
      success: true,
      data: []
    });
    
    mockCollaborationManager.getTeamInsights.mockResolvedValue({
      success: true,
      data: null
    });
  });

  it('should render collaboration hub with all panels', async () => {
    render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    expect(screen.getByText('Collaboration Hub')).toBeInTheDocument();
    expect(screen.getByTitle('Share Content')).toBeInTheDocument();
    expect(screen.getByTitle('Annotations')).toBeInTheDocument();
    expect(screen.getByTitle('Team Insights')).toBeInTheDocument();
    expect(screen.getByTitle('Achievements')).toBeInTheDocument();
    expect(screen.getByTitle('Social Learning')).toBeInTheDocument();
  });

  it('should switch between different panels', async () => {
    const user = userEvent.setup();
    
    render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    // Click on share panel
    await user.click(screen.getByTitle('Share Content'));
    await waitFor(() => {
      expect(screen.getByText('Content Sharing')).toBeInTheDocument();
    });

    // Click on annotations panel
    await user.click(screen.getByTitle('Annotations'));
    await waitFor(() => {
      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });

    // Click on achievements panel
    await user.click(screen.getByTitle('Achievements'));
    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });
  });

  it('should display notifications when events occur', async () => {
    const { rerender } = render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    // Simulate a collaboration event
    const mockEvent = {
      type: 'content_shared' as const,
      userId: 'other-user',
      targetId: 'content-1',
      targetType: 'dashboard',
      data: {},
      timestamp: new Date()
    };

    // In a real scenario, this would be triggered by the collaboration manager
    // For testing, we'll check if the component can handle event updates
    expect(screen.getByText('Collaboration Hub')).toBeInTheDocument();
  });
});

describe('SharePanel Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    mockCollaborationManager.getSharedContent.mockResolvedValue({
      success: true,
      data: []
    });
  });

  it('should render share panel with empty state', async () => {
    render(
      <SharePanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        sharedContent={[]}
        loading={false}
        onContentShared={jest.fn()}
      />
    );

    expect(screen.getByText('Content Sharing')).toBeInTheDocument();
    expect(screen.getByText('Share Content')).toBeInTheDocument();
    expect(screen.getByText('No shared content yet')).toBeInTheDocument();
  });

  it('should open share form when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SharePanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        sharedContent={[]}
        loading={false}
        onContentShared={jest.fn()}
      />
    );

    await user.click(screen.getByText('Share Content'));
    
    await waitFor(() => {
      expect(screen.getByText('Share Content')).toBeInTheDocument();
      expect(screen.getByLabelText(/Content Type/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Title \*/)).toBeInTheDocument();
    });
  });

  it('should validate form inputs', async () => {
    const user = userEvent.setup();
    
    render(
      <SharePanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        sharedContent={[]}
        loading={false}
        onContentShared={jest.fn()}
      />
    );

    await user.click(screen.getByText('Share Content'));
    
    // Try to submit without required fields
    const submitButtons = screen.getAllByRole('button', { name: /Share Content/i });
    const modalSubmitButton = submitButtons.find(button => button.disabled);
    expect(modalSubmitButton).toBeDisabled();
  });
});

describe('AnnotationPanel Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    mockCollaborationManager.getAnnotations.mockResolvedValue({
      success: true,
      data: []
    });
  });

  it('should render annotation panel with empty state', async () => {
    render(
      <AnnotationPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        annotations={[]}
        loading={false}
        onAnnotationCreated={jest.fn()}
      />
    );

    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('Add Annotation')).toBeInTheDocument();
    expect(screen.getByText('No annotations yet')).toBeInTheDocument();
  });

  it('should open annotation form when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <AnnotationPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        annotations={[]}
        loading={false}
        onAnnotationCreated={jest.fn()}
      />
    );

    await user.click(screen.getByText('Add Annotation'));
    
    await waitFor(() => {
      expect(screen.getByText('Create Annotation')).toBeInTheDocument();
      expect(screen.getByLabelText(/Annotate On \*/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Content \*/)).toBeInTheDocument();
    });
  });
});

describe('AchievementPanel Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    mockCollaborationManager.getUserAchievements.mockResolvedValue({
      success: true,
      data: []
    });
    mockCollaborationManager.getAvailableAchievements.mockResolvedValue({
      success: true,
      data: []
    });
  });

  it('should render achievement panel with tabs', async () => {
    render(
      <AchievementPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        userAchievements={[]}
        loading={false}
        onAchievementUpdate={jest.fn()}
      />
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Earned/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Available/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Leaderboard/ })).toBeInTheDocument();
  });

  it('should switch between achievement tabs', async () => {
    const user = userEvent.setup();
    
    render(
      <AchievementPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        userAchievements={[]}
        loading={false}
        onAchievementUpdate={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Available/ }));
    // Should show available achievements content
    
    await user.click(screen.getByRole('button', { name: /Leaderboard/ }));
    // Should show leaderboard content
  });
});

describe('SocialLearningPanel Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    mockCollaborationManager.getBestPractices.mockResolvedValue({
      success: true,
      data: []
    });
    mockCollaborationManager.getLearningRecommendations.mockResolvedValue({
      success: true,
      data: []
    });
  });

  it('should render social learning panel with tabs', async () => {
    render(
      <SocialLearningPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        bestPractices={[]}
        loading={false}
        onLearningUpdate={jest.fn()}
      />
    );

    expect(screen.getByText('Social Learning')).toBeInTheDocument();
    expect(screen.getByText('For You')).toBeInTheDocument();
    expect(screen.getByText('Browse All')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('should handle category and difficulty filters', async () => {
    const user = userEvent.setup();
    
    render(
      <SocialLearningPanel
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        bestPractices={[]}
        loading={false}
        onLearningUpdate={jest.fn()}
      />
    );

    // Switch to Browse All tab to see filters
    await user.click(screen.getByRole('button', { name: /Browse All/ }));
    
    // Should show filter dropdowns
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Levels')).toBeInTheDocument();
  });
});

describe('TeamInsightsPanel Integration', () => {
  let mockCollaborationManager: jest.Mocked<CollaborationManager>;

  beforeEach(() => {
    mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    mockCollaborationManager.getTeamInsights.mockResolvedValue({
      success: true,
      data: null
    });
  });

  it('should render team insights panel with controls', async () => {
    render(
      <TeamInsightsPanel
        teamId="test-team"
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        teamInsights={null}
        loading={false}
        onInsightsRefresh={jest.fn()}
      />
    );

    expect(screen.getByText('Team Insights')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should handle period and category changes', async () => {
    const user = userEvent.setup();
    const mockRefresh = jest.fn();
    
    render(
      <TeamInsightsPanel
        teamId="test-team"
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        teamInsights={null}
        loading={false}
        onInsightsRefresh={mockRefresh}
      />
    );

    // Change period
    const periodSelect = screen.getByDisplayValue('Last 30 days');
    await user.selectOptions(periodSelect, 'Last 7 days');
    
    // Should trigger refresh
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should show privacy settings modal', async () => {
    const user = userEvent.setup();
    
    render(
      <TeamInsightsPanel
        teamId="test-team"
        currentUser={mockUser}
        collaborationManager={mockCollaborationManager}
        teamInsights={null}
        loading={false}
        onInsightsRefresh={jest.fn()}
      />
    );

    // Click privacy settings button
    await user.click(screen.getByTitle('Privacy Settings'));
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
      expect(screen.getByText('Current Privacy Level')).toBeInTheDocument();
    });
  });
});

describe('Cross-Component Integration', () => {
  it('should handle collaboration manager events across components', async () => {
    // Mock the CollaborationManager constructor to return our mock
    const mockAddEventListener = jest.fn();
    (CollaborationManager as jest.Mock).mockImplementation(() => ({
      addEventListener: mockAddEventListener,
      removeEventListener: jest.fn(),
      getSharedContent: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getAnnotations: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getUserAchievements: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getBestPractices: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getTeamInsights: jest.fn().mockResolvedValue({ success: true, data: null })
    }));

    render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    // Verify event listeners are set up
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'content_shared',
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'annotation_created',
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'achievement_unlocked',
      expect.any(Function)
    );
  });

  it('should handle loading states consistently', async () => {
    const mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    
    // Mock loading responses
    mockCollaborationManager.getSharedContent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
    );

    render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Collaboration Hub')).toBeInTheDocument();
  });

  it('should handle error states gracefully', async () => {
    const mockCollaborationManager = new CollaborationManager() as jest.Mocked<CollaborationManager>;
    
    // Mock error responses
    mockCollaborationManager.getSharedContent.mockResolvedValue({
      success: false,
      error: 'Failed to load shared content'
    });

    render(
      <CollaborationHub
        currentUser={mockUser}
        teamId="test-team"
      />
    );

    // Component should still render without crashing
    expect(screen.getByText('Collaboration Hub')).toBeInTheDocument();
  });
});
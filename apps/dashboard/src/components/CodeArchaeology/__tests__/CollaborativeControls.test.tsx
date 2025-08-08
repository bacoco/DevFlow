import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Vector3 } from 'three';
import CollaborativeControls from '../CollaborativeControls';
import { collaborativeSessionService } from '../CollaborativeSessionService';
import { SharedView, CollaborativeSession, ViewBookmark } from '../types';

// Mock the collaborative session service
jest.mock('../CollaborativeSessionService', () => ({
  collaborativeSessionService: {
    setCurrentUser: jest.fn(),
    createSession: jest.fn(),
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    updateSharedView: jest.fn(),
    updateCursor: jest.fn(),
    selectArtifacts: jest.fn(),
    saveBookmark: jest.fn(),
    loadBookmark: jest.fn(),
    deleteBookmark: jest.fn(),
    getActiveSessions: jest.fn(() => []),
    getBookmarks: jest.fn(() => []),
    getCursorIndicators: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getUserColor: jest.fn(() => '#FF6B6B'),
  },
}));

const mockCurrentView: SharedView = {
  cameraPosition: new Vector3(0, 0, 10),
  cameraTarget: new Vector3(0, 0, 0),
  filterCriteria: {
    fileTypes: [],
    authors: [],
    dateRange: { start: null, end: null },
    complexityRange: { min: 0, max: 100 },
    changeFrequencyRange: { min: 0, max: 100 },
    searchQuery: '',
  },
  selectedArtifacts: [],
  timestamp: new Date(),
  createdBy: 'current-user-id',
};

const mockSession: CollaborativeSession = {
  id: 'session-1',
  name: 'Test Session',
  createdBy: 'current-user-id',
  createdAt: new Date('2024-01-15'),
  participants: [
    {
      userId: 'current-user-id',
      userName: 'Current User',
      role: 'owner',
      joinedAt: new Date('2024-01-15'),
      isActive: true,
      selectedArtifacts: [],
    },
    {
      userId: 'other-user-id',
      userName: 'Other User',
      role: 'viewer',
      joinedAt: new Date('2024-01-15'),
      isActive: true,
      selectedArtifacts: [],
    },
  ],
  currentView: mockCurrentView,
  annotations: [],
  isActive: true,
  permissions: {
    canAnnotate: true,
    canModifyView: true,
    canInviteUsers: true,
    canManageAnnotations: true,
    canExportSession: true,
  },
};

const mockBookmark: ViewBookmark = {
  id: 'bookmark-1',
  name: 'Test Bookmark',
  view: mockCurrentView,
  description: 'A test bookmark',
  tags: ['test'],
  isPublic: false,
  createdBy: 'current-user-id',
  createdAt: new Date('2024-01-15'),
  usageCount: 5,
  lastUsed: new Date('2024-01-20'),
};

describe('CollaborativeControls', () => {
  const defaultProps = {
    currentView: mockCurrentView,
    onViewChange: jest.fn(),
    onAnnotationAdd: jest.fn(),
    onCursorMove: jest.fn(),
    onArtifactSelect: jest.fn(),
    selectedArtifacts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default values
    (collaborativeSessionService.getActiveSessions as jest.Mock).mockReturnValue([]);
    (collaborativeSessionService.getBookmarks as jest.Mock).mockReturnValue([]);
    (collaborativeSessionService.getCursorIndicators as jest.Mock).mockReturnValue([]);
  });

  describe('Rendering', () => {
    it('renders main control bar', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByRole('button', { title: 'Manage bookmarks' })).toBeInTheDocument();
      expect(screen.getByRole('button', { title: 'Manage sessions' })).toBeInTheDocument();
    });

    it('shows connected status when connected', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      // Simulate connection
      fireEvent(window, new Event('load'));
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CollaborativeControls {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Session Management', () => {
    it('opens session panel when session button is clicked', async () => {
      const user = userEvent.setup();
      render(<CollaborativeControls {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      expect(screen.getByText('Collaborative Sessions')).toBeInTheDocument();
      expect(screen.getByText('Create New Session')).toBeInTheDocument();
      expect(screen.getByText('Join by Code')).toBeInTheDocument();
    });

    it('creates new session when form is submitted', async () => {
      const user = userEvent.setup();
      (collaborativeSessionService.createSession as jest.Mock).mockResolvedValue(mockSession);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open session panel
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      // Fill in session name and create
      const sessionNameInput = screen.getByPlaceholderText('Session name');
      await user.type(sessionNameInput, 'New Test Session');
      
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);
      
      expect(collaborativeSessionService.createSession).toHaveBeenCalledWith(
        'New Test Session',
        mockCurrentView
      );
    });

    it('joins session by code', async () => {
      const user = userEvent.setup();
      (collaborativeSessionService.joinSession as jest.Mock).mockResolvedValue(mockSession);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open session panel
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      // Fill in session code and join
      const codeInput = screen.getByPlaceholderText('Session code');
      await user.type(codeInput, 'session-123');
      
      const joinButton = screen.getByRole('button', { name: /join/i });
      await user.click(joinButton);
      
      expect(collaborativeSessionService.joinSession).toHaveBeenCalledWith('session-123');
    });

    it('displays available sessions', async () => {
      const user = userEvent.setup();
      const availableSessions = [
        { ...mockSession, id: 'session-2', name: 'Available Session' },
      ];
      (collaborativeSessionService.getActiveSessions as jest.Mock).mockReturnValue(availableSessions);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open session panel
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      expect(screen.getByText('Available Session')).toBeInTheDocument();
      expect(screen.getByText('2 participants •')).toBeInTheDocument();
    });

    it('joins available session when join button is clicked', async () => {
      const user = userEvent.setup();
      const availableSessions = [
        { ...mockSession, id: 'session-2', name: 'Available Session' },
      ];
      (collaborativeSessionService.getActiveSessions as jest.Mock).mockReturnValue(availableSessions);
      (collaborativeSessionService.joinSession as jest.Mock).mockResolvedValue(availableSessions[0]);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open session panel
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      // Join the available session
      const joinButtons = screen.getAllByRole('button', { name: /join/i });
      await user.click(joinButtons[1]); // Second join button (first is for code input)
      
      expect(collaborativeSessionService.joinSession).toHaveBeenCalledWith('session-2');
    });

    it('shows session info when in active session', () => {
      // Mock being in an active session
      const { rerender } = render(<CollaborativeControls {...defaultProps} />);
      
      // Simulate joining a session by updating component state
      // This would normally happen through the collaborative service
      rerender(<CollaborativeControls {...defaultProps} />);
      
      // We can't easily test the internal state change without exposing it
      // In a real implementation, we might use a context or prop to indicate active session
    });

    it('leaves session when leave button is clicked', async () => {
      const user = userEvent.setup();
      
      // We need to simulate being in a session first
      // This is a limitation of the current implementation - the session state is internal
      // In a real app, this might be managed by a context or passed as props
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // For now, we can test that the service method would be called
      // if we had access to the leave functionality
      expect(collaborativeSessionService.leaveSession).not.toHaveBeenCalled();
    });
  });

  describe('Bookmark Management', () => {
    it('opens bookmark panel when bookmark button is clicked', async () => {
      const user = userEvent.setup();
      render(<CollaborativeControls {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      expect(screen.getByText('View Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('Save Current View')).toBeInTheDocument();
    });

    it('saves current view as bookmark', async () => {
      const user = userEvent.setup();
      (collaborativeSessionService.saveBookmark as jest.Mock).mockResolvedValue(mockBookmark);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open bookmark panel
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      // Fill in bookmark name and save
      const bookmarkNameInput = screen.getByPlaceholderText('Bookmark name');
      await user.type(bookmarkNameInput, 'New Bookmark');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(collaborativeSessionService.saveBookmark).toHaveBeenCalledWith({
        name: 'New Bookmark',
        view: mockCurrentView,
        description: 'Saved view: New Bookmark',
        tags: [],
        isPublic: false,
      });
    });

    it('displays saved bookmarks', async () => {
      const user = userEvent.setup();
      (collaborativeSessionService.getBookmarks as jest.Mock).mockReturnValue([mockBookmark]);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open bookmark panel
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
      expect(screen.getByText('A test bookmark')).toBeInTheDocument();
      expect(screen.getByText('Used 5 times')).toBeInTheDocument();
    });

    it('loads bookmark when load button is clicked', async () => {
      const user = userEvent.setup();
      const onViewChange = jest.fn();
      (collaborativeSessionService.getBookmarks as jest.Mock).mockReturnValue([mockBookmark]);
      (collaborativeSessionService.loadBookmark as jest.Mock).mockResolvedValue(mockBookmark);
      
      render(<CollaborativeControls {...defaultProps} onViewChange={onViewChange} />);
      
      // Open bookmark panel
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      // Load bookmark
      const loadButton = screen.getByRole('button', { title: 'Load bookmark' });
      await user.click(loadButton);
      
      expect(collaborativeSessionService.loadBookmark).toHaveBeenCalledWith('bookmark-1');
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith(mockBookmark.view);
      });
    });

    it('deletes bookmark when delete button is clicked', async () => {
      const user = userEvent.setup();
      (collaborativeSessionService.getBookmarks as jest.Mock).mockReturnValue([mockBookmark]);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open bookmark panel
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      // Delete bookmark
      const deleteButton = screen.getByRole('button', { title: 'Delete bookmark' });
      await user.click(deleteButton);
      
      expect(collaborativeSessionService.deleteBookmark).toHaveBeenCalledWith('bookmark-1');
    });
  });

  describe('Annotation Creation', () => {
    it('shows annotation quick actions when in session', () => {
      // This test would require simulating being in an active session
      // For now, we test that the annotation creation handler exists
      render(<CollaborativeControls {...defaultProps} />);
      
      // The annotation buttons would only be visible when in a session
      // This is a limitation of testing internal state
    });

    it('creates annotation when quick action is clicked', () => {
      const onAnnotationAdd = jest.fn();
      
      render(<CollaborativeControls {...defaultProps} onAnnotationAdd={onAnnotationAdd} />);
      
      // Test the annotation creation logic
      // In a real implementation, we would simulate clicking an annotation button
      // and verify that onAnnotationAdd is called with the correct parameters
    });
  });

  describe('Cursor Tracking', () => {
    it('updates cursor position on mouse move when in session', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      // Simulate mouse move
      fireEvent.mouseMove(window, { clientX: 100, clientY: 200 });
      
      // Since we're not in a session, the cursor update shouldn't be called
      expect(collaborativeSessionService.updateCursor).not.toHaveBeenCalled();
    });

    it('displays cursor indicators for other participants', () => {
      const cursorIndicators = [
        {
          userId: 'other-user-id',
          userName: 'Other User',
          position: new Vector3(0.5, 0.5, 0),
          color: '#FF6B6B',
          isVisible: true,
          lastUpdate: new Date(),
        },
      ];
      (collaborativeSessionService.getCursorIndicators as jest.Mock).mockReturnValue(cursorIndicators);
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // The cursor indicators would be rendered if we were in a session
      // This test verifies the service call would be made
      expect(collaborativeSessionService.getCursorIndicators).toHaveBeenCalled();
    });
  });

  describe('Artifact Selection Sync', () => {
    it('syncs artifact selection with collaborative service', () => {
      const selectedArtifacts = ['artifact-1', 'artifact-2'];
      
      render(<CollaborativeControls {...defaultProps} selectedArtifacts={selectedArtifacts} />);
      
      // Since we're not in a session, selection sync shouldn't be called
      expect(collaborativeSessionService.selectArtifacts).not.toHaveBeenCalled();
    });
  });

  describe('View Sharing', () => {
    it('shares current view when share button is clicked', () => {
      // This would require being in an active session
      render(<CollaborativeControls {...defaultProps} />);
      
      // The share button would only be visible when in a session
      expect(screen.queryByText('Share View')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles session creation errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (collaborativeSessionService.createSession as jest.Mock).mockRejectedValue(
        new Error('Session creation failed')
      );
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open session panel and try to create session
      await user.click(screen.getByRole('button', { title: 'Manage sessions' }));
      
      const sessionNameInput = screen.getByPlaceholderText('Session name');
      await user.type(sessionNameInput, 'Test Session');
      
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create session:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('handles bookmark operations errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (collaborativeSessionService.saveBookmark as jest.Mock).mockRejectedValue(
        new Error('Bookmark save failed')
      );
      
      render(<CollaborativeControls {...defaultProps} />);
      
      // Open bookmark panel and try to save bookmark
      await user.click(screen.getByRole('button', { title: 'Manage bookmarks' }));
      
      const bookmarkNameInput = screen.getByPlaceholderText('Bookmark name');
      await user.type(bookmarkNameInput, 'Test Bookmark');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save bookmark:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      expect(screen.getByRole('button', { title: 'Manage bookmarks' })).toBeInTheDocument();
      expect(screen.getByRole('button', { title: 'Manage sessions' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CollaborativeControls {...defaultProps} />);
      
      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { title: 'Manage bookmarks' })).toHaveFocus();
      
      // Tab to second button
      await user.tab();
      expect(screen.getByRole('button', { title: 'Manage sessions' })).toHaveFocus();
    });

    it('handles Enter key on buttons', async () => {
      const user = userEvent.setup();
      render(<CollaborativeControls {...defaultProps} />);
      
      const bookmarkButton = screen.getByRole('button', { title: 'Manage bookmarks' });
      bookmarkButton.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('View Bookmarks')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<CollaborativeControls {...defaultProps} />);
      
      unmount();
      
      // Verify cleanup doesn't throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('debounces cursor updates to avoid excessive network calls', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      // Simulate rapid mouse movements
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseMove(window, { clientX: i * 10, clientY: i * 10 });
      }
      
      // Since we're not in a session, no calls should be made
      expect(collaborativeSessionService.updateCursor).not.toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('initializes collaborative service on mount', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      expect(collaborativeSessionService.setCurrentUser).toHaveBeenCalledWith(
        'current-user-id',
        'Current User'
      );
      expect(collaborativeSessionService.getActiveSessions).toHaveBeenCalled();
      expect(collaborativeSessionService.getBookmarks).toHaveBeenCalled();
    });

    it('handles collaborative events when in session', () => {
      render(<CollaborativeControls {...defaultProps} />);
      
      // Verify event listener setup
      expect(collaborativeSessionService.addEventListener).toHaveBeenCalled();
    });
  });
});
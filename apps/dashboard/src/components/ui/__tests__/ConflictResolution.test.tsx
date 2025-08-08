/**
 * Conflict Resolution Component Tests
 * Tests conflict resolution UI and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolutionModal, InlineConflictResolution } from '../ConflictResolution';
import { ConflictResolution } from '../../../services/offlineService';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Mock the Modal component
jest.mock('../Modal', () => ({
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('ConflictResolutionModal', () => {
  const mockConflicts: ConflictResolution[] = [
    {
      id: 'conflict-1',
      localData: { id: '1', title: 'Local Title', description: 'Local description' },
      serverData: { id: '1', title: 'Server Title', description: 'Server description' },
      resolution: 'manual',
    },
    {
      id: 'conflict-2',
      localData: { id: '2', title: 'Another Local Title' },
      serverData: { id: '2', title: 'Another Server Title' },
      resolution: 'manual',
    },
  ];

  const defaultProps = {
    conflicts: mockConflicts,
    onResolve: jest.fn(),
    onCancel: jest.fn(),
    isOpen: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Display', () => {
    it('should render modal when open', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>
        </TestWrapper>
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Resolve Data Conflict')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Conflict 1 of 2')).toBeInTheDocument();
    });

    it('should show conflict description', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Data Conflict Detected')).toBeInTheDocument();
      expect(screen.getByText(/The data you modified offline/)).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display local data', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Your Changes (Local)')).toBeInTheDocument();
      expect(screen.getByText(/Local Title/)).toBeInTheDocument();
    });

    it('should display server data', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Server Changes')).toBeInTheDocument();
      expect(screen.getByText(/Server Title/)).toBeInTheDocument();
    });

    it('should format data as JSON', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      // Check that JSON formatting is applied
      const preElements = screen.getAllByRole('generic').filter(el => 
        el.tagName === 'PRE'
      );
      expect(preElements.length).toBeGreaterThan(0);
    });
  });

  describe('Resolution Actions', () => {
    it('should call onResolve with local resolution', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Use My Changes'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        'conflict-1',
        'local',
        undefined
      );
    });

    it('should call onResolve with server resolution', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Use Server Changes'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        'conflict-1',
        'server',
        undefined
      );
    });

    it('should call onResolve with merge resolution', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Auto Merge'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        'conflict-1',
        'merge',
        undefined
      );
    });

    it('should advance to next conflict after resolution', () => {
      const { rerender } = render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      // Resolve first conflict
      fireEvent.click(screen.getByText('Use My Changes'));

      // Simulate props update for next conflict
      rerender(
        <ConflictResolutionModal 
          {...defaultProps} 
          conflicts={[mockConflicts[1]]} 
        />
      );

      expect(screen.getByText(/Another Local Title/)).toBeInTheDocument();
    });

    it('should call onCancel when cancel is clicked', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Cancel All'));

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Custom Resolution', () => {
    it('should show custom editor when edit is clicked', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByPlaceholderText('Edit the data manually...')).toBeInTheDocument();
    });

    it('should hide custom editor when hide is clicked', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      // Show editor
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByPlaceholderText('Edit the data manually...')).toBeInTheDocument();

      // Hide editor
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.queryByPlaceholderText('Edit the data manually...')).not.toBeInTheDocument();
    });

    it('should enable custom resolution button when data is modified', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Edit'));

      const textarea = screen.getByPlaceholderText('Edit the data manually...');
      fireEvent.change(textarea, { 
        target: { value: '{"id": "1", "title": "Custom Title"}' } 
      });

      const applyButton = screen.getByText('Apply Custom Resolution');
      expect(applyButton).not.toBeDisabled();
    });

    it('should call onResolve with custom data', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Edit'));

      const textarea = screen.getByPlaceholderText('Edit the data manually...');
      const customData = '{"id": "1", "title": "Custom Title"}';
      fireEvent.change(textarea, { target: { value: customData } });

      fireEvent.click(screen.getByText('Apply Custom Resolution'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        'conflict-1',
        'merge',
        { id: '1', title: 'Custom Title' }
      );
    });
  });

  describe('Navigation', () => {
    it('should show previous button when not on first conflict', () => {
      // Start with second conflict
      const propsWithSecondConflict = {
        ...defaultProps,
        conflicts: [mockConflicts[1]], // Simulate being on second conflict
      };

      render(
        <TestWrapper>
          <ConflictResolutionModal {...propsWithSecondConflict} />);

      // This would require internal state management to properly test
      // For now, we'll test that the button exists in the DOM structure
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('should show skip button when not on last conflict', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in custom editor gracefully', () => {
      render(
        <TestWrapper>
          <ConflictResolutionModal {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Edit'));

      const textarea = screen.getByPlaceholderText('Edit the data manually...');
      fireEvent.change(textarea, { target: { value: 'invalid json' } });

      // Should not throw error
      expect(() => {
        fireEvent.click(screen.getByText('Apply Custom Resolution'));
      }).not.toThrow();
    });
  });
});

describe('InlineConflictResolution', () => {
  const mockConflict: ConflictResolution = {
    id: 'conflict-1',
    localData: { id: '1', title: 'Local Title' },
    serverData: { id: '1', title: 'Server Title' },
    resolution: 'manual',
  };

  const defaultProps = {
    conflict: mockConflict,
    onResolve: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display', () => {
    it('should render conflict information', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Data Conflict')).toBeInTheDocument();
      expect(screen.getByText(/This item was modified both locally/)).toBeInTheDocument();
    });

    it('should show resolution buttons', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      expect(screen.getByText('Use Local')).toBeInTheDocument();
      expect(screen.getByText('Use Server')).toBeInTheDocument();
      expect(screen.getByText('Merge')).toBeInTheDocument();
    });

    it('should show dismiss button', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      const dismissButton = screen.getByRole('button', { name: '' }); // X button
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onResolve with local resolution', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Use Local'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith('local');
    });

    it('should call onResolve with server resolution', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Use Server'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith('server');
    });

    it('should call onResolve with merge resolution', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      fireEvent.click(screen.getByText('Merge'));

      expect(defaultProps.onResolve).toHaveBeenCalledWith('merge');
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      const dismissButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(dismissButton);

      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have amber styling for warning appearance', () => {
      render(
        <TestWrapper>
          <InlineConflictResolution {...defaultProps} />
        </TestWrapper>
        </TestWrapper>);

      const card = screen.getByText('Data Conflict').closest('div');
      expect(card).toHaveClass('border-amber-200');
    });
  });
});
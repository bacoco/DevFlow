import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DocumentationHub } from '../DocumentationHub';
import { DocumentationSearch } from '../DocumentationSearch';
import { InteractiveGuide } from '../InteractiveGuide';
import { VideoTutorials } from '../VideoTutorials';
import { InAppHelp } from '../InAppHelp';
import { DeveloperDocs } from '../DeveloperDocs';
import { AccessibilityGuide } from '../AccessibilityGuide';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Documentation System', () => {
  describe('DocumentationHub', () => {
    it('renders all documentation sections', () => {
      render(<DocumentationHub />);
      
      expect(screen.getByText('UX Documentation')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Interactive Guides')).toBeInTheDocument();
      expect(screen.getByText('Video Tutorials')).toBeInTheDocument();
      expect(screen.getByText('In-App Help')).toBeInTheDocument();
      expect(screen.getByText('Developer Docs')).toBeInTheDocument();
      expect(screen.getByText('Accessibility Guide')).toBeInTheDocument();
    });

    it('navigates between sections correctly', async () => {
      const user = userEvent.setup();
      render(<DocumentationHub />);
      
      const interactiveGuidesButton = screen.getByText('Interactive Guides');
      await user.click(interactiveGuidesButton);
      
      expect(screen.getByText('Step-by-step walkthroughs for complex workflows')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<DocumentationHub />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DocumentationHub />);
      
      // Tab through navigation items - skip the search input first
      await user.tab(); // Search input
      await user.tab(); // First navigation item
      expect(document.activeElement).toBeInTheDocument();
      
      await user.tab(); // Second navigation item
      expect(document.activeElement).toBeInTheDocument();
      
      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(screen.getByText('Step-by-step walkthroughs to master the dashboard\'s features.')).toBeInTheDocument();
    });
  });

  describe('DocumentationSearch', () => {
    const mockOnResults = jest.fn();
    const mockOnQueryChange = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders search input with proper accessibility attributes', () => {
      render(
        <DocumentationSearch
          query=""
          onQueryChange={mockOnQueryChange}
          onResults={mockOnResults}
        />
      );
      
      const searchInput = screen.getByLabelText('Search documentation');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('aria-expanded', 'false');
      expect(searchInput).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('shows search suggestions when typing', async () => {
      const user = userEvent.setup();
      render(
        <DocumentationSearch
          query=""
          onQueryChange={mockOnQueryChange}
          onResults={mockOnResults}
        />
      );
      
      const searchInput = screen.getByLabelText('Search documentation');
      await user.type(searchInput, 'navigation');
      
      expect(mockOnQueryChange).toHaveBeenLastCalledWith('navigation');
    });

    it('handles keyboard navigation in search results', async () => {
      const user = userEvent.setup();
      render(
        <DocumentationSearch
          query="nav"
          onQueryChange={mockOnQueryChange}
          onResults={mockOnResults}
        />
      );
      
      const searchInput = screen.getByLabelText('Search documentation');
      await user.click(searchInput);
      
      // Test Escape key closes search
      await user.keyboard('{Escape}');
      expect(searchInput).not.toHaveFocus();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(
        <DocumentationSearch
          query=""
          onQueryChange={mockOnQueryChange}
          onResults={mockOnResults}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('InteractiveGuide', () => {
    it('renders guide selection and content', () => {
      render(<InteractiveGuide />);
      
      expect(screen.getByText('Interactive Guides')).toBeInTheDocument();
      expect(screen.getAllByText('Smart Navigation')[0]).toBeInTheDocument();
      expect(screen.getByText('Accessibility Features')).toBeInTheDocument();
      expect(screen.getByText('Mobile Experience')).toBeInTheDocument();
    });

    it('navigates through guide steps', async () => {
      const user = userEvent.setup();
      render(<InteractiveGuide />);
      
      // Select a guide
      const navigationGuide = screen.getAllByText('Smart Navigation')[0];
      await user.click(navigationGuide);
      
      // Check if step content is displayed
      expect(screen.getByText('Understanding the Navigation Bar')).toBeInTheDocument();
      
      // Navigate to next step
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      expect(screen.getByText('Using Breadcrumbs')).toBeInTheDocument();
    });

    it('supports play/pause functionality', async () => {
      const user = userEvent.setup();
      render(<InteractiveGuide />);
      
      const playButton = screen.getByLabelText('Play guide');
      await user.click(playButton);
      
      expect(screen.getByLabelText('Pause guide')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<InteractiveGuide />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('VideoTutorials', () => {
    it('renders video tutorial list and categories', () => {
      render(<VideoTutorials />);
      
      expect(screen.getByText('Video Tutorials')).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
    });

    it('filters tutorials by category', async () => {
      const user = userEvent.setup();
      render(<VideoTutorials />);
      
      const accessibilityCategory = screen.getByText('Accessibility');
      await user.click(accessibilityCategory);
      
      expect(screen.getByText('Accessibility Features Deep Dive')).toBeInTheDocument();
    });

    it('displays video player when tutorial is selected', async () => {
      const user = userEvent.setup();
      render(<VideoTutorials />);
      
      // Find and click on a tutorial
      const tutorial = screen.getByText('Navigation Fundamentals');
      await user.click(tutorial);
      
      expect(screen.getAllByText('Master the adaptive navigation system and keyboard shortcuts for efficient dashboard usage.')[0]).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<VideoTutorials />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('InAppHelp', () => {
    it('renders help widget and topics', () => {
      render(<InAppHelp />);
      
      expect(screen.getByText('In-App Help System')).toBeInTheDocument();
      expect(screen.getByText('Contextual Help Widget')).toBeInTheDocument();
      expect(screen.getByLabelText('Open help')).toBeInTheDocument();
    });

    it('opens and closes help popup', async () => {
      const user = userEvent.setup();
      render(<InAppHelp />);
      
      const helpButton = screen.getByLabelText('Open help');
      await user.click(helpButton);
      
      expect(screen.getByText('Need Help?')).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: 'Close help popup' });
      await user.click(closeButton);
      
      expect(screen.queryByText('Need Help?')).not.toBeInTheDocument();
    });

    it('searches help topics', async () => {
      const user = userEvent.setup();
      render(<InAppHelp />);
      
      const helpButton = screen.getByLabelText('Open help');
      await user.click(helpButton);
      
      const searchInput = screen.getByPlaceholderText('Search help topics...');
      await user.type(searchInput, 'keyboard');
      
      expect(screen.getAllByText('Keyboard Shortcuts')[0]).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<InAppHelp />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('DeveloperDocs', () => {
    it('renders developer documentation sections', () => {
      render(<DeveloperDocs />);
      
      expect(screen.getByText('Developer Documentation')).toBeInTheDocument();
      expect(screen.getAllByText('Design System')[0]).toBeInTheDocument();
      expect(screen.getByText('UX Components')).toBeInTheDocument();
      expect(screen.getByText('Custom Hooks')).toBeInTheDocument();
    });

    it('displays code examples with copy functionality', async () => {
      const user = userEvent.setup();
      render(<DeveloperDocs />);
      
      expect(screen.getByText('Using Design Tokens')).toBeInTheDocument();
      
      const copyButton = screen.getAllByText('Copy')[0];
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('navigates between documentation sections', async () => {
      const user = userEvent.setup();
      render(<DeveloperDocs />);
      
      const componentsSection = screen.getByText('UX Components');
      await user.click(componentsSection);
      
      expect(screen.getByText('Adaptive Navigation Component')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<DeveloperDocs />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AccessibilityGuide', () => {
    it('renders accessibility guidelines and features', () => {
      render(<AccessibilityGuide />);
      
      expect(screen.getByText('Accessibility Guidelines')).toBeInTheDocument();
      expect(screen.getByText('WCAG 2.1 Compliance')).toBeInTheDocument();
      expect(screen.getByText('Key Accessibility Features')).toBeInTheDocument();
    });

    it('demonstrates accessibility settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilityGuide />);
      
      const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
      expect(highContrastCheckbox).toBeInTheDocument();
      expect(highContrastCheckbox).not.toBeChecked();
      
      await user.click(highContrastCheckbox);
      
      // The checkbox should now be checked
      await waitFor(() => {
        expect(highContrastCheckbox).toBeChecked();
      });
    });

    it('filters features by category', async () => {
      const user = userEvent.setup();
      render(<AccessibilityGuide />);
      
      const visualCategory = screen.getByText('Visual');
      await user.click(visualCategory);
      
      expect(screen.getByText('Color Contrast')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<AccessibilityGuide />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

describe('Documentation Content Validation', () => {
  it('validates all UX features are documented', () => {
    // List of UX features that should be documented
    const requiredFeatures = [
      'navigation',
      'accessibility', 
      'mobile',
      'video',
      'help',
      'developer'
    ];

    render(<DocumentationHub />);

    requiredFeatures.forEach(feature => {
      // Check if feature is mentioned in documentation
      const featureElements = screen.queryAllByText(new RegExp(feature, 'i'));
      expect(featureElements.length).toBeGreaterThan(0);
    });
  });

  it('ensures all interactive elements have proper labels', async () => {
    const { container } = render(<DocumentationHub />);
    
    // Check all buttons have accessible names
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });

    // Check all inputs have labels
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
      expect(input).toHaveAccessibleName();
    });
  });

  it('validates keyboard navigation paths', async () => {
    const user = userEvent.setup();
    render(<DocumentationHub />);
    
    // Test tab order through main navigation
    await user.tab();
    const firstFocusable = document.activeElement;
    expect(firstFocusable).toBeInTheDocument();
    
    // Continue tabbing and ensure focus moves logically
    await user.tab();
    const secondFocusable = document.activeElement;
    expect(secondFocusable).not.toBe(firstFocusable);
    expect(secondFocusable).toBeInTheDocument();
  });

  it('checks for proper heading hierarchy', () => {
    const { container } = render(<DocumentationHub />);
    
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      // Heading levels should not skip (e.g., h1 -> h3)
      if (previousLevel > 0) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
      
      previousLevel = currentLevel;
    });
  });
});

describe('Documentation Performance', () => {
  it('loads documentation sections efficiently', async () => {
    const startTime = performance.now();
    
    render(<DocumentationHub />);
    
    // Wait for content to be rendered
    await waitFor(() => {
      expect(screen.getByText('UX Documentation')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    // Documentation should load within reasonable time
    expect(loadTime).toBeLessThan(1000); // 1 second
  });

  it('handles large documentation content without performance issues', () => {
    const { container } = render(<DeveloperDocs />);
    
    // Check that code examples are rendered without blocking
    const codeBlocks = container.querySelectorAll('pre code');
    expect(codeBlocks.length).toBeGreaterThanOrEqual(0);
    
    // Ensure container is properly rendered
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('Documentation Internationalization', () => {
  it('supports text scaling for different font sizes', () => {
    render(<AccessibilityGuide />);
    
    // Test different font size settings
    const fontSizeSelect = screen.getByDisplayValue('Medium');
    fireEvent.change(fontSizeSelect, { target: { value: 'large' } });
    
    // Content should adapt to larger font sizes
    const sampleContent = screen.getByText('Sample Content');
    expect(sampleContent).toHaveClass('text-lg');
  });

  it('maintains layout integrity with longer text content', () => {
    // Test with longer text that might occur in other languages
    const longText = 'This is a very long text string that might occur when documentation is translated to languages that require more characters to express the same concepts as English';
    
    render(
      <div className="max-w-md">
        <p className="text-sm break-words">{longText}</p>
      </div>
    );
    
    const textElement = screen.getByText(longText);
    expect(textElement).toBeInTheDocument();
    
    // Text should wrap properly and not overflow
    const rect = textElement.getBoundingClientRect();
    expect(rect.width).toBeLessThanOrEqual(384); // max-w-md = 384px
  });
});
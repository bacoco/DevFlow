/**
 * SkeletonLoaders Component Tests
 * Comprehensive tests for skeleton loading components and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  Skeleton,
  DashboardSkeleton,
  TaskBoardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ListSkeleton,
  CardSkeleton,
  FormSkeleton,
  NavigationSkeleton,
} from '../SkeletonLoaders';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, animate, transition, style, ...props }, ref) => (
      <div ref={ref} {...props} style={style}>
        {children}
      </div>
    )),
  },
}));

// Mock providers
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(
        <MockProviders>
          <Skeleton />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('applies custom className', () => {
      render(
        <MockProviders>
          <Skeleton className="custom-class" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('custom-class');
    });

    it('applies custom dimensions', () => {
      render(
        <MockProviders>
          <Skeleton width="200px" height="50px" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveStyle({
        width: '200px',
        height: '50px',
      });
    });

    it('handles numeric dimensions', () => {
      render(
        <MockProviders>
          <Skeleton width={200} height={50} />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveStyle({
        width: '200px',
        height: '50px',
      });
    });
  });

  describe('Variants', () => {
    it('renders text variant correctly', () => {
      render(
        <MockProviders>
          <Skeleton variant="text" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('rounded');
    });

    it('renders rectangular variant correctly', () => {
      render(
        <MockProviders>
          <Skeleton variant="rectangular" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('rounded-md');
    });

    it('renders circular variant correctly', () => {
      render(
        <MockProviders>
          <Skeleton variant="circular" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('rounded-full');
    });
  });

  describe('Animations', () => {
    it('applies pulse animation by default', () => {
      render(
        <MockProviders>
          <Skeleton animation="pulse" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('applies wave animation when specified', () => {
      render(
        <MockProviders>
          <Skeleton animation="wave" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      // Wave animation uses motion.div, so we check for the component
      expect(skeleton).toBeInTheDocument();
    });

    it('applies no animation when specified', () => {
      render(
        <MockProviders>
          <Skeleton animation="none" />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MockProviders>
          <Skeleton />
        </MockProviders>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(
        <MockProviders>
          <Skeleton />
        </MockProviders>
      );
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });
  });
});

describe('DashboardSkeleton Component', () => {
  it('renders dashboard skeleton structure', () => {
    render(
      <MockProviders>
        <DashboardSkeleton />
      </MockProviders>
    );
    
    const dashboard = screen.getByRole('status', { name: /loading dashboard/i });
    expect(dashboard).toBeInTheDocument();
    
    // Check for metric cards (4 cards)
    const metricCards = screen.getAllByRole('status').filter(el => 
      el.getAttribute('aria-label') === 'Loading content'
    );
    expect(metricCards.length).toBeGreaterThan(10); // Multiple skeleton elements
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <DashboardSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('TaskBoardSkeleton Component', () => {
  it('renders task board skeleton structure', () => {
    render(
      <MockProviders>
        <TaskBoardSkeleton />
      </MockProviders>
    );
    
    const taskBoard = screen.getByRole('status', { name: /loading task board/i });
    expect(taskBoard).toBeInTheDocument();
    
    // Should render 3 columns with tasks
    const skeletonElements = screen.getAllByRole('status');
    expect(skeletonElements.length).toBeGreaterThan(1);
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <TaskBoardSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ChartSkeleton Component', () => {
  it('renders chart skeleton with default height', () => {
    render(
      <MockProviders>
        <ChartSkeleton />
      </MockProviders>
    );
    
    const chart = screen.getByRole('status', { name: /loading chart/i });
    expect(chart).toBeInTheDocument();
  });

  it('renders chart skeleton with custom height', () => {
    render(
      <MockProviders>
        <ChartSkeleton height="400px" />
      </MockProviders>
    );
    
    const chart = screen.getByRole('status', { name: /loading chart/i });
    expect(chart).toBeInTheDocument();
    
    // Check if height is applied to the container
    const heightContainer = chart.querySelector('[style*="height: 400px"]');
    expect(heightContainer).toBeInTheDocument();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <ChartSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('TableSkeleton Component', () => {
  it('renders table skeleton with default rows and columns', () => {
    render(
      <MockProviders>
        <TableSkeleton />
      </MockProviders>
    );
    
    const table = screen.getByRole('status', { name: /loading table/i });
    expect(table).toBeInTheDocument();
  });

  it('renders table skeleton with custom rows and columns', () => {
    render(
      <MockProviders>
        <TableSkeleton rows={3} columns={2} />
      </MockProviders>
    );
    
    const table = screen.getByRole('status', { name: /loading table/i });
    expect(table).toBeInTheDocument();
    
    // Should have fewer skeleton elements with custom parameters
    const skeletonElements = screen.getAllByRole('status');
    expect(skeletonElements.length).toBeGreaterThan(1);
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <TableSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ListSkeleton Component', () => {
  it('renders list skeleton with default items', () => {
    render(
      <MockProviders>
        <ListSkeleton />
      </MockProviders>
    );
    
    const list = screen.getByRole('status', { name: /loading list/i });
    expect(list).toBeInTheDocument();
  });

  it('renders list skeleton with custom item count', () => {
    render(
      <MockProviders>
        <ListSkeleton items={3} />
      </MockProviders>
    );
    
    const list = screen.getByRole('status', { name: /loading list/i });
    expect(list).toBeInTheDocument();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <ListSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardSkeleton Component', () => {
  it('renders card skeleton without image by default', () => {
    render(
      <MockProviders>
        <CardSkeleton />
      </MockProviders>
    );
    
    const card = screen.getByRole('status', { name: /loading card/i });
    expect(card).toBeInTheDocument();
  });

  it('renders card skeleton with image when specified', () => {
    render(
      <MockProviders>
        <CardSkeleton showImage />
      </MockProviders>
    );
    
    const card = screen.getByRole('status', { name: /loading card/i });
    expect(card).toBeInTheDocument();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <CardSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('FormSkeleton Component', () => {
  it('renders form skeleton with default fields', () => {
    render(
      <MockProviders>
        <FormSkeleton />
      </MockProviders>
    );
    
    const form = screen.getByRole('status', { name: /loading form/i });
    expect(form).toBeInTheDocument();
  });

  it('renders form skeleton with custom field count', () => {
    render(
      <MockProviders>
        <FormSkeleton fields={2} />
      </MockProviders>
    );
    
    const form = screen.getByRole('status', { name: /loading form/i });
    expect(form).toBeInTheDocument();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <FormSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('NavigationSkeleton Component', () => {
  it('renders navigation skeleton', () => {
    render(
      <MockProviders>
        <NavigationSkeleton />
      </MockProviders>
    );
    
    const navigation = screen.getByRole('status', { name: /loading navigation/i });
    expect(navigation).toBeInTheDocument();
  });

  it('should not have accessibility violations', async () => {
    const { container } = render(
      <MockProviders>
        <NavigationSkeleton />
      </MockProviders>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Reduced Motion Support', () => {
  beforeEach(() => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('respects reduced motion preferences', () => {
    render(
      <MockProviders>
        <Skeleton animation="pulse" />
      </MockProviders>
    );
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    // Animation classes should still be applied but CSS will handle reduced motion
  });
});

describe('Dark Mode Support', () => {
  it('applies dark mode classes', () => {
    render(
      <MockProviders>
        <Skeleton />
      </MockProviders>
    );
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('dark:bg-gray-700');
  });
});

describe('Edge Cases', () => {
  it('handles zero dimensions gracefully', () => {
    render(
      <MockProviders>
        <Skeleton width={0} height={0} />
      </MockProviders>
    );
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveStyle({
      width: '0px',
      height: '0px',
    });
  });

  it('handles very large dimensions', () => {
    render(
      <MockProviders>
        <Skeleton width="9999px" height="9999px" />
      </MockProviders>
    );
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveStyle({
      width: '9999px',
      height: '9999px',
    });
  });

  it('handles percentage dimensions', () => {
    render(
      <MockProviders>
        <Skeleton width="50%" height="25%" />
      </MockProviders>
    );
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveStyle({
      width: '50%',
      height: '25%',
    });
  });
});
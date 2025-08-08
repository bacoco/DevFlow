/**
 * Viewport-Specific Responsive Tests
 * Tests responsive behavior across different viewport sizes and device types
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  ResponsiveProvider,
  useResponsive,
  useBreakpoint,
  useDeviceType,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useOrientation,
} from '../layout/responsive-engine';

import { Grid, Flex, Container } from '../layout/grid';
import { Text, Heading } from '../components/typography';

// Viewport test configurations
const viewports = {
  mobile: {
    portrait: { width: 375, height: 667 },
    landscape: { width: 667, height: 375 },
  },
  tablet: {
    portrait: { width: 768, height: 1024 },
    landscape: { width: 1024, height: 768 },
  },
  desktop: {
    small: { width: 1280, height: 720 },
    medium: { width: 1440, height: 900 },
    large: { width: 1920, height: 1080 },
  },
};

// Mock window dimensions helper
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event to update the responsive provider
  window.dispatchEvent(new Event('resize'));
};

// Mock matchMedia
const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode; debounceMs?: number }> = ({ 
  children, 
  debounceMs = 0 
}) => (
  <ResponsiveProvider debounceMs={debounceMs}>{children}</ResponsiveProvider>
);

describe('Mobile Viewport Tests', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  describe('Mobile Portrait', () => {
    beforeEach(() => {
      setViewport(viewports.mobile.portrait.width, viewports.mobile.portrait.height);
    });

    it('should detect mobile device in portrait', () => {
      const { result } = renderHook(
        () => ({
          breakpoint: useBreakpoint(),
          device: useDeviceType(),
          isMobile: useIsMobile(),
          orientation: useOrientation(),
        }),
        { wrapper: TestWrapper }
      );

      expect(result.current.breakpoint).toBe('xs');
      expect(result.current.device).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.orientation).toBe('portrait');
    });

    it('should render mobile-optimized grid layout', () => {
      render(
        <TestWrapper>
          <Grid 
            columns={{ xs: 1, sm: 2, md: 3 }}
            gap={{ xs: 2, md: 4 }}
            data-testid="mobile-grid"
          >
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('mobile-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
        gap: '0.5rem',
      });
    });

    it('should render mobile-optimized typography', () => {
      render(
        <TestWrapper>
          <Heading 
            level={{ xs: 3, md: 1 }}
            data-testid="mobile-heading"
          >
            Mobile Heading
          </Heading>
        </TestWrapper>
      );

      const heading = screen.getByTestId('mobile-heading');
      expect(heading.tagName).toBe('H3');
    });

    it('should apply mobile container padding', () => {
      render(
        <TestWrapper>
          <Container 
            padding={{ xs: 4, md: 8 }}
            data-testid="mobile-container"
          >
            Mobile Content
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('mobile-container');
      expect(container).toHaveStyle({ padding: '1rem' });
    });
  });

  describe('Mobile Landscape', () => {
    beforeEach(() => {
      setViewport(viewports.mobile.landscape.width, viewports.mobile.landscape.height);
    });

    it('should detect mobile device in landscape', () => {
      const { result } = renderHook(
        () => ({
          breakpoint: useBreakpoint(),
          device: useDeviceType(),
          isMobile: useIsMobile(),
          orientation: useOrientation(),
        }),
        { wrapper: TestWrapper }
      );

      expect(result.current.breakpoint).toBe('sm');
      expect(result.current.device).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.orientation).toBe('landscape');
    });

    it('should adapt layout for landscape mobile', () => {
      render(
        <TestWrapper>
          <Flex 
            direction={{ xs: 'column', sm: 'row' }}
            data-testid="mobile-landscape-flex"
          >
            <div>Item 1</div>
            <div>Item 2</div>
          </Flex>
        </TestWrapper>
      );

      const flex = screen.getByTestId('mobile-landscape-flex');
      expect(flex).toHaveStyle({ flexDirection: 'row' });
    });
  });
});

describe('Tablet Viewport Tests', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  describe('Tablet Portrait', () => {
    beforeEach(() => {
      setViewport(viewports.tablet.portrait.width, viewports.tablet.portrait.height);
    });

    it('should detect tablet device in portrait', () => {
      const { result } = renderHook(
        () => ({
          breakpoint: useBreakpoint(),
          device: useDeviceType(),
          isTablet: useIsTablet(),
          orientation: useOrientation(),
        }),
        { wrapper: TestWrapper }
      );

      expect(result.current.breakpoint).toBe('md');
      expect(result.current.device).toBe('tablet');
      expect(result.current.isTablet).toBe(true);
      expect(result.current.orientation).toBe('portrait');
    });

    it('should render tablet-optimized grid layout', () => {
      render(
        <TestWrapper>
          <Grid 
            columns={{ xs: 1, md: 2, lg: 3 }}
            gap={{ xs: 2, md: 4, lg: 6 }}
            data-testid="tablet-grid"
          >
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('tablet-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '1rem',
      });
    });
  });

  describe('Tablet Landscape', () => {
    beforeEach(() => {
      setViewport(viewports.tablet.landscape.width, viewports.tablet.landscape.height);
    });

    it('should detect tablet device in landscape', () => {
      const { result } = renderHook(
        () => ({
          breakpoint: useBreakpoint(),
          device: useDeviceType(),
          isTablet: useIsTablet(),
          orientation: useOrientation(),
        }),
        { wrapper: TestWrapper }
      );

      expect(result.current.breakpoint).toBe('lg');
      expect(result.current.device).toBe('desktop'); // lg breakpoint = desktop
      expect(result.current.isTablet).toBe(false);
      expect(result.current.orientation).toBe('landscape');
    });
  });
});

describe('Desktop Viewport Tests', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  describe('Small Desktop', () => {
    beforeEach(() => {
      setViewport(viewports.desktop.small.width, viewports.desktop.small.height);
    });

    it('should detect desktop device', () => {
      const { result } = renderHook(
        () => ({
          breakpoint: useBreakpoint(),
          device: useDeviceType(),
          isDesktop: useIsDesktop(),
          orientation: useOrientation(),
        }),
        { wrapper: TestWrapper }
      );

      expect(result.current.breakpoint).toBe('xl');
      expect(result.current.device).toBe('desktop');
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.orientation).toBe('landscape');
    });

    it('should render desktop-optimized layout', () => {
      render(
        <TestWrapper>
          <Grid 
            columns={{ xs: 1, md: 2, lg: 3, xl: 4 }}
            gap={{ xs: 2, md: 4, lg: 6, xl: 8 }}
            data-testid="desktop-grid"
          >
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
            <div>Item 4</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('desktop-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '2rem',
      });
    });

    it('should apply desktop container constraints', () => {
      render(
        <TestWrapper>
          <Container 
            maxWidth="lg"
            padding={{ xs: 4, md: 6, lg: 8, xl: 12 }}
            data-testid="desktop-container"
          >
            Desktop Content
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toHaveStyle({ 
        maxWidth: '1200px',
        padding: '3rem',
      });
    });
  });

  describe('Large Desktop', () => {
    beforeEach(() => {
      setViewport(viewports.desktop.large.width, viewports.desktop.large.height);
    });

    it('should detect large desktop breakpoint', () => {
      const { result } = renderHook(() => useBreakpoint(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe('2xl');
    });

    it('should render large desktop layout', () => {
      render(
        <TestWrapper>
          <Grid 
            columns={{ xs: 1, md: 2, lg: 3, xl: 4, '2xl': 6 }}
            data-testid="large-desktop-grid"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>Item {i + 1}</div>
            ))}
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('large-desktop-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      });
    });
  });
});

describe('Responsive Transitions', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should handle viewport transitions smoothly', async () => {
    setViewport(375, 667); // Mobile

    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe('xs');

    // Transition to tablet
    act(() => {
      setViewport(768, 1024);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(result.current).toBe('md');
    });

    // Transition to desktop
    act(() => {
      setViewport(1280, 720);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(result.current).toBe('xl');
    });
  });

  it('should handle orientation changes', async () => {
    setViewport(768, 1024); // Tablet portrait

    const { result } = renderHook(() => useOrientation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe('portrait');

    // Rotate to landscape
    act(() => {
      setViewport(1024, 768);
      window.dispatchEvent(new Event('orientationchange'));
    });

    await waitFor(() => {
      expect(result.current).toBe('landscape');
    });
  });

  it('should update component layouts on breakpoint changes', async () => {
    setViewport(375, 667); // Mobile

    const { rerender } = render(
      <TestWrapper>
        <Grid 
          columns={{ xs: 1, md: 2, lg: 3 }}
          data-testid="responsive-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Grid>
      </TestWrapper>
    );

    let grid = screen.getByTestId('responsive-grid');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    });

    // Change to tablet
    act(() => {
      setViewport(768, 1024);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      grid = screen.getByTestId('responsive-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      });
    });

    // Change to desktop
    act(() => {
      setViewport(1024, 768);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      grid = screen.getByTestId('responsive-grid');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      });
    });
  });
});

describe('Touch and Interaction Tests', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should detect touch devices', () => {
    // Mock touch device
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query.includes('hover: none') && query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    setViewport(375, 667);

    const { result } = renderHook(
      () => useResponsive(),
      { wrapper: TestWrapper }
    );

    expect(result.current.isTouch).toBe(true);
  });

  it('should detect non-touch devices', () => {
    // Mock non-touch device
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query.includes('hover: hover') && query.includes('pointer: fine'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    setViewport(1280, 720);

    const { result } = renderHook(
      () => useResponsive(),
      { wrapper: TestWrapper }
    );

    expect(result.current.isTouch).toBe(false);
  });
});

describe('Performance Tests', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should debounce resize events', async () => {
    const debounceMs = 100;
    setViewport(1024, 768);

    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: ({ children }) => (
        <ResponsiveProvider debounceMs={debounceMs}>
          {children}
        </ResponsiveProvider>
      ),
    });

    expect(result.current).toBe('lg');

    // Rapid resize events
    act(() => {
      setViewport(375, 667);
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      setViewport(768, 1024);
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      setViewport(1280, 720);
      window.dispatchEvent(new Event('resize'));
    });

    // Should still be the original value immediately
    expect(result.current).toBe('lg');

    // Should update after debounce period
    await waitFor(
      () => {
        // The final viewport was 1280x720, which should be 'xl' breakpoint
        expect(result.current).toBe('xl');
      },
      { timeout: debounceMs + 100 }
    );
  });

  it('should maintain consistent breakpoint values across same-breakpoint resizes', async () => {
    const breakpointValues: string[] = [];
    
    const TestComponent = () => {
      const breakpoint = useBreakpoint();
      breakpointValues.push(breakpoint);
      return <div>{breakpoint}</div>;
    };

    setViewport(1024, 768);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Wait for initial render to complete
    await waitFor(() => {
      expect(breakpointValues[breakpointValues.length - 1]).toBe('lg');
    });

    // Multiple resize events to same breakpoint
    act(() => {
      setViewport(1025, 768); // Still 'lg' breakpoint
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      setViewport(1100, 768); // Still 'lg' breakpoint
      window.dispatchEvent(new Event('resize'));
    });

    // Wait for any debounced updates
    await new Promise(resolve => setTimeout(resolve, 50));

    // All breakpoint values should be 'lg' since we stayed in the same breakpoint range
    const uniqueBreakpoints = [...new Set(breakpointValues)];
    expect(uniqueBreakpoints).toEqual(['lg']);
  });
});
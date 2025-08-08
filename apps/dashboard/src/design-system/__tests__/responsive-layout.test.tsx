/**
 * Responsive Layout System Tests
 * Tests for breakpoints, responsive engine, and layout components
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  ResponsiveProvider,
  useResponsive,
  useBreakpoint,
  useBreakpointUp,
  useBreakpointDown,
  useBreakpointBetween,
  useResponsiveValue,
  useDeviceType,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useOrientation,
  useIsTouch,
  useAccessibilityPreferences,
  useMediaQuery,
  resolveResponsiveValue,
  ssrUtils,
  type ResponsiveProviderProps,
} from '../layout/responsive-engine';

import { Grid, GridItem, Flex, FlexItem, Container, Stack, HStack, VStack, Center } from '../layout/grid';
import { Text, Heading, Display, Code, Label } from '../components/typography';

import { breakpointValues, responsiveUtils } from '../tokens/breakpoints';

// Mock window.matchMedia
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

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; debounceMs?: number }> = ({ 
  children, 
  debounceMs = 0 
}) => (
  <ResponsiveProvider debounceMs={debounceMs}>{children}</ResponsiveProvider>
);

describe('Breakpoint System', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockWindowDimensions(1024, 768);
  });

  describe('breakpointValues', () => {
    it('should have correct breakpoint values', () => {
      expect(breakpointValues.xs).toBe(0);
      expect(breakpointValues.sm).toBe(640);
      expect(breakpointValues.md).toBe(768);
      expect(breakpointValues.lg).toBe(1024);
      expect(breakpointValues.xl).toBe(1280);
      expect(breakpointValues['2xl']).toBe(1536);
    });
  });

  describe('responsiveUtils', () => {
    it('should get current breakpoint correctly', () => {
      expect(responsiveUtils.getCurrentBreakpoint(320)).toBe('xs');
      expect(responsiveUtils.getCurrentBreakpoint(640)).toBe('sm');
      expect(responsiveUtils.getCurrentBreakpoint(768)).toBe('md');
      expect(responsiveUtils.getCurrentBreakpoint(1024)).toBe('lg');
      expect(responsiveUtils.getCurrentBreakpoint(1280)).toBe('xl');
      expect(responsiveUtils.getCurrentBreakpoint(1536)).toBe('2xl');
    });

    it('should match breakpoints correctly', () => {
      expect(responsiveUtils.matchesBreakpoint(1024, 'lg')).toBe(true);
      expect(responsiveUtils.matchesBreakpoint(1024, 'xl')).toBe(false);
      expect(responsiveUtils.matchesBreakpoint(768, 'md')).toBe(true);
      expect(responsiveUtils.matchesBreakpoint(767, 'md')).toBe(false);
    });

    it('should get responsive values correctly', () => {
      const values = { xs: 'small', md: 'medium', xl: 'large' };
      
      expect(responsiveUtils.getResponsiveValue(values, 'xs')).toBe('small');
      expect(responsiveUtils.getResponsiveValue(values, 'sm')).toBe('small');
      expect(responsiveUtils.getResponsiveValue(values, 'md')).toBe('medium');
      expect(responsiveUtils.getResponsiveValue(values, 'lg')).toBe('medium');
      expect(responsiveUtils.getResponsiveValue(values, 'xl')).toBe('large');
      expect(responsiveUtils.getResponsiveValue(values, '2xl')).toBe('large');
    });
  });
});

describe('Responsive Engine Hooks', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    // Set dimensions before any tests run
    mockWindowDimensions(1024, 768);
  });

  describe('useResponsive', () => {
    it('should provide responsive context', () => {
      const { result } = renderHook(() => useResponsive(), {
        wrapper: TestWrapper,
      });

      expect(result.current.current).toBe('lg');
      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
      expect(result.current.device).toBe('desktop');
      expect(result.current.orientation).toBe('landscape');
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useResponsive());
      }).toThrow('useResponsive must be used within a ResponsiveProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('useBreakpoint', () => {
    it('should return current breakpoint', () => {
      const { result } = renderHook(() => useBreakpoint(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe('lg');
    });
  });

  describe('useBreakpointUp', () => {
    it('should check if breakpoint matches or exceeds', () => {
      const { result } = renderHook(() => useBreakpointUp('md'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(true);
    });

    it('should return false for larger breakpoints', () => {
      const { result } = renderHook(() => useBreakpointUp('xl'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useBreakpointDown', () => {
    it('should check if breakpoint is below', () => {
      const { result } = renderHook(() => useBreakpointDown('xl'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(true);
    });

    it('should return false for smaller breakpoints', () => {
      const { result } = renderHook(() => useBreakpointDown('md'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useBreakpointBetween', () => {
    it('should check if breakpoint is between two values', () => {
      const { result } = renderHook(() => useBreakpointBetween('md', 'xl'), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useResponsiveValue', () => {
    it('should resolve responsive values', () => {
      const { result } = renderHook(
        () => useResponsiveValue({ xs: 'small', md: 'medium', xl: 'large' }),
        { wrapper: TestWrapper }
      );

      expect(result.current).toBe('medium');
    });

    it('should handle non-object values', () => {
      const { result } = renderHook(
        () => useResponsiveValue('static'),
        { wrapper: TestWrapper }
      );

      expect(result.current).toBe('static');
    });
  });

  describe('useDeviceType', () => {
    it('should return correct device type for desktop', () => {
      const { result } = renderHook(() => useDeviceType(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe('desktop');
    });
  });

  describe('useIsMobile', () => {
    it('should return false for desktop', () => {
      const { result } = renderHook(() => useIsMobile(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(false);
    });

    it('should return true for mobile', () => {
      mockWindowDimensions(375, 667);
      
      const { result } = renderHook(() => useIsMobile(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useMediaQuery', () => {
    it('should match media queries', () => {
      mockMatchMedia(true);
      
      const { result } = renderHook(
        () => useMediaQuery('(min-width: 768px)'),
        { wrapper: TestWrapper }
      );

      expect(result.current).toBe(true);
    });
  });
});

describe('Grid System', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockWindowDimensions(1024, 768);
  });

  describe('Grid Component', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Grid data-testid="grid">
            <div>Item 1</div>
            <div>Item 2</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveStyle({ display: 'grid' });
    });

    it('should apply responsive columns', () => {
      render(
        <TestWrapper>
          <Grid columns={{ xs: 1, md: 2, lg: 3 }} data-testid="grid">
            <div>Item 1</div>
            <div>Item 2</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveStyle({ 
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' 
      });
    });

    it('should apply gap correctly', () => {
      render(
        <TestWrapper>
          <Grid gap={4} data-testid="grid">
            <div>Item 1</div>
            <div>Item 2</div>
          </Grid>
        </TestWrapper>
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveStyle({ gap: '1rem' });
    });
  });

  describe('GridItem Component', () => {
    it('should render with column span', () => {
      render(
        <TestWrapper>
          <Grid>
            <GridItem columnSpan={2} data-testid="grid-item">
              Item
            </GridItem>
          </Grid>
        </TestWrapper>
      );

      const item = screen.getByTestId('grid-item');
      expect(item).toHaveStyle({ 
        gridColumn: 'span 2 / span 2' 
      });
    });

    it('should apply responsive column spans', () => {
      render(
        <TestWrapper>
          <Grid>
            <GridItem columnSpan={{ xs: 1, md: 2, lg: 3 }} data-testid="grid-item">
              Item
            </GridItem>
          </Grid>
        </TestWrapper>
      );

      const item = screen.getByTestId('grid-item');
      expect(item).toHaveStyle({ 
        gridColumn: 'span 3 / span 3' 
      });
    });
  });

  describe('Flex Component', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Flex data-testid="flex">
            <div>Item 1</div>
            <div>Item 2</div>
          </Flex>
        </TestWrapper>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toBeInTheDocument();
      expect(flex).toHaveStyle({ display: 'flex' });
    });

    it('should apply responsive direction', () => {
      render(
        <TestWrapper>
          <Flex direction={{ xs: 'column', md: 'row' }} data-testid="flex">
            <div>Item 1</div>
            <div>Item 2</div>
          </Flex>
        </TestWrapper>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toHaveStyle({ flexDirection: 'row' });
    });

    it('should apply justify and align', () => {
      render(
        <TestWrapper>
          <Flex justify="center" align="center" data-testid="flex">
            <div>Item</div>
          </Flex>
        </TestWrapper>
      );

      const flex = screen.getByTestId('flex');
      expect(flex).toHaveStyle({ 
        justifyContent: 'center',
        alignItems: 'center'
      });
    });
  });

  describe('Container Component', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Container data-testid="container">
            Content
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ 
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto'
      });
    });

    it('should apply max width', () => {
      render(
        <TestWrapper>
          <Container maxWidth="lg" data-testid="container">
            Content
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveStyle({ maxWidth: '1200px' });
    });

    it('should apply responsive padding', () => {
      render(
        <TestWrapper>
          <Container padding={{ xs: 4, md: 6 }} data-testid="container">
            Content
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveStyle({ padding: '1.5rem' });
    });
  });

  describe('Utility Components', () => {
    it('should render Stack as column flex', () => {
      render(
        <TestWrapper>
          <Stack data-testid="stack">
            <div>Item 1</div>
            <div>Item 2</div>
          </Stack>
        </TestWrapper>
      );

      const stack = screen.getByTestId('stack');
      expect(stack).toHaveStyle({ 
        display: 'flex',
        flexDirection: 'column'
      });
    });

    it('should render HStack as row flex', () => {
      render(
        <TestWrapper>
          <HStack data-testid="hstack">
            <div>Item 1</div>
            <div>Item 2</div>
          </HStack>
        </TestWrapper>
      );

      const hstack = screen.getByTestId('hstack');
      expect(hstack).toHaveStyle({ 
        display: 'flex',
        flexDirection: 'row'
      });
    });

    it('should render Center with center alignment', () => {
      render(
        <TestWrapper>
          <Center data-testid="center">
            <div>Centered</div>
          </Center>
        </TestWrapper>
      );

      const center = screen.getByTestId('center');
      expect(center).toHaveStyle({ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });
    });
  });
});

describe('Typography Components', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockWindowDimensions(1024, 768);
  });

  describe('Text Component', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <Text data-testid="text">Hello World</Text>
        </TestWrapper>
      );

      const text = screen.getByTestId('text');
      expect(text).toBeInTheDocument();
      expect(text.tagName).toBe('P');
    });

    it('should apply responsive sizes', () => {
      render(
        <TestWrapper>
          <Text size={{ xs: 'sm', md: 'md', lg: 'lg' }} data-testid="text">
            Responsive Text
          </Text>
        </TestWrapper>
      );

      const text = screen.getByTestId('text');
      expect(text).toBeInTheDocument();
    });

    it('should handle truncation', () => {
      render(
        <TestWrapper>
          <Text truncate data-testid="text">
            This is a very long text that should be truncated
          </Text>
        </TestWrapper>
      );

      const text = screen.getByTestId('text');
      expect(text).toHaveStyle({ 
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      });
    });
  });

  describe('Heading Component', () => {
    it('should render with correct heading level', () => {
      render(
        <TestWrapper>
          <Heading level={2} data-testid="heading">
            Heading Text
          </Heading>
        </TestWrapper>
      );

      const heading = screen.getByTestId('heading');
      expect(heading.tagName).toBe('H2');
    });

    it('should apply responsive levels', () => {
      render(
        <TestWrapper>
          <Heading level={{ xs: 3, md: 2, lg: 1 }} data-testid="heading">
            Responsive Heading
          </Heading>
        </TestWrapper>
      );

      const heading = screen.getByTestId('heading');
      expect(heading.tagName).toBe('H1');
    });
  });

  describe('Display Component', () => {
    it('should render with large display text', () => {
      render(
        <TestWrapper>
          <Display level="xl" data-testid="display">
            Display Text
          </Display>
        </TestWrapper>
      );

      const display = screen.getByTestId('display');
      expect(display).toBeInTheDocument();
      expect(display.tagName).toBe('H1');
    });
  });

  describe('Code Component', () => {
    it('should render inline code by default', () => {
      render(
        <TestWrapper>
          <Code data-testid="code">const x = 1;</Code>
        </TestWrapper>
      );

      const code = screen.getByTestId('code');
      expect(code.tagName).toBe('CODE');
    });

    it('should render block code when specified', () => {
      render(
        <TestWrapper>
          <Code block data-testid="code">
            const x = 1;
            console.log(x);
          </Code>
        </TestWrapper>
      );

      const code = screen.getByTestId('code');
      expect(code.tagName).toBe('PRE');
    });
  });

  describe('Label Component', () => {
    it('should render with htmlFor attribute', () => {
      render(
        <TestWrapper>
          <Label htmlFor="input-id" data-testid="label">
            Label Text
          </Label>
        </TestWrapper>
      );

      const label = screen.getByTestId('label');
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', 'input-id');
    });

    it('should show required indicator', () => {
      render(
        <TestWrapper>
          <Label required data-testid="label">
            Required Label
          </Label>
        </TestWrapper>
      );

      const label = screen.getByTestId('label');
      expect(label).toHaveTextContent('*');
    });
  });
});

describe('Responsive Behavior', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should update breakpoint on window resize', async () => {
    mockWindowDimensions(1024, 768);
    
    const { result } = renderHook(() => useBreakpoint(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe('lg');

    // Simulate window resize
    act(() => {
      mockWindowDimensions(375, 667);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(result.current).toBe('xs');
    });
  });

  it('should handle orientation changes', async () => {
    mockWindowDimensions(768, 1024);
    
    const { result } = renderHook(() => useOrientation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe('portrait');

    act(() => {
      mockWindowDimensions(1024, 768);
      window.dispatchEvent(new Event('orientationchange'));
    });

    await waitFor(() => {
      expect(result.current).toBe('landscape');
    });
  });

  it('should handle accessibility preferences', () => {
    mockMatchMedia(true);
    
    const { result } = renderHook(() => useAccessibilityPreferences(), {
      wrapper: TestWrapper,
    });

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.prefersHighContrast).toBe(true);
  });
});

describe('SSR Utilities', () => {
  it('should provide default context for SSR', () => {
    expect(ssrUtils.defaultBreakpoint).toBe('lg');
    expect(ssrUtils.defaultContext.current).toBe('lg');
    expect(ssrUtils.defaultContext.device).toBe('desktop');
  });

  it('should resolve responsive values for SSR', () => {
    const values = { xs: 'small', md: 'medium', xl: 'large' };
    const resolved = ssrUtils.resolveForSSR(values);
    expect(resolved).toBe('medium');
  });
});

describe('Utility Functions', () => {
  it('should resolve responsive values outside React', () => {
    const values = { xs: 'small', md: 'medium', xl: 'large' };
    
    expect(resolveResponsiveValue(values, 'xs')).toBe('small');
    expect(resolveResponsiveValue(values, 'lg')).toBe('medium');
    expect(resolveResponsiveValue(values, '2xl')).toBe('large');
    expect(resolveResponsiveValue('static', 'lg')).toBe('static');
  });
});
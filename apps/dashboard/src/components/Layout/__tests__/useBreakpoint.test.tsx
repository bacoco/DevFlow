/**
 * useBreakpoint Hook Tests
 * Tests for responsive breakpoint detection
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useContainerBreakpoint } from '../../../hooks/useBreakpoint';

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;

describe('useBreakpoint', () => {
  beforeEach(() => {
    // Reset window width
    mockInnerWidth(1024);
  });

  it('returns correct initial breakpoint state', () => {
    mockInnerWidth(1024);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.current).toBe('lg');
    expect(result.current.isLg).toBe(true);
    expect(result.current.isMd).toBe(false);
  });

  it('updates breakpoint on window resize', () => {
    mockInnerWidth(768);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.current).toBe('md');
    expect(result.current.isMd).toBe(true);

    // Simulate window resize
    act(() => {
      mockInnerWidth(1280);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.current).toBe('xl');
    expect(result.current.isXl).toBe(true);
    expect(result.current.isMd).toBe(false);
  });

  it('correctly identifies breakpoint comparisons', () => {
    mockInnerWidth(1024);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isAbove('md')).toBe(true);
    expect(result.current.isAbove('xl')).toBe(false);
    expect(result.current.isBelow('xl')).toBe(true);
    expect(result.current.isBelow('sm')).toBe(false);
  });

  it('handles xs breakpoint correctly', () => {
    mockInnerWidth(400);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.current).toBe('xs');
    expect(result.current.isXs).toBe(true);
    expect(result.current.isAbove('xs')).toBe(false);
    expect(result.current.isBelow('sm')).toBe(true);
  });

  it('handles 2xl breakpoint correctly', () => {
    mockInnerWidth(1600);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.current).toBe('2xl');
    expect(result.current.is2Xl).toBe(true);
    expect(result.current.isAbove('xl')).toBe(true);
    expect(result.current.isBelow('xl')).toBe(false);
  });
});

describe('useContainerBreakpoint', () => {
  let mockContainer: HTMLDivElement;
  let containerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    containerRef = { current: mockContainer };
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => 
      useContainerBreakpoint(containerRef)
    );

    expect(result.current.containerWidth).toBe(0);
    expect(result.current.current).toBe('xs');
  });

  it('handles custom breakpoints', () => {
    const customBreakpoints = {
      small: 300,
      medium: 600,
      large: 900,
    };

    const { result } = renderHook(() => 
      useContainerBreakpoint(containerRef, customBreakpoints)
    );

    expect(result.current.isAbove('small')).toBe(false);
    expect(result.current.isBelow('medium')).toBe(true);
  });

  it('correctly compares breakpoints', () => {
    const customBreakpoints = {
      sm: 400,
      md: 800,
      lg: 1200,
    };

    const { result } = renderHook(() => 
      useContainerBreakpoint(containerRef, customBreakpoints)
    );

    // The initial state should be 'xs' with width 0
    expect(result.current.current).toBe('xs');
    expect(result.current.isAbove('sm')).toBe(false);
    expect(result.current.isBelow('md')).toBe(true);
  });
});
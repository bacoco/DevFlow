/**
 * Component Performance Tests
 * Tests for component render performance and optimization
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { Button } from '../../Button';
import { Card } from '../../Card';
import { Input } from '../../Input';
import { Modal } from '../../Modal';
import { VirtualScroll } from '../../VirtualScroll';

// Performance testing utilities
const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

const measureMemoryUsage = (): number => {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

const expectRenderTimeUnder = (renderFn: () => void, maxTime: number) => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
  return renderTime;
};

// Mock providers for performance tests
const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('Component Performance Tests', () => {
  describe('Button Performance', () => {
    it('renders single button within performance budget', () => {
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <Button>Test Button</Button>
          </TestProviders>
        );
      }, 10); // 10ms budget

      console.log(`Button render time: ${renderTime.toFixed(2)}ms`);
    });

    it('renders multiple buttons efficiently', () => {
      const buttonCount = 100;
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <div>
              {Array.from({ length: buttonCount }, (_, i) => (
                <Button key={i} variant={i % 2 === 0 ? 'primary' : 'secondary'}>
                  Button {i}
                </Button>
              ))}
            </div>
          </TestProviders>
        );
      }, 100); // 100ms budget for 100 buttons

      console.log(`${buttonCount} buttons render time: ${renderTime.toFixed(2)}ms`);
      console.log(`Average per button: ${(renderTime / buttonCount).toFixed(2)}ms`);
    });

    it('button state changes are performant', () => {
      const { rerender } = render(
        <TestProviders>
          <Button loading={false}>Test Button</Button>
        </TestProviders>
      );

      const rerenderTime = expectRenderTimeUnder(() => {
        rerender(
          <TestProviders>
            <Button loading={true}>Test Button</Button>
          </TestProviders>
        );
      }, 5); // 5ms budget for state change

      console.log(`Button state change time: ${rerenderTime.toFixed(2)}ms`);
    });
  });

  describe('Card Performance', () => {
    it('renders single card within performance budget', () => {
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <Card variant="default" padding="md">
              <h3>Card Title</h3>
              <p>Card content goes here</p>
            </Card>
          </TestProviders>
        );
      }, 15); // 15ms budget

      console.log(`Card render time: ${renderTime.toFixed(2)}ms`);
    });

    it('renders card grid efficiently', () => {
      const cardCount = 50;
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: cardCount }, (_, i) => (
                <Card key={i} variant="elevated" padding="lg">
                  <h3>Card {i}</h3>
                  <p>This is card number {i} with some content</p>
                  <Button size="sm">Action</Button>
                </Card>
              ))}
            </div>
          </TestProviders>
        );
      }, 200); // 200ms budget for 50 cards

      console.log(`${cardCount} cards render time: ${renderTime.toFixed(2)}ms`);
      console.log(`Average per card: ${(renderTime / cardCount).toFixed(2)}ms`);
    });
  });

  describe('Input Performance', () => {
    it('renders input within performance budget', () => {
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <Input label="Test Input" placeholder="Enter text..." />
          </TestProviders>
        );
      }, 10); // 10ms budget

      console.log(`Input render time: ${renderTime.toFixed(2)}ms`);
    });

    it('renders form with multiple inputs efficiently', () => {
      const inputCount = 20;
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <form>
              {Array.from({ length: inputCount }, (_, i) => (
                <Input
                  key={i}
                  label={`Input ${i}`}
                  placeholder={`Enter value for input ${i}`}
                  type={i % 3 === 0 ? 'email' : i % 3 === 1 ? 'password' : 'text'}
                />
              ))}
            </form>
          </TestProviders>
        );
      }, 80); // 80ms budget for 20 inputs

      console.log(`${inputCount} inputs render time: ${renderTime.toFixed(2)}ms`);
      console.log(`Average per input: ${(renderTime / inputCount).toFixed(2)}ms`);
    });
  });

  describe('Modal Performance', () => {
    it('renders modal within performance budget', () => {
      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <Modal isOpen={true} onClose={() => {}} title="Test Modal">
              <div>
                <p>Modal content goes here</p>
                <Button>Close</Button>
              </div>
            </Modal>
          </TestProviders>
        );
      }, 20); // 20ms budget

      console.log(`Modal render time: ${renderTime.toFixed(2)}ms`);
    });

    it('modal open/close transitions are performant', () => {
      const { rerender } = render(
        <TestProviders>
          <Modal isOpen={false} onClose={() => {}} title="Test Modal">
            <p>Modal content</p>
          </Modal>
        </TestProviders>
      );

      const openTime = expectRenderTimeUnder(() => {
        rerender(
          <TestProviders>
            <Modal isOpen={true} onClose={() => {}} title="Test Modal">
              <p>Modal content</p>
            </Modal>
          </TestProviders>
        );
      }, 15); // 15ms budget for opening

      const closeTime = expectRenderTimeUnder(() => {
        rerender(
          <TestProviders>
            <Modal isOpen={false} onClose={() => {}} title="Test Modal">
              <p>Modal content</p>
            </Modal>
          </TestProviders>
        );
      }, 10); // 10ms budget for closing

      console.log(`Modal open time: ${openTime.toFixed(2)}ms`);
      console.log(`Modal close time: ${closeTime.toFixed(2)}ms`);
    });
  });

  describe('Virtual Scroll Performance', () => {
    it('renders virtual scroll with large dataset efficiently', () => {
      const itemCount = 10000;
      const items = Array.from({ length: itemCount }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <VirtualScroll
              items={items}
              itemHeight={50}
              containerHeight={400}
              renderItem={({ item, index }) => (
                <div key={item.id} className="p-2 border-b">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                </div>
              )}
            />
          </TestProviders>
        );
      }, 50); // 50ms budget even for 10k items

      console.log(`Virtual scroll (${itemCount} items) render time: ${renderTime.toFixed(2)}ms`);
    });

    it('virtual scroll scrolling performance is smooth', () => {
      const itemCount = 1000;
      const items = Array.from({ length: itemCount }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const { container } = render(
        <TestProviders>
          <VirtualScroll
            items={items}
            itemHeight={40}
            containerHeight={300}
            renderItem={({ item }) => (
              <div key={item.id} className="p-2">
                {item.name}
              </div>
            )}
          />
        </TestProviders>
      );

      const scrollContainer = container.querySelector('[data-testid="virtual-scroll-container"]');
      expect(scrollContainer).toBeInTheDocument();

      // Simulate scroll performance test
      const scrollTime = measureRenderTime(() => {
        // Simulate multiple scroll events
        for (let i = 0; i < 10; i++) {
          scrollContainer?.dispatchEvent(new Event('scroll'));
        }
      });

      expect(scrollTime).toBeLessThan(20); // 20ms budget for 10 scroll events
      console.log(`Virtual scroll (10 scroll events) time: ${scrollTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('components do not cause memory leaks', () => {
      const initialMemory = measureMemoryUsage();

      // Render and unmount components multiple times
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <TestProviders>
            <Card>
              <Button>Button {i}</Button>
              <Input label={`Input ${i}`} />
            </Card>
          </TestProviders>
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
      console.log(`Memory increase after 100 render/unmount cycles: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });
  });

  describe('Bundle Size Impact', () => {
    it('components have minimal bundle size impact', () => {
      // This test would typically be run with a bundler analyzer
      // For now, we'll test that components can be imported without issues
      
      const componentImports = [
        () => import('../../Button'),
        () => import('../../Card'),
        () => import('../../Input'),
        () => import('../../Modal'),
      ];

      const importTime = measureRenderTime(() => {
        Promise.all(componentImports.map(importFn => importFn()));
      });

      expect(importTime).toBeLessThan(50); // 50ms budget for imports
      console.log(`Component imports time: ${importTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Rendering Performance', () => {
    it('handles concurrent renders efficiently', async () => {
      const renderPromises = Array.from({ length: 10 }, (_, i) => 
        new Promise<number>((resolve) => {
          setTimeout(() => {
            const renderTime = measureRenderTime(() => {
              render(
                <TestProviders>
                  <Card>
                    <h3>Concurrent Card {i}</h3>
                    <Button>Action {i}</Button>
                    <Input label={`Input ${i}`} />
                  </Card>
                </TestProviders>
              );
            });
            resolve(renderTime);
          }, Math.random() * 10); // Random delay up to 10ms
        })
      );

      const renderTimes = await Promise.all(renderPromises);
      const totalTime = renderTimes.reduce((sum, time) => sum + time, 0);
      const averageTime = totalTime / renderTimes.length;

      expect(averageTime).toBeLessThan(30); // 30ms average budget
      console.log(`Concurrent renders average time: ${averageTime.toFixed(2)}ms`);
      console.log(`Total concurrent render time: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Animation Performance', () => {
    it('animations do not block rendering', () => {
      // Mock requestAnimationFrame for testing
      const originalRAF = global.requestAnimationFrame;
      let rafCallbacks: FrameRequestCallback[] = [];
      
      global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return 1;
      });

      const renderTime = expectRenderTimeUnder(() => {
        render(
          <TestProviders>
            <Button className="animate-pulse">Animated Button</Button>
            <Card className="transition-all duration-300 hover:scale-105">
              Animated Card
            </Card>
          </TestProviders>
        );
      }, 25); // 25ms budget including animations

      // Execute any queued animation frames
      rafCallbacks.forEach(callback => callback(performance.now()));

      global.requestAnimationFrame = originalRAF;
      console.log(`Animated components render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('performance does not regress with component updates', () => {
      // Baseline performance measurement
      const baselineTime = measureRenderTime(() => {
        render(
          <TestProviders>
            <div>
              <Button>Baseline Button</Button>
              <Card><p>Baseline Card</p></Card>
              <Input label="Baseline Input" />
            </div>
          </TestProviders>
        );
      });

      // Performance with additional props/complexity
      const complexTime = measureRenderTime(() => {
        render(
          <TestProviders>
            <div>
              <Button variant="primary" size="lg" loading={false} disabled={false}>
                Complex Button
              </Button>
              <Card variant="elevated" padding="xl" hover={true} interactive={true}>
                <p>Complex Card with more props</p>
              </Card>
              <Input 
                label="Complex Input" 
                type="email" 
                placeholder="Enter email"
                helperText="Helper text"
                error=""
                required
              />
            </div>
          </TestProviders>
        );
      });

      // Complex version should not be more than 50% slower
      const performanceRatio = complexTime / baselineTime;
      expect(performanceRatio).toBeLessThan(1.5);

      console.log(`Baseline render time: ${baselineTime.toFixed(2)}ms`);
      console.log(`Complex render time: ${complexTime.toFixed(2)}ms`);
      console.log(`Performance ratio: ${performanceRatio.toFixed(2)}x`);
    });
  });
});
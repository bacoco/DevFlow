import {render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {Provider as PaperProvider} from 'react-native-paper';

import {MetricCard} from '../../components/MetricCard';
import {ChartWidget} from '../../components/ChartWidget';
import {DashboardScreen} from '../../screens/dashboard/DashboardScreen';
import {theme} from '../../theme';
import authReducer from '../../store/slices/authSlice';
import dashboardReducer from '../../store/slices/dashboardSlice';
import metricsReducer from '../../store/slices/metricsSlice';
import alertsReducer from '../../store/slices/alertsSlice';
import settingsReducer from '../../store/slices/settingsSlice';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      dashboard: dashboardReducer,
      metrics: metricsReducer,
      alerts: alertsReducer,
      settings: settingsReducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  
  return render(
    <Provider store={store}>
      <PaperProvider theme={theme}>
        {component}
      </PaperProvider>
    </Provider>
  );
};

describe('Mobile Performance Tests', () => {
  describe('Component Rendering Performance', () => {
    it('should render MetricCard quickly', () => {
      const startTime = performance.now();
      
      renderWithProviders(
        <MetricCard
          title="Test Metric"
          value={1234}
          unit="ms"
          trend="up"
          change={15.5}
        />
      );
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50); // Should render within 50ms
    });

    it('should render multiple MetricCards efficiently', () => {
      const startTime = performance.now();
      
      const metrics = Array.from({length: 20}, (_, i) => (
        <MetricCard
          key={i}
          title={`Metric ${i}`}
          value={Math.random() * 1000}
          unit="ms"
          trend={i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'stable'}
          change={Math.random() * 20 - 10}
        />
      ));

      renderWithProviders(<>{metrics}</>);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(200); // Should render 20 cards within 200ms
    });

    it('should render ChartWidget efficiently', () => {
      const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          data: [20, 45, 28, 80, 99],
        }],
      };

      const startTime = performance.now();
      
      renderWithProviders(
        <ChartWidget
          title="Performance Chart"
          data={chartData}
          config={{
            type: 'line',
            height: 200,
            interactive: true,
          }}
        />
      );
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });
  });

  describe('Screen Loading Performance', () => {
    it('should load DashboardScreen quickly', async () => {
      const initialState = {
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer',
          },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        dashboard: {
          data: {
            widgets: [
              {
                id: '1',
                type: 'metric',
                title: 'Code Quality',
                data: {value: 85, unit: '%', trend: 'up', change: 5},
                config: {},
                position: {x: 0, y: 0},
                size: {width: 1, height: 1},
              },
              {
                id: '2',
                type: 'chart',
                title: 'Productivity Trend',
                data: {
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                  datasets: [{data: [65, 78, 82, 75, 88]}],
                },
                config: {type: 'line'},
                position: {x: 1, y: 0},
                size: {width: 2, height: 1},
              },
            ],
            layout: 'grid',
            lastUpdated: new Date().toISOString(),
          },
          isLoading: false,
          error: null,
          refreshing: false,
        },
      };

      const startTime = performance.now();
      
      const {getByText} = renderWithProviders(<DashboardScreen />, initialState);
      
      await waitFor(() => {
        expect(getByText(/Good \w+, Test User!/)).toBeTruthy();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(300); // Should load within 300ms
    });

    it('should handle empty dashboard state efficiently', async () => {
      const initialState = {
        auth: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer',
          },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        dashboard: {
          data: {
            widgets: [],
            layout: 'grid',
            lastUpdated: new Date().toISOString(),
          },
          isLoading: false,
          error: null,
          refreshing: false,
        },
      };

      const startTime = performance.now();
      
      const {getByText} = renderWithProviders(<DashboardScreen />, initialState);
      
      await waitFor(() => {
        expect(getByText('No widgets configured')).toBeTruthy();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(200); // Empty state should load even faster
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks with multiple renders', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render and unmount components multiple times
      for (let i = 0; i < 50; i++) {
        const {unmount} = renderWithProviders(
          <MetricCard
            title={`Memory Test ${i}`}
            value={i * 100}
            unit="MB"
            trend="up"
            change={5}
          />
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = {
        labels: Array.from({length: 100}, (_, i) => `Point ${i}`),
        datasets: [{
          data: Array.from({length: 100}, () => Math.random() * 100),
        }],
      };

      const startTime = performance.now();
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const {unmount} = renderWithProviders(
        <ChartWidget
          title="Large Dataset Chart"
          data={largeDataset}
          config={{
            type: 'line',
            height: 300,
            interactive: true,
            zoomable: true,
          }}
        />
      );
      
      const renderTime = performance.now() - startTime;
      const memoryAfterRender = (performance as any).memory?.usedJSHeapSize || 0;
      
      unmount();
      
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      
      expect(renderTime).toBeLessThan(500); // Should render within 500ms
      expect(memoryAfterRender - initialMemory).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
      expect(memoryAfterUnmount).toBeLessThanOrEqual(memoryAfterRender); // Memory should not increase after unmount
    });
  });

  describe('Animation Performance', () => {
    it('should handle rapid state changes smoothly', async () => {
      const {rerender} = renderWithProviders(
        <MetricCard
          title="Animation Test"
          value={100}
          unit="ms"
          trend="up"
          change={5}
        />
      );

      const startTime = performance.now();
      
      // Simulate rapid value changes
      for (let i = 0; i < 20; i++) {
        rerender(
          <Provider store={createTestStore()}>
            <PaperProvider theme={theme}>
              <MetricCard
                title="Animation Test"
                value={100 + i * 10}
                unit="ms"
                trend={i % 2 === 0 ? 'up' : 'down'}
                change={Math.random() * 20 - 10}
              />
            </PaperProvider>
          </Provider>
        );
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(200); // 20 updates should complete within 200ms
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous renders', async () => {
      const startTime = performance.now();
      
      const renderPromises = Array.from({length: 10}, (_, i) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            renderWithProviders(
              <MetricCard
                title={`Concurrent ${i}`}
                value={i * 100}
                unit="ms"
                trend="stable"
                change={0}
              />
            );
            resolve();
          }, Math.random() * 50);
        })
      );

      await Promise.all(renderPromises);
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(300); // All renders should complete within 300ms
    });
  });
});

// Performance monitoring utilities
export const measureRenderTime = (component: React.ReactElement): number => {
  const startTime = performance.now();
  renderWithProviders(component);
  return performance.now() - startTime;
};

export const measureMemoryUsage = (operation: () => void): number => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  operation();
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  return finalMemory - initialMemory;
};
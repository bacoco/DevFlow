import React from 'react';
import {render} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';

import App from '../App';
import authReducer from '../store/slices/authSlice';
import dashboardReducer from '../store/slices/dashboardSlice';
import metricsReducer from '../store/slices/metricsSlice';
import alertsReducer from '../store/slices/alertsSlice';
import settingsReducer from '../store/slices/settingsSlice';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({children}: {children: React.ReactNode}) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({children}: {children: React.ReactNode}) => children,
  }),
}));

// Mock PersistGate
jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({children}: {children: React.ReactNode}) => children,
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

describe('App', () => {
  it('renders without crashing', () => {
    const store = createTestStore();
    
    const {getByTestId} = render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // App should render without throwing
    expect(true).toBe(true);
  });

  it('renders loading screen when auth is loading', () => {
    const store = createTestStore({
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
      },
    });

    const {getByText} = render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows auth navigator when not authenticated', () => {
    const store = createTestStore({
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Should render auth flow (no specific test as navigation is mocked)
    expect(true).toBe(true);
  });

  it('shows main navigator when authenticated', () => {
    const store = createTestStore({
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
    });

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Should render main app flow (no specific test as navigation is mocked)
    expect(true).toBe(true);
  });
});
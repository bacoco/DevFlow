import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  alertSeverityThreshold: 'low' | 'medium' | 'high' | 'critical';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  crashReporting: boolean;
  personalizedInsights: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  refreshInterval: number; // in seconds
  showTrends: boolean;
}

interface SettingsState {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  notifications: {
    pushNotifications: true,
    emailNotifications: false,
    alertSeverityThreshold: 'medium',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
  privacy: {
    dataCollection: true,
    analytics: true,
    crashReporting: true,
    personalizedInsights: true,
  },
  display: {
    theme: 'auto',
    fontSize: 'medium',
    refreshInterval: 30,
    showTrends: true,
  },
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = {...state.notifications, ...action.payload};
    },
    updatePrivacySettings: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = {...state.privacy, ...action.payload};
    },
    updateDisplaySettings: (state, action: PayloadAction<Partial<DisplaySettings>>) => {
      state.display = {...state.display, ...action.payload};
    },
    resetSettings: (state) => {
      state.notifications = initialState.notifications;
      state.privacy = initialState.privacy;
      state.display = initialState.display;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  updateNotificationSettings,
  updatePrivacySettings,
  updateDisplaySettings,
  resetSettings,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
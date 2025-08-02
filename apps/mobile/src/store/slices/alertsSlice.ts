import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {alertsService} from '@/services/alertsService';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'productivity' | 'quality' | 'security' | 'system';
  timestamp: string;
  isRead: boolean;
  actionRequired: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary';
  }>;
}

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
}

const initialState: AlertsState = {
  alerts: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  refreshing: false,
};

export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async () => {
    const response = await alertsService.getAlerts();
    return response;
  }
);

export const markAsRead = createAsyncThunk(
  'alerts/markAsRead',
  async (alertId: string) => {
    await alertsService.markAsRead(alertId);
    return alertId;
  }
);

export const dismissAlert = createAsyncThunk(
  'alerts/dismissAlert',
  async (alertId: string) => {
    await alertsService.dismissAlert(alertId);
    return alertId;
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    updateUnreadCount: (state) => {
      state.unreadCount = state.alerts.filter(alert => !alert.isRead).length;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.alerts = action.payload;
        state.unreadCount = action.payload.filter(alert => !alert.isRead).length;
        state.error = null;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch alerts';
      })
      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a.id === action.payload);
        if (alert && !alert.isRead) {
          alert.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // Dismiss Alert
      .addCase(dismissAlert.fulfilled, (state, action) => {
        const index = state.alerts.findIndex(a => a.id === action.payload);
        if (index !== -1) {
          const alert = state.alerts[index];
          if (!alert.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.alerts.splice(index, 1);
        }
      });
  },
});

export const {clearError, addAlert, updateUnreadCount} = alertsSlice.actions;
export default alertsSlice.reducer;
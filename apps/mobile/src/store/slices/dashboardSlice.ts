import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {dashboardService} from '@/services/dashboardService';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'progress';
  title: string;
  data: any;
  config: Record<string, any>;
  position: {x: number; y: number};
  size: {width: number; height: number};
}

export interface DashboardData {
  widgets: DashboardWidget[];
  layout: string;
  lastUpdated: string;
}

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
}

const initialState: DashboardState = {
  data: null,
  isLoading: false,
  error: null,
  refreshing: false,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async () => {
    const response = await dashboardService.getDashboard();
    return response;
  }
);

export const refreshDashboard = createAsyncThunk(
  'dashboard/refreshDashboard',
  async () => {
    const response = await dashboardService.getDashboard();
    return response;
  }
);

export const updateWidget = createAsyncThunk(
  'dashboard/updateWidget',
  async (widget: DashboardWidget) => {
    const response = await dashboardService.updateWidget(widget);
    return response;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateWidgetData: (state, action: PayloadAction<{id: string; data: any}>) => {
      if (state.data) {
        const widget = state.data.widgets.find(w => w.id === action.payload.id);
        if (widget) {
          widget.data = action.payload.data;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dashboard
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch dashboard';
      })
      // Refresh Dashboard
      .addCase(refreshDashboard.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.refreshing = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(refreshDashboard.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.error.message || 'Failed to refresh dashboard';
      })
      // Update Widget
      .addCase(updateWidget.fulfilled, (state, action) => {
        if (state.data) {
          const index = state.data.widgets.findIndex(w => w.id === action.payload.id);
          if (index !== -1) {
            state.data.widgets[index] = action.payload;
          }
        }
      });
  },
});

export const {clearError, updateWidgetData} = dashboardSlice.actions;
export default dashboardSlice.reducer;
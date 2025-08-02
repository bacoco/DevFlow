import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {metricsService} from '@/services/metricsService';

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  timestamp: string;
}

export interface MetricCategory {
  id: string;
  name: string;
  metrics: Metric[];
}

interface MetricsState {
  categories: MetricCategory[];
  selectedTimeRange: '1h' | '24h' | '7d' | '30d';
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
}

const initialState: MetricsState = {
  categories: [],
  selectedTimeRange: '24h',
  isLoading: false,
  error: null,
  refreshing: false,
};

export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async (timeRange: string) => {
    const response = await metricsService.getMetrics(timeRange);
    return response;
  }
);

export const refreshMetrics = createAsyncThunk(
  'metrics/refreshMetrics',
  async (timeRange: string) => {
    const response = await metricsService.getMetrics(timeRange);
    return response;
  }
);

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    setTimeRange: (state, action: PayloadAction<'1h' | '24h' | '7d' | '30d'>) => {
      state.selectedTimeRange = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateMetricValue: (state, action: PayloadAction<{id: string; value: number; trend: 'up' | 'down' | 'stable'}>) => {
      state.categories.forEach(category => {
        const metric = category.metrics.find(m => m.id === action.payload.id);
        if (metric) {
          metric.value = action.payload.value;
          metric.trend = action.payload.trend;
          metric.timestamp = new Date().toISOString();
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Metrics
      .addCase(fetchMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch metrics';
      })
      // Refresh Metrics
      .addCase(refreshMetrics.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshMetrics.fulfilled, (state, action) => {
        state.refreshing = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(refreshMetrics.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.error.message || 'Failed to refresh metrics';
      });
  },
});

export const {setTimeRange, clearError, updateMetricValue} = metricsSlice.actions;
export default metricsSlice.reducer;
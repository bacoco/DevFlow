import { StreamEvent, TimeWindow, WindowConfig, WindowFunction } from '../types/stream-processing';

export class WindowManager {
  private windows: Map<string, TimeWindow[]> = new Map();
  private config: WindowConfig;

  constructor(config: WindowConfig) {
    this.config = config;
  }

  addEvent(event: StreamEvent, windowKey: string = 'default'): TimeWindow[] {
    const eventTime = event.timestamp;
    const windows = this.getOrCreateWindows(windowKey, eventTime);
    
    // Add event to appropriate windows
    const affectedWindows: TimeWindow[] = [];
    for (const window of windows) {
      if (this.eventBelongsToWindow(event, window)) {
        window.events.push(event);
        affectedWindows.push(window);
      }
    }

    // Clean up expired windows
    this.cleanupExpiredWindows(windowKey, eventTime);

    return affectedWindows;
  }

  private getOrCreateWindows(windowKey: string, eventTime: Date): TimeWindow[] {
    if (!this.windows.has(windowKey)) {
      this.windows.set(windowKey, []);
    }

    const windows = this.windows.get(windowKey)!;
    const newWindows = this.createWindowsForTime(eventTime);
    
    // Add new windows that don't already exist
    for (const newWindow of newWindows) {
      const exists = windows.some(w => 
        w.start.getTime() === newWindow.start.getTime() && 
        w.end.getTime() === newWindow.end.getTime()
      );
      if (!exists) {
        windows.push(newWindow);
      }
    }

    return windows;
  }

  private createWindowsForTime(eventTime: Date): TimeWindow[] {
    const windows: TimeWindow[] = [];

    switch (this.config.type) {
      case 'tumbling':
        windows.push(this.createTumblingWindow(eventTime));
        break;
      case 'sliding':
        windows.push(...this.createSlidingWindows(eventTime));
        break;
      case 'session':
        windows.push(this.createSessionWindow(eventTime));
        break;
    }

    return windows;
  }

  private createTumblingWindow(eventTime: Date): TimeWindow {
    const windowSize = this.config.size;
    const windowStart = new Date(Math.floor(eventTime.getTime() / windowSize) * windowSize);
    const windowEnd = new Date(windowStart.getTime() + windowSize);

    return {
      start: windowStart,
      end: windowEnd,
      events: []
    };
  }

  private createSlidingWindows(eventTime: Date): TimeWindow[] {
    const windowSize = this.config.size;
    const slideSize = this.config.slide || windowSize;
    const windows: TimeWindow[] = [];

    // Create overlapping windows
    const currentTime = eventTime.getTime();
    const numWindows = Math.ceil(windowSize / slideSize);

    for (let i = 0; i < numWindows; i++) {
      const windowStart = new Date(currentTime - (i * slideSize));
      const windowEnd = new Date(windowStart.getTime() + windowSize);
      
      if (windowEnd.getTime() >= eventTime.getTime()) {
        windows.push({
          start: windowStart,
          end: windowEnd,
          events: []
        });
      }
    }

    return windows;
  }

  private createSessionWindow(eventTime: Date): TimeWindow {
    const sessionTimeout = this.config.sessionTimeout || 30 * 60 * 1000; // 30 minutes default
    
    return {
      start: eventTime,
      end: new Date(eventTime.getTime() + sessionTimeout),
      events: []
    };
  }

  private eventBelongsToWindow(event: StreamEvent, window: TimeWindow): boolean {
    const eventTime = event.timestamp.getTime();
    return eventTime >= window.start.getTime() && eventTime < window.end.getTime();
  }

  private cleanupExpiredWindows(windowKey: string, currentTime: Date): void {
    const windows = this.windows.get(windowKey);
    if (!windows) return;

    const cutoffTime = currentTime.getTime() - (this.config.size * 2); // Keep windows for 2x window size
    const activeWindows = windows.filter(w => w.end.getTime() > cutoffTime);
    
    this.windows.set(windowKey, activeWindows);
  }

  getCompletedWindows(windowKey: string = 'default', currentTime: Date = new Date()): TimeWindow[] {
    const windows = this.windows.get(windowKey) || [];
    return windows.filter(w => w.end.getTime() <= currentTime.getTime());
  }

  getActiveWindows(windowKey: string = 'default', currentTime: Date = new Date()): TimeWindow[] {
    const windows = this.windows.get(windowKey) || [];
    return windows.filter(w => w.end.getTime() > currentTime.getTime());
  }

  applyWindowFunction<R>(
    windowKey: string,
    windowFunction: WindowFunction<StreamEvent, R>,
    currentTime: Date = new Date()
  ): R[] {
    const completedWindows = this.getCompletedWindows(windowKey, currentTime);
    const results: R[] = [];

    for (const window of completedWindows) {
      const windowResults = windowFunction.apply(window.events, window.start, window.end);
      results.push(...windowResults);
    }

    // Remove processed windows
    const activeWindows = this.getActiveWindows(windowKey, currentTime);
    this.windows.set(windowKey, activeWindows);

    return results;
  }

  getWindowStats(windowKey: string = 'default'): {
    activeWindows: number;
    totalEvents: number;
    oldestWindow?: Date;
    newestWindow?: Date;
  } {
    const windows = this.windows.get(windowKey) || [];
    const totalEvents = windows.reduce((sum, w) => sum + w.events.length, 0);
    
    const stats = {
      activeWindows: windows.length,
      totalEvents,
      oldestWindow: windows.length > 0 ? windows[0].start : undefined,
      newestWindow: windows.length > 0 ? windows[windows.length - 1].end : undefined
    };

    return stats;
  }
}
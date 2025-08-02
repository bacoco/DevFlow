import { EventEmitter } from 'events';

export interface AutoRefreshOptions {
  interval: number; // in milliseconds
  enabled: boolean;
  onRefresh?: () => void;
  onError?: (error: Error) => void;
}

export interface RefreshSubscription {
  id: string;
  interval: number;
  callback: () => void;
  lastRefresh: Date;
  enabled: boolean;
}

export class AutoRefreshService extends EventEmitter {
  private subscriptions = new Map<string, RefreshSubscription>();
  private timers = new Map<string, NodeJS.Timeout>();
  private globalEnabled = true;

  /**
   * Subscribe to auto-refresh with a specific interval
   */
  public subscribe(id: string, options: AutoRefreshOptions): void {
    // Clear existing subscription if it exists
    this.unsubscribe(id);

    const subscription: RefreshSubscription = {
      id,
      interval: options.interval,
      callback: options.onRefresh || (() => {}),
      lastRefresh: new Date(),
      enabled: options.enabled && this.globalEnabled
    };

    this.subscriptions.set(id, subscription);

    if (subscription.enabled) {
      this.startTimer(subscription);
    }

    this.emit('subscription_added', { id, options });
  }

  /**
   * Unsubscribe from auto-refresh
   */
  public unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    this.stopTimer(id);
    this.subscriptions.delete(id);
    this.emit('subscription_removed', { id });
  }

  /**
   * Enable or disable a specific subscription
   */
  public setEnabled(id: string, enabled: boolean): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    subscription.enabled = enabled && this.globalEnabled;

    if (subscription.enabled) {
      this.startTimer(subscription);
    } else {
      this.stopTimer(id);
    }

    this.emit('subscription_toggled', { id, enabled: subscription.enabled });
  }

  /**
   * Update the refresh interval for a subscription
   */
  public updateInterval(id: string, interval: number): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    subscription.interval = interval;

    if (subscription.enabled) {
      this.stopTimer(id);
      this.startTimer(subscription);
    }

    this.emit('interval_updated', { id, interval });
  }

  /**
   * Manually trigger a refresh for a specific subscription
   */
  public refresh(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return;

    try {
      subscription.callback();
      subscription.lastRefresh = new Date();
      this.emit('manual_refresh', { id });
    } catch (error) {
      this.emit('refresh_error', { id, error });
    }
  }

  /**
   * Refresh all active subscriptions
   */
  public refreshAll(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.enabled) {
        this.refresh(subscription.id);
      }
    });
  }

  /**
   * Enable or disable all auto-refresh globally
   */
  public setGlobalEnabled(enabled: boolean): void {
    const wasEnabled = this.globalEnabled;
    this.globalEnabled = enabled;

    if (enabled && !wasEnabled) {
      // Re-enable all subscriptions that were individually enabled
      this.subscriptions.forEach((subscription) => {
        if (subscription.enabled) {
          this.startTimer(subscription);
        }
      });
    } else if (!enabled && wasEnabled) {
      // Disable all timers
      this.timers.forEach((timer, id) => {
        this.stopTimer(id);
      });
    }

    this.emit('global_toggle', { enabled });
  }

  /**
   * Get the status of a subscription
   */
  public getSubscription(id: string): RefreshSubscription | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * Get all active subscriptions
   */
  public getAllSubscriptions(): RefreshSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get global enabled state
   */
  public isGlobalEnabled(): boolean {
    return this.globalEnabled;
  }

  /**
   * Pause all auto-refresh (useful when tab is not visible)
   */
  public pause(): void {
    this.timers.forEach((timer, id) => {
      this.stopTimer(id);
    });
    this.emit('paused');
  }

  /**
   * Resume all auto-refresh
   */
  public resume(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.enabled && this.globalEnabled) {
        this.startTimer(subscription);
      }
    });
    this.emit('resumed');
  }

  /**
   * Clean up all subscriptions and timers
   */
  public destroy(): void {
    this.timers.forEach((timer, id) => {
      this.stopTimer(id);
    });
    this.subscriptions.clear();
    this.removeAllListeners();
    this.emit('destroyed');
  }

  private startTimer(subscription: RefreshSubscription): void {
    this.stopTimer(subscription.id);

    const timer = setInterval(() => {
      try {
        subscription.callback();
        subscription.lastRefresh = new Date();
        this.emit('auto_refresh', { id: subscription.id });
      } catch (error) {
        this.emit('refresh_error', { id: subscription.id, error });
      }
    }, subscription.interval);

    this.timers.set(subscription.id, timer);
  }

  private stopTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }
}

// Singleton instance
export const autoRefreshService = new AutoRefreshService();

// Page visibility handling
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      autoRefreshService.pause();
    } else {
      autoRefreshService.resume();
    }
  });
}

export default autoRefreshService;
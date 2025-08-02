import PushNotification from 'react-native-push-notification';

// Define Importance enum for testing compatibility
const Importance = {
  HIGH: 4,
  DEFAULT: 3,
  LOW: 2,
  MIN: 1,
};
import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  category?: string;
}

class NotificationService {
  private isConfigured = false;
  private readonly PERMISSION_KEY = 'notification_permission';

  async initialize(): Promise<boolean> {
    if (this.isConfigured) {
      return true;
    }

    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Configure push notifications
      PushNotification.configure({
        onRegister: (token) => {
          console.log('Push notification token:', token);
          this.saveDeviceToken(token.token);
        },

        onNotification: (notification) => {
          console.log('Notification received:', notification);
          
          // Handle notification tap
          if (notification.userInteraction) {
            this.handleNotificationTap(notification);
          }
        },

        onAction: (notification) => {
          console.log('Notification action:', notification);
        },

        onRegistrationError: (err) => {
          console.error('Push notification registration error:', err);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
          await AsyncStorage.setItem(this.PERMISSION_KEY, hasPermission.toString());
          return hasPermission;
        }
        return true; // Android < 33 doesn't need runtime permission
      }

      // iOS permissions are handled by the configure method
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  private createNotificationChannels(): void {
    const channels = [
      {
        channelId: 'alerts',
        channelName: 'Alerts',
        channelDescription: 'Productivity and system alerts',
        importance: Importance.HIGH,
        vibrate: true,
      },
      {
        channelId: 'insights',
        channelName: 'Insights',
        channelDescription: 'Productivity insights and recommendations',
        importance: Importance.DEFAULT,
        vibrate: false,
      },
      {
        channelId: 'reminders',
        channelName: 'Reminders',
        channelDescription: 'Task and goal reminders',
        importance: Importance.DEFAULT,
        vibrate: true,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(
        {
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelDescription: channel.channelDescription,
          importance: channel.importance,
          vibrate: channel.vibrate,
        },
        (created) => {
          console.log(`Channel ${channel.channelId} created:`, created);
        }
      );
    });
  }

  async showLocalNotification(notification: NotificationData): Promise<void> {
    if (!this.isConfigured) {
      await this.initialize();
    }

    const channelId = this.getChannelId(notification.category);
    
    PushNotification.localNotification({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      userInfo: notification.data,
      channelId,
      priority: this.getPriority(notification.priority),
      vibrate: true,
      playSound: true,
      soundName: 'default',
      actions: notification.data?.actions || [],
    });
  }

  async scheduleNotification(
    notification: NotificationData,
    date: Date
  ): Promise<void> {
    if (!this.isConfigured) {
      await this.initialize();
    }

    const channelId = this.getChannelId(notification.category);

    PushNotification.localNotificationSchedule({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      date,
      userInfo: notification.data,
      channelId,
      priority: this.getPriority(notification.priority),
      vibrate: true,
      playSound: true,
      soundName: 'default',
    });
  }

  cancelNotification(notificationId: string): void {
    PushNotification.cancelLocalNotification(notificationId);
  }

  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  async setBadgeNumber(number: number): Promise<void> {
    PushNotification.setApplicationIconBadgeNumber(number);
  }

  async getPermissionStatus(): Promise<boolean> {
    try {
      const permission = await AsyncStorage.getItem(this.PERMISSION_KEY);
      return permission === 'true';
    } catch (error) {
      return false;
    }
  }

  private async saveDeviceToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('device_token', token);
      // TODO: Send token to backend for push notifications
    } catch (error) {
      console.error('Failed to save device token:', error);
    }
  }

  private handleNotificationTap(notification: any): void {
    // TODO: Navigate to appropriate screen based on notification data
    console.log('Notification tapped:', notification);
  }

  private getChannelId(category?: string): string {
    switch (category) {
      case 'alert':
      case 'critical':
        return 'alerts';
      case 'insight':
      case 'recommendation':
        return 'insights';
      case 'reminder':
        return 'reminders';
      default:
        return 'alerts';
    }
  }

  private getPriority(priority?: string): 'low' | 'normal' | 'high' {
    switch (priority) {
      case 'low':
        return 'low';
      case 'high':
        return 'high';
      default:
        return 'normal';
    }
  }
}

export const notificationService = new NotificationService();
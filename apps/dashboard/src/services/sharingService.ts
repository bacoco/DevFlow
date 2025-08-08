import {
  ShareLink,
  ShareOptions,
  SharePermission,
  EmbedOptions,
  ShareAnalytics,
  ShareNotification,
} from '../types/export';

class SharingService {
  private shareLinks: Map<string, ShareLink> = new Map();
  private analytics: Map<string, ShareAnalytics> = new Map();
  private notifications: ShareNotification[] = [];

  /**
   * Create a shareable link for a dashboard
   */
  async createShareLink(
    dashboardId: string,
    options: ShareOptions,
    createdBy: string
  ): Promise<ShareLink> {
    const linkId = this.generateLinkId();
    const token = this.generateSecureToken();
    const baseUrl = window.location.origin;
    
    const shareLink: ShareLink = {
      id: linkId,
      url: `${baseUrl}/shared/${token}`,
      token,
      dashboardId,
      permission: options.permission,
      expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn) : undefined,
      createdAt: new Date(),
      createdBy,
      isActive: true,
      allowedEmails: options.allowedEmails,
      requireAuth: options.requireAuth,
      password: options.password,
      viewCount: 0,
    };

    this.shareLinks.set(linkId, shareLink);
    
    // Initialize analytics
    this.analytics.set(linkId, {
      linkId,
      totalViews: 0,
      uniqueViewers: 0,
      viewsByDate: {},
      viewerLocations: {},
      averageViewDuration: 0,
    });

    return shareLink;
  }

  /**
   * Get all share links for a dashboard
   */
  getShareLinks(dashboardId: string): ShareLink[] {
    return Array.from(this.shareLinks.values())
      .filter(link => link.dashboardId === dashboardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a share link by ID
   */
  getShareLink(linkId: string): ShareLink | null {
    return this.shareLinks.get(linkId) || null;
  }

  /**
   * Get a share link by token
   */
  getShareLinkByToken(token: string): ShareLink | null {
    for (const link of this.shareLinks.values()) {
      if (link.token === token) {
        return link;
      }
    }
    return null;
  }

  /**
   * Update share link settings
   */
  async updateShareLink(
    linkId: string,
    updates: Partial<ShareOptions>
  ): Promise<ShareLink | null> {
    const link = this.shareLinks.get(linkId);
    if (!link) return null;

    const updatedLink: ShareLink = {
      ...link,
      permission: updates.permission || link.permission,
      expiresAt: updates.expiresIn 
        ? new Date(Date.now() + updates.expiresIn)
        : link.expiresAt,
      allowedEmails: updates.allowedEmails || link.allowedEmails,
      requireAuth: updates.requireAuth !== undefined ? updates.requireAuth : link.requireAuth,
      password: updates.password !== undefined ? updates.password : link.password,
    };

    this.shareLinks.set(linkId, updatedLink);
    return updatedLink;
  }

  /**
   * Deactivate a share link
   */
  async deactivateShareLink(linkId: string): Promise<boolean> {
    const link = this.shareLinks.get(linkId);
    if (!link) return false;

    link.isActive = false;
    this.shareLinks.set(linkId, link);
    return true;
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(linkId: string): Promise<boolean> {
    const deleted = this.shareLinks.delete(linkId);
    if (deleted) {
      this.analytics.delete(linkId);
    }
    return deleted;
  }

  /**
   * Validate access to a shared dashboard
   */
  async validateAccess(
    token: string,
    userEmail?: string,
    password?: string
  ): Promise<{ valid: boolean; link?: ShareLink; reason?: string }> {
    const link = this.getShareLinkByToken(token);
    
    if (!link) {
      return { valid: false, reason: 'Link not found' };
    }

    if (!link.isActive) {
      return { valid: false, reason: 'Link is inactive' };
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return { valid: false, reason: 'Link has expired' };
    }

    if (link.allowedEmails && link.allowedEmails.length > 0) {
      if (!userEmail || !link.allowedEmails.includes(userEmail)) {
        return { valid: false, reason: 'Email not authorized' };
      }
    }

    if (link.password && link.password !== password) {
      return { valid: false, reason: 'Invalid password' };
    }

    return { valid: true, link };
  }

  /**
   * Record a view for analytics
   */
  async recordView(
    linkId: string,
    viewerInfo: {
      userAgent?: string;
      ipAddress?: string;
      location?: string;
      duration?: number;
    }
  ): Promise<void> {
    const link = this.shareLinks.get(linkId);
    const analytics = this.analytics.get(linkId);
    
    if (!link || !analytics) return;

    // Update link view count
    link.viewCount += 1;
    link.lastAccessedAt = new Date();
    this.shareLinks.set(linkId, link);

    // Update analytics
    const today = new Date().toISOString().split('T')[0];
    analytics.totalViews += 1;
    analytics.viewsByDate[today] = (analytics.viewsByDate[today] || 0) + 1;
    
    if (viewerInfo.location) {
      analytics.viewerLocations[viewerInfo.location] = 
        (analytics.viewerLocations[viewerInfo.location] || 0) + 1;
    }

    if (viewerInfo.duration) {
      const totalDuration = analytics.averageViewDuration * (analytics.totalViews - 1);
      analytics.averageViewDuration = (totalDuration + viewerInfo.duration) / analytics.totalViews;
    }

    analytics.lastViewedAt = new Date();
    this.analytics.set(linkId, analytics);
  }

  /**
   * Get analytics for a share link
   */
  getAnalytics(linkId: string): ShareAnalytics | null {
    return this.analytics.get(linkId) || null;
  }

  /**
   * Generate embed code for a dashboard
   */
  generateEmbedCode(
    token: string,
    options: EmbedOptions = {}
  ): string {
    const {
      width = 800,
      height = 600,
      theme = 'light',
      showHeader = true,
      showFooter = false,
      allowInteraction = true,
      autoRefresh,
      filters,
    } = options;

    const baseUrl = window.location.origin;
    const embedUrl = new URL(`${baseUrl}/embed/${token}`);
    
    // Add query parameters
    embedUrl.searchParams.set('theme', theme);
    embedUrl.searchParams.set('header', showHeader.toString());
    embedUrl.searchParams.set('footer', showFooter.toString());
    embedUrl.searchParams.set('interactive', allowInteraction.toString());
    
    if (autoRefresh) {
      embedUrl.searchParams.set('refresh', autoRefresh.toString());
    }
    
    if (filters) {
      embedUrl.searchParams.set('filters', JSON.stringify(filters));
    }

    return `<iframe
  src="${embedUrl.toString()}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowtransparency="true"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);"
  title="Dashboard Embed"
></iframe>`;
  }

  /**
   * Generate a responsive embed code
   */
  generateResponsiveEmbedCode(
    token: string,
    options: EmbedOptions = {}
  ): string {
    const {
      theme = 'light',
      showHeader = true,
      showFooter = false,
      allowInteraction = true,
      autoRefresh,
      filters,
    } = options;

    const baseUrl = window.location.origin;
    const embedUrl = new URL(`${baseUrl}/embed/${token}`);
    
    // Add query parameters
    embedUrl.searchParams.set('theme', theme);
    embedUrl.searchParams.set('header', showHeader.toString());
    embedUrl.searchParams.set('footer', showFooter.toString());
    embedUrl.searchParams.set('interactive', allowInteraction.toString());
    
    if (autoRefresh) {
      embedUrl.searchParams.set('refresh', autoRefresh.toString());
    }
    
    if (filters) {
      embedUrl.searchParams.set('filters', JSON.stringify(filters));
    }

    return `<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
  <iframe
    src="${embedUrl.toString()}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);"
    frameborder="0"
    allowtransparency="true"
    title="Dashboard Embed"
  ></iframe>
</div>`;
  }

  /**
   * Send share link via email
   */
  async sendShareLink(
    linkId: string,
    recipients: string[],
    message?: string
  ): Promise<boolean> {
    const link = this.shareLinks.get(linkId);
    if (!link) return false;

    // In a real implementation, this would integrate with an email service
    console.log('Sending share link via email:', {
      linkId,
      recipients,
      url: link.url,
      message,
    });

    // Add notification
    this.notifications.push({
      id: this.generateNotificationId(),
      linkId,
      type: 'access',
      message: `Share link sent to ${recipients.length} recipient(s)`,
      createdAt: new Date(),
      read: false,
    });

    return true;
  }

  /**
   * Get notifications for share links
   */
  getNotifications(): ShareNotification[] {
    return this.notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Check for expired links and send notifications
   */
  async checkExpiredLinks(): Promise<void> {
    const now = new Date();
    
    for (const link of this.shareLinks.values()) {
      if (link.expiresAt && link.expiresAt < now && link.isActive) {
        link.isActive = false;
        this.shareLinks.set(link.id, link);
        
        this.notifications.push({
          id: this.generateNotificationId(),
          linkId: link.id,
          type: 'expired',
          message: `Share link for dashboard ${link.dashboardId} has expired`,
          createdAt: new Date(),
          read: false,
        });
      }
    }
  }

  /**
   * Get sharing statistics
   */
  getSharingStats(dashboardId?: string): {
    totalLinks: number;
    activeLinks: number;
    totalViews: number;
    uniqueViewers: number;
    topLinks: Array<{ linkId: string; views: number; url: string }>;
  } {
    const links = dashboardId 
      ? Array.from(this.shareLinks.values()).filter(l => l.dashboardId === dashboardId)
      : Array.from(this.shareLinks.values());

    const activeLinks = links.filter(l => l.isActive);
    const totalViews = links.reduce((sum, link) => sum + link.viewCount, 0);
    
    const topLinks = links
      .map(link => ({
        linkId: link.id,
        views: link.viewCount,
        url: link.url,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      totalLinks: links.length,
      activeLinks: activeLinks.length,
      totalViews,
      uniqueViewers: 0, // Would need more sophisticated tracking
      topLinks,
    };
  }

  // Private helper methods
  private generateLinkId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing purposes)
   */
  clearAll(): void {
    this.shareLinks.clear();
    this.analytics.clear();
    this.notifications = [];
  }
}

export const sharingService = new SharingService();
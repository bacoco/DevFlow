/**
 * SharingService
 * Handles content sharing with granular permissions and expiration controls
 */

import {
  ShareableContent,
  ShareRequest,
  SharedContent,
  SharePermission,
  ShareRecipient,
  User,
  PermissionCondition,
  ShareAction
} from './types';

export class SharingService {
  private sharedContent: Map<string, SharedContent> = new Map();
  private shareCounter = 0;

  /**
   * Share content with specified recipients and permissions
   */
  async shareContent(
    content: ShareableContent,
    shareRequest: ShareRequest
  ): Promise<SharedContent> {
    // Validate share request
    this.validateShareRequest(shareRequest);

    // Generate unique share ID and URL
    const shareId = this.generateShareId();
    const shareUrl = this.generateShareUrl(shareId);

    // Create shared content record
    const sharedContent: SharedContent = {
      id: shareId,
      contentId: shareRequest.contentId,
      sharedBy: content.createdBy,
      sharedWith: shareRequest.recipients,
      permissions: shareRequest.permissions,
      shareUrl,
      accessCount: 0,
      lastAccessed: undefined,
      expiresAt: shareRequest.expiresAt,
      createdAt: new Date(),
      isActive: true
    };

    // Store shared content
    this.sharedContent.set(shareId, sharedContent);

    // Send notifications if requested
    if (shareRequest.notifyRecipients) {
      await this.notifyRecipients(sharedContent, shareRequest.message);
    }

    // Log sharing activity
    this.logSharingActivity(content.createdBy, 'content_shared', {
      contentType: content.type,
      recipientCount: shareRequest.recipients.length,
      hasExpiration: !!shareRequest.expiresAt
    });

    return sharedContent;
  }

  /**
   * Get shared content for a user
   */
  async getSharedContent(userId: string): Promise<SharedContent[]> {
    const userShares: SharedContent[] = [];

    for (const [, sharedContent] of this.sharedContent) {
      // Check if user is the sharer or a recipient
      const isSharer = sharedContent.sharedBy === userId;
      const isRecipient = sharedContent.sharedWith.some(recipient => 
        (recipient.type === 'user' && recipient.id === userId) ||
        (recipient.type === 'role' && this.userHasRole(userId, recipient.id)) ||
        (recipient.type === 'team' && this.userInTeam(userId, recipient.id))
      );

      if ((isSharer || isRecipient) && this.isShareActive(sharedContent)) {
        userShares.push(sharedContent);
      }
    }

    return userShares.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Access shared content with permission checking
   */
  async accessSharedContent(
    shareId: string,
    userId: string,
    action: ShareAction,
    context?: { ip?: string; device?: string }
  ): Promise<{ allowed: boolean; content?: any; reason?: string }> {
    const sharedContent = this.sharedContent.get(shareId);
    
    if (!sharedContent) {
      return { allowed: false, reason: 'Share not found' };
    }

    if (!this.isShareActive(sharedContent)) {
      return { allowed: false, reason: 'Share has expired or been revoked' };
    }

    // Check user permissions
    const hasPermission = await this.checkUserPermission(
      sharedContent,
      userId,
      action,
      context
    );

    if (!hasPermission.allowed) {
      return hasPermission;
    }

    // Update access tracking
    sharedContent.accessCount++;
    sharedContent.lastAccessed = new Date();

    // Log access activity
    this.logSharingActivity(userId, 'content_accessed', {
      shareId,
      action,
      contentType: 'shared_content'
    });

    // Return content (in real implementation, would fetch actual content)
    return {
      allowed: true,
      content: {
        id: sharedContent.contentId,
        shareUrl: sharedContent.shareUrl,
        permissions: this.getUserPermissions(sharedContent, userId),
        metadata: {
          sharedBy: sharedContent.sharedBy,
          sharedAt: sharedContent.createdAt,
          accessCount: sharedContent.accessCount
        }
      }
    };
  }

  /**
   * Revoke a share
   */
  async revokeShare(shareId: string, userId: string): Promise<boolean> {
    const sharedContent = this.sharedContent.get(shareId);
    
    if (!sharedContent) {
      return false;
    }

    // Only the original sharer can revoke
    if (sharedContent.sharedBy !== userId) {
      throw new Error('Only the original sharer can revoke access');
    }

    sharedContent.isActive = false;

    // Log revocation
    this.logSharingActivity(userId, 'share_revoked', {
      shareId,
      recipientCount: sharedContent.sharedWith.length
    });

    return true;
  }

  /**
   * Update share permissions
   */
  async updateSharePermissions(
    shareId: string,
    userId: string,
    newPermissions: SharePermission[]
  ): Promise<SharedContent> {
    const sharedContent = this.sharedContent.get(shareId);
    
    if (!sharedContent) {
      throw new Error('Share not found');
    }

    if (sharedContent.sharedBy !== userId) {
      throw new Error('Only the original sharer can update permissions');
    }

    sharedContent.permissions = newPermissions;

    // Log permission update
    this.logSharingActivity(userId, 'permissions_updated', {
      shareId,
      newPermissions: newPermissions.map(p => p.action)
    });

    return sharedContent;
  }

  /**
   * Get sharing analytics for a user
   */
  async getUserShareCount(userId: string): Promise<number> {
    let count = 0;
    for (const [, sharedContent] of this.sharedContent) {
      if (sharedContent.sharedBy === userId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Search shared content
   */
  async searchSharedContent(
    query: string,
    filters?: { type?: string; author?: string; dateRange?: { start: Date; end: Date } }
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const [, sharedContent] of this.sharedContent) {
      if (!this.isShareActive(sharedContent)) continue;

      // Apply filters
      if (filters?.author && sharedContent.sharedBy !== filters.author) continue;
      if (filters?.dateRange) {
        const shareDate = sharedContent.createdAt;
        if (shareDate < filters.dateRange.start || shareDate > filters.dateRange.end) {
          continue;
        }
      }

      // Simple query matching (in real implementation, would be more sophisticated)
      const matchesQuery = !query || 
        sharedContent.shareUrl.toLowerCase().includes(query.toLowerCase());

      if (matchesQuery) {
        results.push({
          type: 'shared_content',
          id: sharedContent.id,
          title: `Shared Content ${sharedContent.id}`,
          sharedBy: sharedContent.sharedBy,
          createdAt: sharedContent.createdAt,
          accessCount: sharedContent.accessCount
        });
      }
    }

    return results;
  }

  // Private helper methods

  private validateShareRequest(shareRequest: ShareRequest): void {
    if (!shareRequest.contentId) {
      throw new Error('Content ID is required');
    }

    if (!shareRequest.recipients || shareRequest.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!shareRequest.permissions || shareRequest.permissions.length === 0) {
      throw new Error('At least one permission is required');
    }

    // Validate expiration date
    if (shareRequest.expiresAt && shareRequest.expiresAt <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }
  }

  private generateShareId(): string {
    return `share_${++this.shareCounter}_${Date.now()}`;
  }

  private generateShareUrl(shareId: string): string {
    return `${window.location.origin}/shared/${shareId}`;
  }

  private async notifyRecipients(
    sharedContent: SharedContent,
    message?: string
  ): Promise<void> {
    // In real implementation, would send actual notifications
    console.log(`Notifying ${sharedContent.sharedWith.length} recipients about new share`);
    
    for (const recipient of sharedContent.sharedWith) {
      console.log(`📧 Notification sent to ${recipient.type}: ${recipient.name}`);
      if (message) {
        console.log(`Message: ${message}`);
      }
    }
  }

  private isShareActive(sharedContent: SharedContent): boolean {
    if (!sharedContent.isActive) {
      return false;
    }

    if (sharedContent.expiresAt && sharedContent.expiresAt <= new Date()) {
      return false;
    }

    return true;
  }

  private async checkUserPermission(
    sharedContent: SharedContent,
    userId: string,
    action: ShareAction,
    context?: { ip?: string; device?: string }
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if user is a recipient
    const isRecipient = sharedContent.sharedWith.some(recipient => 
      (recipient.type === 'user' && recipient.id === userId) ||
      (recipient.type === 'role' && this.userHasRole(userId, recipient.id)) ||
      (recipient.type === 'team' && this.userInTeam(userId, recipient.id))
    );

    const isOwner = sharedContent.sharedBy === userId;

    if (!isRecipient && !isOwner) {
      return { allowed: false, reason: 'User not authorized to access this content' };
    }

    // Check specific action permission
    const permission = sharedContent.permissions.find(p => p.action === action);
    if (!permission || !permission.granted) {
      return { allowed: false, reason: `Action '${action}' not permitted` };
    }

    // Check permission conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        const conditionMet = await this.checkPermissionCondition(condition, context);
        if (!conditionMet) {
          return { 
            allowed: false, 
            reason: `Permission condition not met: ${condition.type}` 
          };
        }
      }
    }

    return { allowed: true };
  }

  private async checkPermissionCondition(
    condition: PermissionCondition,
    context?: { ip?: string; device?: string }
  ): Promise<boolean> {
    switch (condition.type) {
      case 'time_limit':
        // Check if current time is within allowed time range
        const now = new Date();
        const timeLimit = new Date(condition.value);
        return now <= timeLimit;

      case 'ip_restriction':
        // Check if request comes from allowed IP
        if (!context?.ip) return false;
        const allowedIPs = Array.isArray(condition.value) ? condition.value : [condition.value];
        return allowedIPs.includes(context.ip);

      case 'device_limit':
        // Check device restrictions (simplified)
        if (!context?.device) return false;
        return condition.value.includes(context.device);

      default:
        return true;
    }
  }

  private getUserPermissions(sharedContent: SharedContent, userId: string): ShareAction[] {
    return sharedContent.permissions
      .filter(p => p.granted)
      .map(p => p.action);
  }

  private userHasRole(userId: string, roleId: string): boolean {
    // Mock implementation - in real app, would check user roles
    return true;
  }

  private userInTeam(userId: string, teamId: string): boolean {
    // Mock implementation - in real app, would check team membership
    return true;
  }

  private logSharingActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): void {
    // In real implementation, would log to analytics service
    console.log(`📊 Sharing activity: ${userId} performed ${action}`, metadata);
  }
}

export default SharingService;
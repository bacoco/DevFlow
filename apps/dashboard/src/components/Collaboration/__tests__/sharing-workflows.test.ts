/**
 * Sharing Workflows Tests
 * Tests for content sharing functionality with permissions and expiration controls
 */

import { SharingService } from '../../../services/collaboration/SharingService';
import {
  ShareableContent,
  ShareRequest,
  SharePermission,
  ShareRecipient,
  ShareAction
} from '../../../services/collaboration/types';

describe('SharingService', () => {
  let sharingService: SharingService;
  let mockContent: ShareableContent;

  beforeEach(() => {
    sharingService = new SharingService();
    mockContent = {
      id: 'content-1',
      type: 'dashboard',
      title: 'Test Dashboard',
      description: 'A test dashboard for sharing',
      data: { widgets: [] },
      createdBy: 'user-1',
      createdAt: new Date(),
      metadata: {
        tags: ['test', 'dashboard'],
        category: 'productivity',
        version: 1,
        size: 1024,
        format: 'json'
      }
    };
  });

  describe('Content Sharing', () => {
    it('should successfully share content with basic permissions', async () => {
      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true },
          { action: 'comment', granted: true }
        ],
        notifyRecipients: true
      };

      const result = await sharingService.shareContent(mockContent, shareRequest);

      expect(result).toBeDefined();
      expect(result.contentId).toBe(mockContent.id);
      expect(result.sharedBy).toBe(mockContent.createdBy);
      expect(result.sharedWith).toHaveLength(1);
      expect(result.permissions).toHaveLength(2);
      expect(result.isActive).toBe(true);
      expect(result.shareUrl).toContain('/shared/');
    });

    it('should handle multiple recipients with different types', async () => {
      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' },
          { type: 'team', id: 'team-1', name: 'Development Team' },
          { type: 'role', id: 'manager', name: 'Manager Role' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        notifyRecipients: false
      };

      const result = await sharingService.shareContent(mockContent, shareRequest);

      expect(result.sharedWith).toHaveLength(3);
      expect(result.sharedWith[0].type).toBe('user');
      expect(result.sharedWith[1].type).toBe('team');
      expect(result.sharedWith[2].type).toBe('role');
    });

    it('should set expiration date correctly', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        expiresAt: expirationDate,
        notifyRecipients: true
      };

      const result = await sharingService.shareContent(mockContent, shareRequest);

      expect(result.expiresAt).toEqual(expirationDate);
    });

    it('should validate share request parameters', async () => {
      const invalidShareRequest: ShareRequest = {
        contentId: '',
        recipients: [],
        permissions: [],
        notifyRecipients: false
      };

      await expect(
        sharingService.shareContent(mockContent, invalidShareRequest)
      ).rejects.toThrow('Content ID is required');
    });

    it('should reject expired expiration dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        expiresAt: pastDate,
        notifyRecipients: false
      };

      await expect(
        sharingService.shareContent(mockContent, shareRequest)
      ).rejects.toThrow('Expiration date must be in the future');
    });
  });

  describe('Permission Management', () => {
    let sharedContent: any;

    beforeEach(async () => {
      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true },
          { action: 'comment', granted: true }
        ],
        notifyRecipients: false
      };

      sharedContent = await sharingService.shareContent(mockContent, shareRequest);
    });

    it('should allow access with valid permissions', async () => {
      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view'
      );

      expect(accessResult.allowed).toBe(true);
      expect(accessResult.content).toBeDefined();
    });

    it('should deny access without proper permissions', async () => {
      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'edit' as ShareAction
      );

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toContain('not permitted');
    });

    it('should deny access to unauthorized users', async () => {
      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-3',
        'view'
      );

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toContain('not authorized');
    });

    it('should update permissions successfully', async () => {
      const newPermissions: SharePermission[] = [
        { action: 'view', granted: true },
        { action: 'edit', granted: true }
      ];

      const updatedShare = await sharingService.updateSharePermissions(
        sharedContent.id,
        mockContent.createdBy,
        newPermissions
      );

      expect(updatedShare.permissions).toHaveLength(2);
      expect(updatedShare.permissions.find(p => p.action === 'edit')?.granted).toBe(true);
    });

    it('should only allow original sharer to update permissions', async () => {
      const newPermissions: SharePermission[] = [
        { action: 'view', granted: true }
      ];

      await expect(
        sharingService.updateSharePermissions(
          sharedContent.id,
          'user-2',
          newPermissions
        )
      ).rejects.toThrow('Only the original sharer can update permissions');
    });
  });

  describe('Access Control and Conditions', () => {
    it('should enforce time-based conditions', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          {
            action: 'view',
            granted: true,
            conditions: [
              { type: 'time_limit', value: futureDate.toISOString() }
            ]
          }
        ],
        notifyRecipients: false
      };

      const sharedContent = await sharingService.shareContent(mockContent, shareRequest);

      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view'
      );

      expect(accessResult.allowed).toBe(true);
    });

    it('should enforce IP restrictions', async () => {
      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          {
            action: 'view',
            granted: true,
            conditions: [
              { type: 'ip_restriction', value: ['192.168.1.100'] }
            ]
          }
        ],
        notifyRecipients: false
      };

      const sharedContent = await sharingService.shareContent(mockContent, shareRequest);

      // Test with allowed IP
      const allowedAccess = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view',
        { ip: '192.168.1.100' }
      );

      expect(allowedAccess.allowed).toBe(true);

      // Test with disallowed IP
      const deniedAccess = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view',
        { ip: '192.168.1.200' }
      );

      expect(deniedAccess.allowed).toBe(false);
    });
  });

  describe('Share Management', () => {
    let sharedContent: any;

    beforeEach(async () => {
      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        notifyRecipients: false
      };

      sharedContent = await sharingService.shareContent(mockContent, shareRequest);
    });

    it('should revoke share successfully', async () => {
      const result = await sharingService.revokeShare(
        sharedContent.id,
        mockContent.createdBy
      );

      expect(result).toBe(true);

      // Verify access is denied after revocation
      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view'
      );

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toContain('expired or been revoked');
    });

    it('should only allow original sharer to revoke', async () => {
      await expect(
        sharingService.revokeShare(sharedContent.id, 'user-2')
      ).rejects.toThrow('Only the original sharer can revoke access');
    });

    it('should track access count and last accessed time', async () => {
      expect(sharedContent.accessCount).toBe(0);
      expect(sharedContent.lastAccessed).toBeUndefined();

      await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view'
      );

      const updatedShares = await sharingService.getSharedContent(mockContent.createdBy);
      const updatedShare = updatedShares.find(s => s.id === sharedContent.id);

      expect(updatedShare?.accessCount).toBe(1);
      expect(updatedShare?.lastAccessed).toBeDefined();
    });

    it('should get shared content for user', async () => {
      const userShares = await sharingService.getSharedContent(mockContent.createdBy);

      expect(userShares).toHaveLength(1);
      expect(userShares[0].id).toBe(sharedContent.id);
    });

    it('should get user share count', async () => {
      const shareCount = await sharingService.getUserShareCount(mockContent.createdBy);

      expect(shareCount).toBe(1);
    });
  });

  describe('Expiration Handling', () => {
    it('should deny access to expired shares', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const shareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        expiresAt: pastDate,
        notifyRecipients: false
      };

      // Manually create expired share for testing
      const sharedContent = await sharingService.shareContent(mockContent, shareRequest);
      
      // Force expiration by setting past date
      (sharedContent as any).expiresAt = pastDate;

      const accessResult = await sharingService.accessSharedContent(
        sharedContent.id,
        'user-2',
        'view'
      );

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toContain('expired');
    });

    it('should filter out expired shares from user list', async () => {
      // Create a valid share
      const validShareRequest: ShareRequest = {
        contentId: mockContent.id,
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        notifyRecipients: false
      };

      await sharingService.shareContent(mockContent, validShareRequest);

      // Create an expired share
      const expiredShareRequest: ShareRequest = {
        contentId: 'content-2',
        recipients: [
          { type: 'user', id: 'user-2', name: 'Test User 2' }
        ],
        permissions: [
          { action: 'view', granted: true }
        ],
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        notifyRecipients: false
      };

      const expiredContent = { ...mockContent, id: 'content-2' };
      const expiredShare = await sharingService.shareContent(expiredContent, expiredShareRequest);
      
      // Force expiration
      (expiredShare as any).expiresAt = new Date(Date.now() - 3600000);

      const userShares = await sharingService.getSharedContent(mockContent.createdBy);

      // Should only return the valid share
      expect(userShares).toHaveLength(1);
      expect(userShares[0].contentId).toBe(mockContent.id);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create multiple shares for testing
      const shareRequests = [
        {
          contentId: 'content-1',
          recipients: [{ type: 'user' as const, id: 'user-2', name: 'User 2' }],
          permissions: [{ action: 'view' as ShareAction, granted: true }],
          notifyRecipients: false
        },
        {
          contentId: 'content-2',
          recipients: [{ type: 'user' as const, id: 'user-3', name: 'User 3' }],
          permissions: [{ action: 'view' as ShareAction, granted: true }],
          notifyRecipients: false
        }
      ];

      for (const request of shareRequests) {
        const content = { ...mockContent, id: request.contentId };
        await sharingService.shareContent(content, request);
      }
    });

    it('should search shared content by query', async () => {
      const results = await sharingService.searchSharedContent('content');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('shared_content');
    });

    it('should filter search results by author', async () => {
      const results = await sharingService.searchSharedContent('', {
        author: mockContent.createdBy
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.sharedBy).toBe(mockContent.createdBy);
      });
    });

    it('should filter search results by date range', async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 1);
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1);

      const results = await sharingService.searchSharedContent('', {
        dateRange: { start: startDate, end: endDate }
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent share access', async () => {
      const accessResult = await sharingService.accessSharedContent(
        'non-existent-share',
        'user-1',
        'view'
      );

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toBe('Share not found');
    });

    it('should handle revocation of non-existent share', async () => {
      const result = await sharingService.revokeShare('non-existent-share', 'user-1');

      expect(result).toBe(false);
    });

    it('should handle permission update for non-existent share', async () => {
      const newPermissions: SharePermission[] = [
        { action: 'view', granted: true }
      ];

      await expect(
        sharingService.updateSharePermissions(
          'non-existent-share',
          'user-1',
          newPermissions
        )
      ).rejects.toThrow('Share not found');
    });
  });
});

describe('Sharing Workflows Integration', () => {
  let sharingService: SharingService;

  beforeEach(() => {
    sharingService = new SharingService();
  });

  it('should handle complete sharing workflow', async () => {
    // 1. Create content
    const content: ShareableContent = {
      id: 'workflow-content',
      type: 'dashboard',
      title: 'Workflow Test Dashboard',
      description: 'Testing complete workflow',
      data: {},
      createdBy: 'workflow-user',
      createdAt: new Date(),
      metadata: {
        tags: ['workflow', 'test'],
        category: 'test',
        version: 1,
        size: 512,
        format: 'json'
      }
    };

    // 2. Share content
    const shareRequest: ShareRequest = {
      contentId: content.id,
      recipients: [
        { type: 'user', id: 'recipient-1', name: 'Recipient 1' },
        { type: 'team', id: 'team-1', name: 'Team 1' }
      ],
      permissions: [
        { action: 'view', granted: true },
        { action: 'comment', granted: true }
      ],
      message: 'Please review this dashboard',
      notifyRecipients: true
    };

    const sharedContent = await sharingService.shareContent(content, shareRequest);
    expect(sharedContent).toBeDefined();

    // 3. Access content
    const accessResult = await sharingService.accessSharedContent(
      sharedContent.id,
      'recipient-1',
      'view'
    );
    expect(accessResult.allowed).toBe(true);

    // 4. Update permissions
    const newPermissions: SharePermission[] = [
      { action: 'view', granted: true },
      { action: 'comment', granted: true },
      { action: 'edit', granted: true }
    ];

    const updatedShare = await sharingService.updateSharePermissions(
      sharedContent.id,
      content.createdBy,
      newPermissions
    );
    expect(updatedShare.permissions).toHaveLength(3);

    // 5. Verify new permissions work
    const editAccessResult = await sharingService.accessSharedContent(
      sharedContent.id,
      'recipient-1',
      'edit'
    );
    expect(editAccessResult.allowed).toBe(true);

    // 6. Revoke share
    const revokeResult = await sharingService.revokeShare(
      sharedContent.id,
      content.createdBy
    );
    expect(revokeResult).toBe(true);

    // 7. Verify access is denied after revocation
    const finalAccessResult = await sharingService.accessSharedContent(
      sharedContent.id,
      'recipient-1',
      'view'
    );
    expect(finalAccessResult.allowed).toBe(false);
  });
});
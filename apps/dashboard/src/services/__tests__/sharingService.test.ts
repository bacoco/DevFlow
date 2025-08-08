import { sharingService } from '../sharingService';
import { ShareOptions, SharePermission } from '../../types/export';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://example.com',
  },
  writable: true,
});

describe('SharingService', () => {
  beforeEach(() => {
    // Clear all data before each test
    (sharingService as any).clearAll();
  });

  describe('createShareLink', () => {
    it('should create a new share link', async () => {
      const options: ShareOptions = {
        permission: 'view',
        expiresIn: 24 * 60 * 60 * 1000, // 1 day
        requireAuth: false,
      };

      const shareLink = await sharingService.createShareLink(
        'test-dashboard',
        options,
        'user-123'
      );

      expect(shareLink).toBeDefined();
      expect(shareLink.dashboardId).toBe('test-dashboard');
      expect(shareLink.permission).toBe('view');
      expect(shareLink.createdBy).toBe('user-123');
      expect(shareLink.isActive).toBe(true);
      expect(shareLink.viewCount).toBe(0);
      expect(shareLink.url).toContain('https://example.com/shared/');
      expect(shareLink.expiresAt).toBeDefined();
    });

    it('should create link without expiration when expiresIn is not provided', async () => {
      const options: ShareOptions = {
        permission: 'edit',
      };

      const shareLink = await sharingService.createShareLink(
        'test-dashboard',
        options,
        'user-123'
      );

      expect(shareLink.expiresAt).toBeUndefined();
    });

    it('should create link with password protection', async () => {
      const options: ShareOptions = {
        permission: 'view',
        password: 'secret123',
      };

      const shareLink = await sharingService.createShareLink(
        'test-dashboard',
        options,
        'user-123'
      );

      expect(shareLink.password).toBe('secret123');
    });

    it('should create link with allowed emails', async () => {
      const options: ShareOptions = {
        permission: 'comment',
        allowedEmails: ['user1@example.com', 'user2@example.com'],
      };

      const shareLink = await sharingService.createShareLink(
        'test-dashboard',
        options,
        'user-123'
      );

      expect(shareLink.allowedEmails).toEqual(['user1@example.com', 'user2@example.com']);
    });
  });

  describe('getShareLinks', () => {
    it('should return share links for a specific dashboard', async () => {
      const options: ShareOptions = { permission: 'view' };
      
      await sharingService.createShareLink('dashboard-1', options, 'user-123');
      await sharingService.createShareLink('dashboard-2', options, 'user-123');
      await sharingService.createShareLink('dashboard-1', options, 'user-123');

      const dashboard1Links = sharingService.getShareLinks('dashboard-1');
      const dashboard2Links = sharingService.getShareLinks('dashboard-2');

      expect(dashboard1Links).toHaveLength(2);
      expect(dashboard2Links).toHaveLength(1);
      expect(dashboard1Links[0].dashboardId).toBe('dashboard-1');
      expect(dashboard2Links[0].dashboardId).toBe('dashboard-2');
    });

    it('should return links sorted by creation date (newest first)', async () => {
      const options: ShareOptions = { permission: 'view' };
      
      const link1 = await sharingService.createShareLink('test-dashboard', options, 'user-123');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const link2 = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const links = sharingService.getShareLinks('test-dashboard');

      expect(links).toHaveLength(2);
      expect(links[0].id).toBe(link2.id); // Newest first
      expect(links[1].id).toBe(link1.id);
    });
  });

  describe('getShareLink', () => {
    it('should return share link by ID', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const retrievedLink = sharingService.getShareLink(shareLink.id);

      expect(retrievedLink).toBeDefined();
      expect(retrievedLink?.id).toBe(shareLink.id);
    });

    it('should return null for invalid ID', () => {
      const retrievedLink = sharingService.getShareLink('invalid-id');
      expect(retrievedLink).toBeNull();
    });
  });

  describe('getShareLinkByToken', () => {
    it('should return share link by token', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const retrievedLink = sharingService.getShareLinkByToken(shareLink.token);

      expect(retrievedLink).toBeDefined();
      expect(retrievedLink?.token).toBe(shareLink.token);
    });

    it('should return null for invalid token', () => {
      const retrievedLink = sharingService.getShareLinkByToken('invalid-token');
      expect(retrievedLink).toBeNull();
    });
  });

  describe('updateShareLink', () => {
    it('should update share link settings', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const updates: Partial<ShareOptions> = {
        permission: 'edit',
        requireAuth: true,
      };

      const updatedLink = await sharingService.updateShareLink(shareLink.id, updates);

      expect(updatedLink).toBeDefined();
      expect(updatedLink?.permission).toBe('edit');
      expect(updatedLink?.requireAuth).toBe(true);
    });

    it('should return null for invalid link ID', async () => {
      const updates: Partial<ShareOptions> = { permission: 'edit' };
      const updatedLink = await sharingService.updateShareLink('invalid-id', updates);

      expect(updatedLink).toBeNull();
    });
  });

  describe('deactivateShareLink', () => {
    it('should deactivate a share link', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const success = await sharingService.deactivateShareLink(shareLink.id);

      expect(success).toBe(true);
      
      const retrievedLink = sharingService.getShareLink(shareLink.id);
      expect(retrievedLink?.isActive).toBe(false);
    });

    it('should return false for invalid link ID', async () => {
      const success = await sharingService.deactivateShareLink('invalid-id');
      expect(success).toBe(false);
    });
  });

  describe('deleteShareLink', () => {
    it('should delete a share link', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const success = await sharingService.deleteShareLink(shareLink.id);

      expect(success).toBe(true);
      
      const retrievedLink = sharingService.getShareLink(shareLink.id);
      expect(retrievedLink).toBeNull();
    });

    it('should return false for invalid link ID', async () => {
      const success = await sharingService.deleteShareLink('invalid-id');
      expect(success).toBe(false);
    });
  });

  describe('validateAccess', () => {
    it('should validate access for valid token', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const result = await sharingService.validateAccess(shareLink.token);

      expect(result.valid).toBe(true);
      expect(result.link).toBeDefined();
      expect(result.link?.id).toBe(shareLink.id);
    });

    it('should reject access for invalid token', async () => {
      const result = await sharingService.validateAccess('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link not found');
    });

    it('should reject access for inactive link', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');
      
      await sharingService.deactivateShareLink(shareLink.id);

      const result = await sharingService.validateAccess(shareLink.token);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link is inactive');
    });

    it('should reject access for expired link', async () => {
      const options: ShareOptions = { 
        permission: 'view',
        expiresIn: -1000, // Expired 1 second ago
      };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const result = await sharingService.validateAccess(shareLink.token);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link has expired');
    });

    it('should validate email restrictions', async () => {
      const options: ShareOptions = { 
        permission: 'view',
        allowedEmails: ['allowed@example.com'],
      };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      // Valid email
      const validResult = await sharingService.validateAccess(shareLink.token, 'allowed@example.com');
      expect(validResult.valid).toBe(true);

      // Invalid email
      const invalidResult = await sharingService.validateAccess(shareLink.token, 'notallowed@example.com');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('Email not authorized');

      // No email provided
      const noEmailResult = await sharingService.validateAccess(shareLink.token);
      expect(noEmailResult.valid).toBe(false);
      expect(noEmailResult.reason).toBe('Email not authorized');
    });

    it('should validate password protection', async () => {
      const options: ShareOptions = { 
        permission: 'view',
        password: 'secret123',
      };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      // Correct password
      const validResult = await sharingService.validateAccess(shareLink.token, undefined, 'secret123');
      expect(validResult.valid).toBe(true);

      // Incorrect password
      const invalidResult = await sharingService.validateAccess(shareLink.token, undefined, 'wrongpassword');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('Invalid password');

      // No password provided
      const noPasswordResult = await sharingService.validateAccess(shareLink.token);
      expect(noPasswordResult.valid).toBe(false);
      expect(noPasswordResult.reason).toBe('Invalid password');
    });
  });

  describe('recordView', () => {
    it('should record a view and update analytics', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      await sharingService.recordView(shareLink.id, {
        location: 'US',
        duration: 120,
      });

      const updatedLink = sharingService.getShareLink(shareLink.id);
      const analytics = sharingService.getAnalytics(shareLink.id);

      expect(updatedLink?.viewCount).toBe(1);
      expect(updatedLink?.lastAccessedAt).toBeDefined();
      expect(analytics?.totalViews).toBe(1);
      expect(analytics?.viewerLocations['US']).toBe(1);
      expect(analytics?.averageViewDuration).toBe(120);
    });

    it('should handle multiple views correctly', async () => {
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      await sharingService.recordView(shareLink.id, { duration: 100 });
      await sharingService.recordView(shareLink.id, { duration: 200 });

      const analytics = sharingService.getAnalytics(shareLink.id);

      expect(analytics?.totalViews).toBe(2);
      expect(analytics?.averageViewDuration).toBe(150); // (100 + 200) / 2
    });
  });

  describe('generateEmbedCode', () => {
    it('should generate standard embed code', () => {
      const embedCode = sharingService.generateEmbedCode('test-token', {
        width: 800,
        height: 600,
        theme: 'dark',
      });

      expect(embedCode).toContain('<iframe');
      expect(embedCode).toContain('src="https://example.com/embed/test-token');
      expect(embedCode).toContain('width="800"');
      expect(embedCode).toContain('height="600"');
      expect(embedCode).toContain('theme=dark');
    });

    it('should generate responsive embed code', () => {
      const embedCode = sharingService.generateResponsiveEmbedCode('test-token');

      expect(embedCode).toContain('<div style="position: relative');
      expect(embedCode).toContain('padding-bottom: 56.25%');
      expect(embedCode).toContain('<iframe');
      expect(embedCode).toContain('style="position: absolute');
    });

    it('should include query parameters in embed code', () => {
      const embedCode = sharingService.generateEmbedCode('test-token', {
        theme: 'dark',
        showHeader: false,
        autoRefresh: 30,
        filters: { status: 'active' },
      });

      expect(embedCode).toContain('theme=dark');
      expect(embedCode).toContain('header=false');
      expect(embedCode).toContain('refresh=30');
      expect(embedCode).toContain('filters=%7B%22status%22%3A%22active%22%7D'); // URL encoded JSON
    });
  });

  describe('sendShareLink', () => {
    it('should send share link via email', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const options: ShareOptions = { permission: 'view' };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      const success = await sharingService.sendShareLink(
        shareLink.id,
        ['user1@example.com', 'user2@example.com'],
        'Check out this dashboard!'
      );

      expect(success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Sending share link via email:', {
        linkId: shareLink.id,
        recipients: ['user1@example.com', 'user2@example.com'],
        url: shareLink.url,
        message: 'Check out this dashboard!',
      });

      const notifications = sharingService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('access');

      consoleSpy.mockRestore();
    });

    it('should return false for invalid link ID', async () => {
      const success = await sharingService.sendShareLink(
        'invalid-id',
        ['user@example.com']
      );

      expect(success).toBe(false);
    });
  });

  describe('getSharingStats', () => {
    it('should return sharing statistics', async () => {
      const options: ShareOptions = { permission: 'view' };
      
      const link1 = await sharingService.createShareLink('dashboard-1', options, 'user-123');
      const link2 = await sharingService.createShareLink('dashboard-1', options, 'user-123');
      await sharingService.createShareLink('dashboard-2', options, 'user-123');

      // Record some views
      await sharingService.recordView(link1.id, {});
      await sharingService.recordView(link1.id, {});
      await sharingService.recordView(link2.id, {});

      const stats = sharingService.getSharingStats('dashboard-1');

      expect(stats.totalLinks).toBe(2);
      expect(stats.activeLinks).toBe(2);
      expect(stats.totalViews).toBe(3);
      expect(stats.topLinks).toHaveLength(2);
      expect(stats.topLinks[0].views).toBe(2); // link1 has more views
      expect(stats.topLinks[1].views).toBe(1); // link2 has fewer views
    });

    it('should return global statistics when no dashboard ID provided', async () => {
      const options: ShareOptions = { permission: 'view' };
      
      await sharingService.createShareLink('dashboard-1', options, 'user-123');
      await sharingService.createShareLink('dashboard-2', options, 'user-123');

      const stats = sharingService.getSharingStats();

      expect(stats.totalLinks).toBe(2);
      expect(stats.activeLinks).toBe(2);
    });
  });

  describe('checkExpiredLinks', () => {
    it('should deactivate expired links and create notifications', async () => {
      const options: ShareOptions = { 
        permission: 'view',
        expiresIn: -1000, // Expired 1 second ago
      };
      const shareLink = await sharingService.createShareLink('test-dashboard', options, 'user-123');

      await sharingService.checkExpiredLinks();

      const updatedLink = sharingService.getShareLink(shareLink.id);
      const notifications = sharingService.getNotifications();

      expect(updatedLink?.isActive).toBe(false);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('expired');
    });
  });
});
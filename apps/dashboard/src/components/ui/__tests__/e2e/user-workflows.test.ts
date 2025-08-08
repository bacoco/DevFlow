/**
 * End-to-End User Workflow Tests
 * Tests complete user workflows using Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-reports/e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

test.describe('UI Component User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
  });

  test.describe('Dashboard Navigation Workflow', () => {
    test('user can navigate through dashboard sections', async ({ page }) => {
      // Test main navigation
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      await page.click('[data-testid="nav-tasks"]');
      await expect(page.locator('h1')).toContainText('Tasks');
      
      await page.click('[data-testid="nav-analytics"]');
      await expect(page.locator('h1')).toContainText('Analytics');

      // Test breadcrumb navigation
      await page.click('[data-testid="breadcrumb-home"]');
      await expect(page.locator('h1')).toContainText('Dashboard');

      await takeScreenshot(page, 'navigation-workflow');
    });

    test('user can toggle sidebar and maintain navigation state', async ({ page }) => {
      // Verify sidebar is initially open
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Toggle sidebar closed
      await page.click('[data-testid="sidebar-toggle"]');
      await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/);
      
      // Navigate while sidebar is closed
      await page.click('[data-testid="nav-tasks"]');
      await expect(page.locator('h1')).toContainText('Tasks');
      await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/);
      
      // Toggle sidebar open
      await page.click('[data-testid="sidebar-toggle"]');
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).not.toHaveClass(/collapsed/);

      await takeScreenshot(page, 'sidebar-toggle-workflow');
    });
  });

  test.describe('Task Management Workflow', () => {
    test('user can create, edit, and delete tasks', async ({ page }) => {
      // Navigate to tasks
      await page.click('[data-testid="nav-tasks"]');
      await waitForPageLoad(page);

      // Create new task
      await page.click('[data-testid="create-task-button"]');
      await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

      // Fill task form
      await page.fill('[data-testid="task-title-input"]', 'E2E Test Task');
      await page.fill('[data-testid="task-description-input"]', 'This is a test task created by E2E tests');
      await page.selectOption('[data-testid="task-priority-select"]', 'high');
      await page.selectOption('[data-testid="task-status-select"]', 'todo');

      // Save task
      await page.click('[data-testid="save-task-button"]');
      await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();

      // Verify task appears in list
      await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'E2E Test Task' })).toBeVisible();

      // Edit task
      await page.click('[data-testid="task-item"] [data-testid="edit-task-button"]');
      await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

      await page.fill('[data-testid="task-title-input"]', 'Updated E2E Test Task');
      await page.click('[data-testid="save-task-button"]');

      // Verify task is updated
      await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'Updated E2E Test Task' })).toBeVisible();

      // Delete task
      await page.click('[data-testid="task-item"] [data-testid="delete-task-button"]');
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify task is deleted
      await expect(page.locator('[data-testid="task-item"]').filter({ hasText: 'Updated E2E Test Task' })).not.toBeVisible();

      await takeScreenshot(page, 'task-management-workflow');
    });

    test('user can drag and drop tasks between columns', async ({ page }) => {
      // Navigate to task board view
      await page.click('[data-testid="nav-tasks"]');
      await page.click('[data-testid="board-view-toggle"]');
      await waitForPageLoad(page);

      // Create a test task in TODO column
      await page.click('[data-testid="add-task-todo"]');
      await page.fill('[data-testid="quick-task-input"]', 'Drag and Drop Test Task');
      await page.press('[data-testid="quick-task-input"]', 'Enter');

      // Verify task is in TODO column
      const todoColumn = page.locator('[data-testid="column-todo"]');
      await expect(todoColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Drag and Drop Test Task' })).toBeVisible();

      // Drag task from TODO to IN_PROGRESS
      const taskCard = todoColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Drag and Drop Test Task' });
      const inProgressColumn = page.locator('[data-testid="column-in-progress"]');

      await taskCard.dragTo(inProgressColumn);

      // Verify task moved to IN_PROGRESS column
      await expect(inProgressColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Drag and Drop Test Task' })).toBeVisible();
      await expect(todoColumn.locator('[data-testid="task-card"]').filter({ hasText: 'Drag and Drop Test Task' })).not.toBeVisible();

      await takeScreenshot(page, 'drag-drop-workflow');
    });
  });

  test.describe('Form Interaction Workflow', () => {
    test('user can complete complex form with validation', async ({ page }) => {
      // Navigate to a form page (assuming settings or profile)
      await page.click('[data-testid="nav-settings"]');
      await waitForPageLoad(page);

      // Test form validation
      await page.click('[data-testid="save-settings-button"]');
      
      // Verify validation errors appear
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');

      // Fill form with invalid data
      await page.fill('[data-testid="name-input"]', 'Te'); // Too short
      await page.fill('[data-testid="email-input"]', 'invalid-email'); // Invalid format
      await page.click('[data-testid="save-settings-button"]');

      // Verify specific validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name must be at least 3 characters');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');

      // Fill form with valid data
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="bio-input"]', 'This is a test bio for E2E testing');

      // Submit form
      await page.click('[data-testid="save-settings-button"]');

      // Verify success message
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Settings saved successfully');

      await takeScreenshot(page, 'form-validation-workflow');
    });

    test('user can use autocomplete and search functionality', async ({ page }) => {
      // Navigate to a page with search functionality
      await page.click('[data-testid="nav-search"]');
      await waitForPageLoad(page);

      // Test search autocomplete
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('test');

      // Wait for autocomplete suggestions
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-suggestion"]').first()).toBeVisible();

      // Select a suggestion
      await page.click('[data-testid="search-suggestion"]').first();

      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible();

      // Test search filters
      await page.click('[data-testid="filter-toggle"]');
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();

      await page.check('[data-testid="filter-type-task"]');
      await page.selectOption('[data-testid="filter-date-range"]', 'last-week');
      await page.click('[data-testid="apply-filters-button"]');

      // Verify filtered results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      await takeScreenshot(page, 'search-workflow');
    });
  });

  test.describe('Modal and Dialog Workflow', () => {
    test('user can interact with nested modals and maintain focus', async ({ page }) => {
      // Open first modal
      await page.click('[data-testid="open-settings-modal"]');
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();

      // Verify focus is trapped in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();

      // Open nested modal
      await page.click('[data-testid="open-advanced-settings"]');
      await expect(page.locator('[data-testid="advanced-settings-modal"]')).toBeVisible();

      // Verify both modals are visible but focus is on the top modal
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="advanced-settings-modal"]')).toBeVisible();

      // Close nested modal with Escape
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="advanced-settings-modal"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();

      // Close main modal
      await page.click('[data-testid="close-settings-modal"]');
      await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible();

      await takeScreenshot(page, 'modal-workflow');
    });

    test('user can interact with confirmation dialogs', async ({ page }) => {
      // Trigger a destructive action
      await page.click('[data-testid="delete-account-button"]');
      
      // Verify confirmation dialog appears
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-dialog"]')).toContainText('Are you sure?');

      // Cancel the action
      await page.click('[data-testid="cancel-button"]');
      await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

      // Trigger action again
      await page.click('[data-testid="delete-account-button"]');
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

      // Confirm the action
      await page.click('[data-testid="confirm-button"]');
      await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

      // Verify action was performed
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Account deleted');

      await takeScreenshot(page, 'confirmation-dialog-workflow');
    });
  });

  test.describe('Accessibility Workflow', () => {
    test('user can navigate entire application using only keyboard', async ({ page }) => {
      // Start from the top of the page
      await page.keyboard.press('Tab');
      
      // Navigate through main navigation
      let currentFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(currentFocus).toBe('skip-to-main');

      // Use skip link
      await page.keyboard.press('Enter');
      currentFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(currentFocus).toBe('main-content');

      // Navigate through main content
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Navigate to a form and fill it using keyboard
      await page.keyboard.press('Enter'); // Assuming this opens a form
      
      // Fill form using keyboard
      await page.keyboard.type('Test User');
      await page.keyboard.press('Tab');
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Submit form

      await takeScreenshot(page, 'keyboard-navigation-workflow');
    });

    test('screen reader announcements work correctly', async ({ page }) => {
      // Enable screen reader simulation
      await page.addInitScript(() => {
        // Mock screen reader announcements
        window.screenReaderAnnouncements = [];
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
          if (name === 'aria-live' || name === 'aria-label') {
            window.screenReaderAnnouncements.push({ element: this, attribute: name, value });
          }
          return originalSetAttribute.call(this, name, value);
        };
      });

      // Perform actions that should trigger announcements
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Screen Reader Test');
      await page.click('[data-testid="save-task-button"]');

      // Verify announcements were made
      const announcements = await page.evaluate(() => window.screenReaderAnnouncements);
      expect(announcements.length).toBeGreaterThan(0);

      await takeScreenshot(page, 'screen-reader-workflow');
    });
  });

  test.describe('Performance Workflow', () => {
    test('application loads and responds within performance budgets', async ({ page }) => {
      // Measure page load performance
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await waitForPageLoad(page);
      const loadTime = Date.now() - startTime;

      // Verify load time is within budget (3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Measure interaction performance
      const interactionStart = Date.now();
      await page.click('[data-testid="nav-tasks"]');
      await waitForPageLoad(page);
      const interactionTime = Date.now() - interactionStart;

      // Verify interaction time is within budget (1 second)
      expect(interactionTime).toBeLessThan(1000);

      // Measure form submission performance
      await page.click('[data-testid="create-task-button"]');
      const formStart = Date.now();
      await page.fill('[data-testid="task-title-input"]', 'Performance Test Task');
      await page.click('[data-testid="save-task-button"]');
      await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();
      const formTime = Date.now() - formStart;

      // Verify form submission time is within budget (2 seconds)
      expect(formTime).toBeLessThan(2000);

      await takeScreenshot(page, 'performance-workflow');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`core functionality works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);

        // Test basic navigation
        await page.click('[data-testid="nav-tasks"]');
        await expect(page.locator('h1')).toContainText('Tasks');

        // Test form interaction
        await page.click('[data-testid="create-task-button"]');
        await page.fill('[data-testid="task-title-input"]', `${browserName} Test Task`);
        await page.click('[data-testid="save-task-button"]');

        // Verify task was created
        await expect(page.locator('[data-testid="task-item"]').filter({ hasText: `${browserName} Test Task` })).toBeVisible();

        await takeScreenshot(page, `${browserName}-compatibility`);
      });
    });
  });

  test.describe('Responsive Design Workflow', () => {
    ['mobile', 'tablet', 'desktop'].forEach(viewport => {
      test(`application works correctly on ${viewport}`, async ({ page }) => {
        // Set viewport size
        const viewportSizes = {
          mobile: { width: 375, height: 667 },
          tablet: { width: 768, height: 1024 },
          desktop: { width: 1440, height: 900 },
        };

        await page.setViewportSize(viewportSizes[viewport]);
        await page.reload();
        await waitForPageLoad(page);

        // Test navigation on different viewports
        if (viewport === 'mobile') {
          // Mobile should have hamburger menu
          await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
          await page.click('[data-testid="mobile-menu-toggle"]');
          await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
        } else {
          // Tablet and desktop should have full navigation
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        }

        // Test responsive form layout
        await page.click('[data-testid="nav-settings"]');
        const formContainer = page.locator('[data-testid="settings-form"]');
        await expect(formContainer).toBeVisible();

        // Verify form adapts to viewport
        const formWidth = await formContainer.evaluate(el => el.getBoundingClientRect().width);
        const viewportWidth = viewportSizes[viewport].width;
        expect(formWidth).toBeLessThanOrEqual(viewportWidth);

        await takeScreenshot(page, `${viewport}-responsive`);
      });
    });
  });
});
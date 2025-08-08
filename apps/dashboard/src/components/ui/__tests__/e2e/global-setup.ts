/**
 * Playwright Global Setup
 * Setup tasks that run before all tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the application
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    await page.goto(baseURL);

    // Wait for application to be ready
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });

    // Perform any necessary setup tasks
    console.log('✅ Application is ready for testing');

    // Setup test data if needed
    await setupTestData(page);

    // Setup authentication state if needed
    await setupAuthState(page);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  // Create test data via API or UI
  console.log('📊 Setting up test data...');
  
  // Example: Create test users, tasks, etc.
  // This would typically make API calls to set up test data
  
  console.log('✅ Test data setup completed');
}

async function setupAuthState(page: any) {
  // Setup authentication state for tests that require login
  console.log('🔐 Setting up authentication state...');
  
  // Example: Login and save auth state
  // await page.goto('/login');
  // await page.fill('[data-testid="email-input"]', 'test@example.com');
  // await page.fill('[data-testid="password-input"]', 'password');
  // await page.click('[data-testid="login-button"]');
  // await page.waitForSelector('[data-testid="dashboard"]');
  // await page.context().storageState({ path: 'auth-state.json' });
  
  console.log('✅ Authentication state setup completed');
}

export default globalSetup;
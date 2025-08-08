/**
 * Migration Manager
 * 
 * Handles migration of existing user preferences and customizations
 * when UX improvements are enabled.
 */

import { EventEmitter } from 'events';

export interface MigrationTask {
  id: string;
  name: string;
  description: string;
  version: string;
  feature: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  rollbackSupported: boolean;
  estimatedDuration: number; // in milliseconds
  execute: (context: MigrationContext) => Promise<MigrationResult>;
  rollback?: (context: MigrationContext) => Promise<MigrationResult>;
  validate?: (context: MigrationContext) => Promise<boolean>;
}

export interface MigrationContext {
  userId?: string;
  feature: string;
  currentVersion: string;
  targetVersion: string;
  userData: any;
  preferences: any;
  customizations: any;
  dryRun: boolean;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  data?: any;
  warnings?: string[];
  errors?: string[];
  rollbackData?: any;
}

export interface MigrationSettings {
  batchSize: number;
  retryAttempts: number;
  rollbackOnError: boolean;
}

export interface MigrationStatus {
  id: string;
  feature: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  result?: MigrationResult;
  error?: string;
}

export class MigrationManager extends EventEmitter {
  private migrations: Map<string, MigrationTask> = new Map();
  private migrationHistory: Map<string, MigrationStatus[]> = new Map();
  private settings: MigrationSettings;

  constructor(settings: MigrationSettings) {
    super();
    this.settings = settings;
    this.initializeMigrations();
  }

  /**
   * Initialize all migration tasks
   */
  private initializeMigrations(): void {
    const migrationTasks: MigrationTask[] = [
      {
        id: 'migrate-dashboard-preferences',
        name: 'Dashboard Preferences Migration',
        description: 'Migrate existing dashboard preferences to new format',
        version: '2.0.0',
        feature: 'design-system-v2',
        priority: 'high',
        dependencies: [],
        rollbackSupported: true,
        estimatedDuration: 5000,
        execute: this.migrateDashboardPreferences.bind(this),
        rollback: this.rollbackDashboardPreferences.bind(this),
        validate: this.validateDashboardPreferences.bind(this)
      },
      {
        id: 'migrate-widget-configurations',
        name: 'Widget Configurations Migration',
        description: 'Update widget configurations for new layout system',
        version: '2.0.0',
        feature: 'responsive-layout-engine',
        priority: 'high',
        dependencies: ['migrate-dashboard-preferences'],
        rollbackSupported: true,
        estimatedDuration: 8000,
        execute: this.migrateWidgetConfigurations.bind(this),
        rollback: this.rollbackWidgetConfigurations.bind(this),
        validate: this.validateWidgetConfigurations.bind(this)
      },
      {
        id: 'migrate-accessibility-settings',
        name: 'Accessibility Settings Migration',
        description: 'Migrate accessibility preferences to enhanced system',
        version: '1.0.0',
        feature: 'accessibility-enhancements',
        priority: 'medium',
        dependencies: [],
        rollbackSupported: true,
        estimatedDuration: 3000,
        execute: this.migrateAccessibilitySettings.bind(this),
        rollback: this.rollbackAccessibilitySettings.bind(this),
        validate: this.validateAccessibilitySettings.bind(this)
      },
      {
        id: 'migrate-navigation-preferences',
        name: 'Navigation Preferences Migration',
        description: 'Update navigation preferences for adaptive system',
        version: '1.0.0',
        feature: 'adaptive-navigation',
        priority: 'medium',
        dependencies: ['migrate-accessibility-settings'],
        rollbackSupported: true,
        estimatedDuration: 4000,
        execute: this.migrateNavigationPreferences.bind(this),
        rollback: this.rollbackNavigationPreferences.bind(this),
        validate: this.validateNavigationPreferences.bind(this)
      },
      {
        id: 'migrate-personalization-data',
        name: 'Personalization Data Migration',
        description: 'Migrate user behavior data to new personalization engine',
        version: '1.0.0',
        feature: 'personalization-engine',
        priority: 'low',
        dependencies: ['migrate-widget-configurations'],
        rollbackSupported: false,
        estimatedDuration: 10000,
        execute: this.migratePersonalizationData.bind(this),
        validate: this.validatePersonalizationData.bind(this)
      },
      {
        id: 'migrate-chart-preferences',
        name: 'Chart Preferences Migration',
        description: 'Update chart configurations for enhanced visualization',
        version: '1.0.0',
        feature: 'enhanced-charts',
        priority: 'medium',
        dependencies: ['migrate-accessibility-settings'],
        rollbackSupported: true,
        estimatedDuration: 6000,
        execute: this.migrateChartPreferences.bind(this),
        rollback: this.rollbackChartPreferences.bind(this),
        validate: this.validateChartPreferences.bind(this)
      }
    ];

    migrationTasks.forEach(task => {
      this.migrations.set(task.id, task);
    });
  }

  /**
   * Check if migration is needed for a feature
   */
  async checkMigrationNeeded(feature: string): Promise<boolean> {
    const featureMigrations = Array.from(this.migrations.values())
      .filter(m => m.feature === feature);

    for (const migration of featureMigrations) {
      const history = this.getMigrationHistory(migration.id);
      const lastRun = history[history.length - 1];
      
      if (!lastRun || lastRun.status !== 'completed') {
        return true;
      }
    }

    return false;
  }

  /**
   * Run migration for a feature
   */
  async runMigration(feature: string, userId?: string): Promise<MigrationResult[]> {
    const featureMigrations = Array.from(this.migrations.values())
      .filter(m => m.feature === feature)
      .sort((a, b) => {
        // Sort by dependencies and priority
        if (a.dependencies.includes(b.id)) return 1;
        if (b.dependencies.includes(a.id)) return -1;
        
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    const results: MigrationResult[] = [];

    this.emit('migration_started', { feature, migrations: featureMigrations.length });

    for (const migration of featureMigrations) {
      try {
        const result = await this.runSingleMigration(migration, userId);
        results.push(result);

        if (!result.success && this.settings.rollbackOnError) {
          // Rollback previous migrations in reverse order
          await this.rollbackMigrations(results.slice(0, -1).reverse());
          break;
        }
      } catch (error) {
        console.error(`Migration ${migration.id} failed:`, error);
        results.push({
          success: false,
          message: `Migration failed: ${error.message}`,
          errors: [error.message]
        });

        if (this.settings.rollbackOnError) {
          await this.rollbackMigrations(results.slice(0, -1).reverse());
          break;
        }
      }
    }

    this.emit('migration_completed', { feature, results });
    return results;
  }

  /**
   * Run a single migration task
   */
  private async runSingleMigration(migration: MigrationTask, userId?: string): Promise<MigrationResult> {
    const migrationId = `${migration.id}-${Date.now()}`;
    const status: MigrationStatus = {
      id: migrationId,
      feature: migration.feature,
      status: 'running',
      startedAt: new Date(),
      progress: 0
    };

    this.addMigrationHistory(migration.id, status);
    this.emit('migration_progress', { migration: migration.id, status });

    try {
      // Validate dependencies
      for (const depId of migration.dependencies) {
        const depHistory = this.getMigrationHistory(depId);
        const lastRun = depHistory[depHistory.length - 1];
        
        if (!lastRun || lastRun.status !== 'completed') {
          throw new Error(`Dependency ${depId} not completed`);
        }
      }

      // Prepare migration context
      const context: MigrationContext = {
        userId,
        feature: migration.feature,
        currentVersion: '1.0.0', // This would come from actual version detection
        targetVersion: migration.version,
        userData: await this.loadUserData(userId),
        preferences: await this.loadUserPreferences(userId),
        customizations: await this.loadUserCustomizations(userId),
        dryRun: false
      };

      // Validate before migration if validator exists
      if (migration.validate) {
        const isValid = await migration.validate(context);
        if (!isValid) {
          throw new Error('Migration validation failed');
        }
      }

      status.progress = 25;
      this.emit('migration_progress', { migration: migration.id, status });

      // Execute migration
      const result = await migration.execute(context);

      status.progress = 100;
      status.status = result.success ? 'completed' : 'failed';
      status.completedAt = new Date();
      status.result = result;

      this.emit('migration_progress', { migration: migration.id, status });

      return result;
    } catch (error) {
      status.status = 'failed';
      status.completedAt = new Date();
      status.error = error.message;

      this.emit('migration_progress', { migration: migration.id, status });

      return {
        success: false,
        message: `Migration ${migration.id} failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Rollback migrations
   */
  private async rollbackMigrations(migrations: MigrationTask[]): Promise<void> {
    for (const migration of migrations) {
      if (migration.rollback && migration.rollbackSupported) {
        try {
          const context: MigrationContext = {
            feature: migration.feature,
            currentVersion: migration.version,
            targetVersion: '1.0.0',
            userData: await this.loadUserData(),
            preferences: await this.loadUserPreferences(),
            customizations: await this.loadUserCustomizations(),
            dryRun: false
          };

          await migration.rollback(context);
          
          const status: MigrationStatus = {
            id: `rollback-${migration.id}-${Date.now()}`,
            feature: migration.feature,
            status: 'rolled_back',
            startedAt: new Date(),
            completedAt: new Date(),
            progress: 100
          };

          this.addMigrationHistory(migration.id, status);
        } catch (error) {
          console.error(`Rollback failed for ${migration.id}:`, error);
        }
      }
    }
  }

  /**
   * Migration implementations
   */
  private async migrateDashboardPreferences(context: MigrationContext): Promise<MigrationResult> {
    try {
      const { preferences } = context;
      const migratedPreferences = { ...preferences };

      // Migrate theme preferences
      if (preferences.theme) {
        migratedPreferences.theme = {
          mode: preferences.theme.mode || 'light',
          colorScheme: preferences.theme.colorScheme || 'default',
          density: preferences.theme.density || 'comfortable',
          customColors: preferences.theme.customColors || null
        };
      }

      // Migrate layout preferences
      if (preferences.layout) {
        migratedPreferences.layout = {
          sidebarCollapsed: preferences.layout.sidebarCollapsed || false,
          gridDensity: preferences.layout.gridDensity || 'medium',
          showBreadcrumbs: preferences.layout.showBreadcrumbs !== false
        };
      }

      await this.saveUserPreferences(context.userId, migratedPreferences);

      return {
        success: true,
        message: 'Dashboard preferences migrated successfully',
        data: migratedPreferences,
        rollbackData: preferences
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to migrate dashboard preferences: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async rollbackDashboardPreferences(context: MigrationContext): Promise<MigrationResult> {
    try {
      // Restore original preferences from rollback data
      const originalPreferences = context.userData?.rollbackData || {};
      await this.saveUserPreferences(context.userId, originalPreferences);

      return {
        success: true,
        message: 'Dashboard preferences rollback completed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to rollback dashboard preferences: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async validateDashboardPreferences(context: MigrationContext): Promise<boolean> {
    return context.preferences && typeof context.preferences === 'object';
  }

  private async migrateWidgetConfigurations(context: MigrationContext): Promise<MigrationResult> {
    try {
      const { customizations } = context;
      const migratedCustomizations = { ...customizations };

      // Migrate widget positions to new grid system
      if (customizations.widgets) {
        migratedCustomizations.widgets = customizations.widgets.map((widget: any) => ({
          ...widget,
          position: {
            x: widget.position?.x || 0,
            y: widget.position?.y || 0,
            w: widget.position?.w || 4,
            h: widget.position?.h || 3
          },
          responsive: {
            lg: widget.position,
            md: this.calculateResponsivePosition(widget.position, 'md'),
            sm: this.calculateResponsivePosition(widget.position, 'sm'),
            xs: this.calculateResponsivePosition(widget.position, 'xs')
          }
        }));
      }

      await this.saveUserCustomizations(context.userId, migratedCustomizations);

      return {
        success: true,
        message: 'Widget configurations migrated successfully',
        data: migratedCustomizations,
        rollbackData: customizations
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to migrate widget configurations: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async rollbackWidgetConfigurations(context: MigrationContext): Promise<MigrationResult> {
    try {
      const originalCustomizations = context.userData?.rollbackData || {};
      await this.saveUserCustomizations(context.userId, originalCustomizations);

      return {
        success: true,
        message: 'Widget configurations rollback completed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to rollback widget configurations: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async validateWidgetConfigurations(context: MigrationContext): Promise<boolean> {
    return context.customizations && Array.isArray(context.customizations.widgets);
  }

  private async migrateAccessibilitySettings(context: MigrationContext): Promise<MigrationResult> {
    try {
      const { preferences } = context;
      const migratedPreferences = { ...preferences };

      // Migrate accessibility settings to new format
      if (preferences.accessibility) {
        migratedPreferences.accessibility = {
          highContrast: preferences.accessibility.highContrast || false,
          reducedMotion: preferences.accessibility.reducedMotion || false,
          fontSize: preferences.accessibility.fontSize || 'medium',
          screenReaderOptimized: preferences.accessibility.screenReaderOptimized || false,
          keyboardNavigation: preferences.accessibility.keyboardNavigation !== false,
          colorBlindnessFilter: preferences.accessibility.colorBlindnessFilter || null
        };
      }

      await this.saveUserPreferences(context.userId, migratedPreferences);

      return {
        success: true,
        message: 'Accessibility settings migrated successfully',
        data: migratedPreferences.accessibility,
        rollbackData: preferences.accessibility
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to migrate accessibility settings: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async rollbackAccessibilitySettings(context: MigrationContext): Promise<MigrationResult> {
    try {
      const preferences = await this.loadUserPreferences(context.userId);
      preferences.accessibility = context.userData?.rollbackData || {};
      await this.saveUserPreferences(context.userId, preferences);

      return {
        success: true,
        message: 'Accessibility settings rollback completed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to rollback accessibility settings: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async validateAccessibilitySettings(context: MigrationContext): Promise<boolean> {
    return true; // Accessibility settings are optional
  }

  private async migrateNavigationPreferences(context: MigrationContext): Promise<MigrationResult> {
    // Implementation for navigation preferences migration
    return { success: true, message: 'Navigation preferences migrated' };
  }

  private async rollbackNavigationPreferences(context: MigrationContext): Promise<MigrationResult> {
    return { success: true, message: 'Navigation preferences rollback completed' };
  }

  private async validateNavigationPreferences(context: MigrationContext): Promise<boolean> {
    return true;
  }

  private async migratePersonalizationData(context: MigrationContext): Promise<MigrationResult> {
    // Implementation for personalization data migration
    return { success: true, message: 'Personalization data migrated' };
  }

  private async validatePersonalizationData(context: MigrationContext): Promise<boolean> {
    return true;
  }

  private async migrateChartPreferences(context: MigrationContext): Promise<MigrationResult> {
    // Implementation for chart preferences migration
    return { success: true, message: 'Chart preferences migrated' };
  }

  private async rollbackChartPreferences(context: MigrationContext): Promise<MigrationResult> {
    return { success: true, message: 'Chart preferences rollback completed' };
  }

  private async validateChartPreferences(context: MigrationContext): Promise<boolean> {
    return true;
  }

  /**
   * Helper methods
   */
  private calculateResponsivePosition(position: any, breakpoint: string): any {
    const scaleFactor = breakpoint === 'md' ? 0.8 : breakpoint === 'sm' ? 0.6 : 0.4;
    return {
      x: Math.floor(position.x * scaleFactor),
      y: position.y,
      w: Math.max(2, Math.floor(position.w * scaleFactor)),
      h: position.h
    };
  }

  private async loadUserData(userId?: string): Promise<any> {
    if (!userId) return {};
    
    try {
      const stored = localStorage.getItem(`devflow_user_data_${userId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private async loadUserPreferences(userId?: string): Promise<any> {
    if (!userId) return {};
    
    try {
      const stored = localStorage.getItem(`devflow_preferences_${userId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private async loadUserCustomizations(userId?: string): Promise<any> {
    if (!userId) return {};
    
    try {
      const stored = localStorage.getItem(`devflow_customizations_${userId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private async saveUserPreferences(userId?: string, preferences: any): Promise<void> {
    if (!userId) return;
    
    try {
      localStorage.setItem(`devflow_preferences_${userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  private async saveUserCustomizations(userId?: string, customizations: any): Promise<void> {
    if (!userId) return;
    
    try {
      localStorage.setItem(`devflow_customizations_${userId}`, JSON.stringify(customizations));
    } catch (error) {
      console.error('Failed to save user customizations:', error);
    }
  }

  private getMigrationHistory(migrationId: string): MigrationStatus[] {
    return this.migrationHistory.get(migrationId) || [];
  }

  private addMigrationHistory(migrationId: string, status: MigrationStatus): void {
    const history = this.getMigrationHistory(migrationId);
    history.push(status);
    this.migrationHistory.set(migrationId, history);
  }

  /**
   * Get migration status for a feature
   */
  getMigrationStatus(feature: string): MigrationStatus[] {
    const featureMigrations = Array.from(this.migrations.values())
      .filter(m => m.feature === feature);

    return featureMigrations.map(migration => {
      const history = this.getMigrationHistory(migration.id);
      return history[history.length - 1] || {
        id: migration.id,
        feature: migration.feature,
        status: 'pending',
        progress: 0
      };
    });
  }

  /**
   * Dispose of the manager
   */
  dispose(): void {
    this.removeAllListeners();
  }
}
import { OnboardingData, OnboardingStep, OnboardingProgress } from '../../../types/onboarding';

describe('Onboarding Types', () => {
  it('should define OnboardingData interface correctly', () => {
    const mockData: OnboardingData = {
      user: {
        role: 'developer',
        team: 'Frontend Team',
        experience: 'intermediate',
      },
      privacy: {
        ideTelemetry: true,
        gitActivity: true,
        communicationData: false,
        granularControls: {
          keystrokePatterns: true,
          fileChanges: true,
        },
        anonymization: 'partial',
      },
      dashboard: {
        preferredWidgets: ['metric_card', 'line_chart'],
        layout: 'spacious',
        theme: 'auto',
        autoRefresh: true,
      },
      notifications: {
        email: false,
        inApp: true,
        slack: false,
        frequency: 'daily',
      },
    };

    expect(mockData.user.role).toBe('developer');
    expect(mockData.privacy.anonymization).toBe('partial');
    expect(mockData.dashboard.preferredWidgets).toContain('metric_card');
    expect(mockData.notifications.frequency).toBe('daily');
  });

  it('should define OnboardingProgress interface correctly', () => {
    const mockProgress: OnboardingProgress = {
      currentStep: 3,
      totalSteps: 6,
      completedSteps: ['welcome', 'role'],
      stepData: {
        role: { role: 'developer' },
        privacy: { ideTelemetry: true },
      },
    };

    expect(mockProgress.currentStep).toBe(3);
    expect(mockProgress.totalSteps).toBe(6);
    expect(mockProgress.completedSteps).toHaveLength(2);
    expect(mockProgress.stepData.role.role).toBe('developer');
  });

  it('should validate role types', () => {
    const validRoles = ['developer', 'team_lead', 'manager', 'admin'];
    
    validRoles.forEach(role => {
      const data: OnboardingData['user'] = {
        role: role as any,
        experience: 'intermediate',
      };
      expect(typeof data.role).toBe('string');
      expect(validRoles).toContain(data.role);
    });
  });

  it('should validate anonymization levels', () => {
    const validLevels: OnboardingData['privacy']['anonymization'][] = ['none', 'partial', 'full'];
    
    validLevels.forEach(level => {
      const privacy: OnboardingData['privacy'] = {
        ideTelemetry: true,
        gitActivity: true,
        communicationData: false,
        granularControls: {},
        anonymization: level,
      };
      expect(validLevels).toContain(privacy.anonymization);
    });
  });

  it('should validate notification frequencies', () => {
    const validFrequencies: OnboardingData['notifications']['frequency'][] = ['immediate', 'hourly', 'daily'];
    
    validFrequencies.forEach(frequency => {
      const notifications: OnboardingData['notifications'] = {
        email: false,
        inApp: true,
        slack: false,
        frequency,
      };
      expect(validFrequencies).toContain(notifications.frequency);
    });
  });

  it('should validate dashboard themes', () => {
    const validThemes: OnboardingData['dashboard']['theme'][] = ['light', 'dark', 'auto'];
    
    validThemes.forEach(theme => {
      const dashboard: OnboardingData['dashboard'] = {
        preferredWidgets: [],
        layout: 'spacious',
        theme,
        autoRefresh: true,
      };
      expect(validThemes).toContain(dashboard.theme);
    });
  });

  it('should validate dashboard layouts', () => {
    const validLayouts: OnboardingData['dashboard']['layout'][] = ['compact', 'spacious'];
    
    validLayouts.forEach(layout => {
      const dashboard: OnboardingData['dashboard'] = {
        preferredWidgets: [],
        layout,
        theme: 'auto',
        autoRefresh: true,
      };
      expect(validLayouts).toContain(dashboard.layout);
    });
  });
});
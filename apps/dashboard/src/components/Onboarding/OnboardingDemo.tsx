import React, { useState } from 'react';
import { OnboardingManager } from './OnboardingManager';
import { ProductTour } from './ProductTour';
import { ContextualTooltip, TooltipManager, useTooltips } from './ContextualTooltip';
import { HelpSystem } from './HelpSystem';
import { ProgressiveOnboarding, useProgressiveOnboarding } from './ProgressiveOnboarding';
import { ErrorRecovery, useErrorRecovery } from './ErrorRecovery';
import { OnboardingTour, UserPersona, TooltipConfig } from './types';

// Demo tours for different user personas
const demoTours: OnboardingTour[] = [
  {
    id: 'new-user-tour',
    name: 'Welcome to DevFlow',
    description: 'A comprehensive introduction for new users',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to DevFlow Dashboard',
        description: 'Your productivity companion',
        target: '[data-demo="main-dashboard"]',
        position: 'center',
        content: {
          text: 'Welcome to DevFlow! This dashboard helps you track and improve your development productivity. Let\'s take a quick tour to get you started.',
          media: {
            type: 'image',
            url: '/images/dashboard-overview.png',
            alt: 'Dashboard overview showing key metrics and widgets'
          }
        },
        actions: [
          { type: 'next', label: 'Let\'s Start!', variant: 'primary' }
        ],
        skippable: false,
        optional: false
      },
      {
        id: 'navigation',
        title: 'Navigation Menu',
        description: 'Learn how to navigate the dashboard',
        target: '[data-demo="navigation"]',
        position: 'right',
        content: {
          text: 'This is your main navigation menu. You can access different sections like Analytics, Tasks, and Code Archaeology from here. Each section provides unique insights into your development workflow.'
        },
        actions: [
          { type: 'next', label: 'Continue', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      },
      {
        id: 'metrics',
        title: 'Productivity Metrics',
        description: 'Understanding your productivity data',
        target: '[data-demo="metrics"]',
        position: 'bottom',
        content: {
          text: 'These widgets show your key productivity metrics like code commits, task completion rates, and focus time. You can customize which metrics to display and how they\'re visualized.'
        },
        actions: [
          { type: 'next', label: 'Show Me More', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      },
      {
        id: 'customization',
        title: 'Customize Your Dashboard',
        description: 'Make it your own',
        target: '[data-demo="settings"]',
        position: 'left',
        content: {
          text: 'Click the settings icon to customize your dashboard layout, choose your preferred theme, and configure which data sources to connect. Your preferences are saved automatically.'
        },
        actions: [
          { type: 'finish', label: 'Get Started!', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      }
    ],
    triggers: [
      { type: 'first_visit', condition: true }
    ],
    priority: 1,
    version: '1.0'
  },
  {
    id: 'power-user-tour',
    name: 'Advanced Features',
    description: 'Unlock the full potential of DevFlow',
    steps: [
      {
        id: 'command-palette',
        title: 'Command Palette',
        description: 'Quick actions at your fingertips',
        target: '[data-demo="command-trigger"]',
        position: 'bottom',
        content: {
          text: 'Press Ctrl+K (Cmd+K on Mac) to open the command palette. This is the fastest way to navigate, search, and perform actions without using the mouse.'
        },
        actions: [
          { type: 'next', label: 'Got it', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Speed up your workflow',
        target: '[data-demo="shortcuts-help"]',
        position: 'top',
        content: {
          text: 'Learn essential keyboard shortcuts: G+D for Dashboard, G+T for Tasks, G+A for Analytics, R to refresh, and F to focus search. Press ? to see all shortcuts.'
        },
        actions: [
          { type: 'next', label: 'Next', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      },
      {
        id: 'advanced-filters',
        title: 'Advanced Filtering',
        description: 'Powerful data analysis',
        target: '[data-demo="filters"]',
        position: 'right',
        content: {
          text: 'Use advanced filters to drill down into your data. Create custom filter sets, save frequently used queries, and build complex conditions to analyze specific patterns in your productivity.'
        },
        actions: [
          { type: 'finish', label: 'Awesome!', variant: 'primary' }
        ],
        skippable: true,
        optional: false
      }
    ],
    triggers: [
      { type: 'user_request', condition: true }
    ],
    priority: 2,
    version: '1.0'
  }
];

const demoPersonas: UserPersona[] = [
  {
    id: 'new-developer',
    name: 'New Developer',
    characteristics: ['first-time-user', 'needs-guidance', 'prefers-step-by-step'],
    learningPace: 'slow',
    preferredContentType: 'visual'
  },
  {
    id: 'experienced-developer',
    name: 'Experienced Developer',
    characteristics: ['familiar-with-tools', 'wants-efficiency', 'prefers-shortcuts'],
    learningPace: 'fast',
    preferredContentType: 'text'
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    characteristics: ['management-focused', 'needs-overview', 'collaborative-features'],
    learningPace: 'medium',
    preferredContentType: 'interactive'
  }
];

function DemoContent() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { tooltips, addTooltip, removeTooltip, clearTooltips } = useTooltips();
  const { error, reportError, clearError } = useErrorRecovery();
  const {
    state,
    startTour,
    registerTour,
    setUserPersona,
    updatePreferences
  } = useProgressiveOnboarding();

  // Register demo tours
  React.useEffect(() => {
    demoTours.forEach(tour => registerTour(tour));
  }, [registerTour]);

  const handlePersonaSelect = (persona: UserPersona) => {
    setUserPersona(persona);
    
    // Start appropriate tour based on persona
    if (persona.id === 'new-developer') {
      startTour('new-user-tour');
    } else if (persona.id === 'experienced-developer') {
      startTour('power-user-tour');
    }
  };

  const showTooltips = () => {
    const demoTooltips: TooltipConfig[] = [
      {
        id: 'nav-tooltip',
        target: '[data-demo="navigation"]',
        content: 'Navigate between different sections of the dashboard',
        position: 'bottom',
        trigger: 'hover',
        dismissible: true,
        persistent: false
      },
      {
        id: 'metrics-tooltip',
        target: '[data-demo="metrics"]',
        content: 'Your productivity metrics are displayed here. Click to see detailed breakdowns.',
        position: 'top',
        trigger: 'hover',
        dismissible: true,
        persistent: false
      },
      {
        id: 'settings-tooltip',
        target: '[data-demo="settings"]',
        content: 'Customize your dashboard appearance and data sources',
        position: 'left',
        trigger: 'hover',
        dismissible: true,
        persistent: false
      }
    ];

    demoTooltips.forEach(tooltip => addTooltip(tooltip));
  };

  const simulateError = () => {
    const errors = [
      new Error('Network connection failed'),
      new TypeError('Cannot read property of undefined'),
      new Error('ChunkLoadError: Loading chunk failed'),
      new Error('QuotaExceededError: Storage quota exceeded')
    ];
    
    const randomError = errors[Math.floor(Math.random() * errors.length)];
    reportError(randomError);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                DevFlow Dashboard Demo
              </h1>
              <div className="text-sm text-gray-500">
                Current Persona: {state.userPersona?.name || 'None'}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                data-demo="command-trigger"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Command Palette (Ctrl+K)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <button
                data-demo="shortcuts-help"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <button
                onClick={() => setHelpOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Help & Documentation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <button
                data-demo="settings"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav data-demo="navigation" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Navigation</h2>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="block px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="#" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    Analytics
                  </a>
                </li>
                <li>
                  <a href="#" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    Tasks
                  </a>
                </li>
                <li>
                  <a href="#" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                    Code Archaeology
                  </a>
                </li>
              </ul>
            </nav>

            {/* Demo Controls */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Demo Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User Persona:
                  </label>
                  <div className="space-y-2">
                    {demoPersonas.map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => handlePersonaSelect(persona)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          state.userPersona?.id === persona.id
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {persona.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manual Tour Controls:
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => startTour('new-user-tour')}
                      className="w-full px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Start Basic Tour
                    </button>
                    <button
                      onClick={() => startTour('power-user-tour')}
                      className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-colors"
                    >
                      Start Advanced Tour
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Features:
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={showTooltips}
                      className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      Show Tooltips
                    </button>
                    <button
                      onClick={clearTooltips}
                      className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Hide Tooltips
                    </button>
                    <button
                      onClick={simulateError}
                      className="w-full px-3 py-2 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Simulate Error
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div data-demo="main-dashboard" className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Developer Productivity Dashboard
                </h2>
                <p className="text-gray-600 mt-1">
                  Track and improve your development workflow
                </p>
              </div>

              {/* Metrics Grid */}
              <div data-demo="metrics" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Commits</h3>
                        <p className="text-2xl font-bold text-blue-600">127</p>
                        <p className="text-sm text-gray-500">This week</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                        <p className="text-2xl font-bold text-green-600">23</p>
                        <p className="text-sm text-gray-500">Completed</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Focus Time</h3>
                        <p className="text-2xl font-bold text-purple-600">6.2h</p>
                        <p className="text-sm text-gray-500">Today</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div data-demo="filters" className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>Last 3 months</option>
                      </select>
                      <button className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors">
                        Filter
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Completed task: "Implement user authentication"</span>
                        <span className="text-xs text-gray-500">2 hours ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Pushed 3 commits to main branch</span>
                        <span className="text-xs text-gray-500">4 hours ago</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Started focus session: "Code review"</span>
                        <span className="text-xs text-gray-500">6 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Components */}
      <ProductTour />
      <ProgressiveOnboarding userId="demo-user" />
      <TooltipManager 
        tooltips={tooltips} 
        onDismiss={removeTooltip}
      />
      <HelpSystem 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
      />
      <ErrorRecovery 
        error={error} 
        onRecover={clearError}
        onDismiss={clearError}
      />
    </div>
  );
}

export function OnboardingDemo() {
  return (
    <OnboardingManager userId="demo-user">
      <DemoContent />
    </OnboardingManager>
  );
}
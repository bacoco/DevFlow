import React, { useState } from 'react';
import { Code, Copy, ExternalLink, GitBranch, Package, Settings, Zap } from 'lucide-react';

interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  category: string;
}

export const DeveloperDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('design-system');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const sections = [
    {
      id: 'design-system',
      title: 'Design System',
      icon: Package,
      description: 'Components, tokens, and theming system'
    },
    {
      id: 'components',
      title: 'UX Components',
      icon: Code,
      description: 'Interactive components and patterns'
    },
    {
      id: 'hooks',
      title: 'Custom Hooks',
      icon: Zap,
      description: 'React hooks for UX functionality'
    },
    {
      id: 'apis',
      title: 'APIs & Services',
      icon: Settings,
      description: 'Backend services and API integration'
    },
    {
      id: 'deployment',
      title: 'Deployment',
      icon: GitBranch,
      description: 'Build and deployment configuration'
    }
  ];

  const codeExamples: CodeExample[] = [
    {
      id: 'design-tokens',
      title: 'Using Design Tokens',
      description: 'Access design tokens for consistent styling across components.',
      language: 'typescript',
      category: 'design-system',
      code: `import { tokens } from '@/design-system/tokens';

// Using color tokens
const StyledButton = styled.button\`
  background-color: \${tokens.colors.primary[500]};
  color: \${tokens.colors.primary[50]};
  padding: \${tokens.spacing.md} \${tokens.spacing.lg};
  border-radius: \${tokens.borderRadius.md};
  font-size: \${tokens.typography.fontSize.sm};
  font-weight: \${tokens.typography.fontWeight.medium};
  
  &:hover {
    background-color: \${tokens.colors.primary[600]};
  }
  
  &:focus {
    outline: 2px solid \${tokens.colors.primary[500]};
    outline-offset: 2px;
  }
\`;

// Using motion tokens
const AnimatedCard = styled.div\`
  transition: transform \${tokens.motion.duration.fast} \${tokens.motion.easing.easeOut};
  
  &:hover {
    transform: translateY(-2px);
  }
\`;`
    },
    {
      id: 'theme-provider',
      title: 'Theme Provider Setup',
      description: 'Configure the theme provider for dynamic theming support.',
      language: 'typescript',
      category: 'design-system',
      code: `import { ThemeProvider } from '@/design-system/theme/theme-provider';
import { useTheme } from '@/hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}

// Using theme in components
function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <button onClick={toggleTheme}>
        Switch to {theme === 'dark' ? 'light' : 'dark'} mode
      </button>
      
      <button onClick={() => setTheme('system')}>
        Use system preference
      </button>
    </div>
  );
}`
    },
    {
      id: 'adaptive-navigation',
      title: 'Adaptive Navigation Component',
      description: 'Create navigation that adapts to user behavior and context.',
      language: 'typescript',
      category: 'components',
      code: `import { AdaptiveNavigation } from '@/components/Navigation/AdaptiveNavigation';
import { usePersonalization } from '@/hooks/usePersonalization';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType;
  category: string;
}

function AppNavigation() {
  const { userPreferences, trackInteraction } = usePersonalization();
  
  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: Home, category: 'main' },
    { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart, category: 'data' },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, category: 'config' }
  ];

  return (
    <AdaptiveNavigation
      items={navigationItems}
      userPreferences={userPreferences}
      onItemClick={(item) => {
        trackInteraction('navigation_click', { itemId: item.id });
      }}
      adaptiveOrdering={true}
      showFrequentItems={true}
      maxVisibleItems={8}
    />
  );
}`
    },
    {
      id: 'accessibility-manager',
      title: 'Accessibility Manager',
      description: 'Manage focus, screen reader announcements, and keyboard navigation.',
      language: 'typescript',
      category: 'components',
      code: `import { useAccessibility } from '@/hooks/useAccessibility';
import { AccessibilityManager } from '@/accessibility/accessibility-manager';

function AccessibleChart({ data, title }) {
  const { announceToScreenReader, manageFocus, trapFocus } = useAccessibility();
  const chartRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Announce chart updates to screen readers
    announceToScreenReader(\`Chart updated: \${title} now showing \${data.length} data points\`);
  }, [data, title]);

  const handleChartInteraction = (interaction: ChartInteraction) => {
    // Manage focus for keyboard users
    if (interaction.type === 'drill-down') {
      manageFocus(chartRef.current?.querySelector('.chart-detail'));
    }
    
    // Announce interaction results
    announceToScreenReader(\`Showing detailed view for \${interaction.label}\`);
  };

  return (
    <div 
      ref={chartRef}
      role="img"
      aria-label={\`\${title} chart with \${data.length} data points\`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Handle keyboard activation
          handleChartInteraction({ type: 'select', label: 'chart' });
        }
      }}
    >
      <Chart 
        data={data} 
        onInteraction={handleChartInteraction}
        accessibilityDescription={generateChartDescription(data)}
      />
    </div>
  );
}`
    },
    {
      id: 'personalization-hook',
      title: 'Personalization Hook',
      description: 'Track user behavior and provide personalized experiences.',
      language: 'typescript',
      category: 'hooks',
      code: `import { usePersonalization } from '@/hooks/usePersonalization';

function PersonalizedDashboard() {
  const {
    userPreferences,
    behaviorData,
    recommendations,
    trackInteraction,
    updatePreferences,
    getPersonalizedLayout
  } = usePersonalization();

  const [layout, setLayout] = useState(null);

  useEffect(() => {
    // Get personalized layout based on user behavior
    getPersonalizedLayout().then(setLayout);
  }, []);

  const handleWidgetInteraction = (widgetId: string, action: string) => {
    // Track user interactions for learning
    trackInteraction('widget_interaction', {
      widgetId,
      action,
      timestamp: Date.now(),
      context: 'dashboard'
    });
  };

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  return (
    <div>
      {/* Personalized widget recommendations */}
      {recommendations.widgets.map(widget => (
        <RecommendedWidget
          key={widget.id}
          widget={widget}
          onInteraction={handleWidgetInteraction}
          confidence={widget.confidence}
        />
      ))}
      
      {/* Adaptive layout based on usage patterns */}
      {layout && (
        <DynamicLayout
          layout={layout}
          onLayoutChange={(newLayout) => {
            trackInteraction('layout_change', { layout: newLayout });
          }}
        />
      )}
    </div>
  );
}`
    },
    {
      id: 'performance-monitoring',
      title: 'Performance Monitoring',
      description: 'Monitor and optimize UX performance metrics.',
      language: 'typescript',
      category: 'hooks',
      code: `import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

function PerformanceOptimizedComponent() {
  const {
    measureInteraction,
    trackLoadTime,
    reportWebVitals,
    isSlowConnection
  } = usePerformanceMonitoring();

  useEffect(() => {
    // Track component load time
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      trackLoadTime('component_load', loadTime);
    };
  }, []);

  const handleUserInteraction = async (action: string) => {
    // Measure interaction performance
    const measurement = measureInteraction(\`user_\${action}\`);
    
    try {
      await performAction(action);
      measurement.end('success');
    } catch (error) {
      measurement.end('error', error);
    }
  };

  // Adapt behavior for slow connections
  if (isSlowConnection) {
    return <LightweightComponent onInteraction={handleUserInteraction} />;
  }

  return <FullFeaturedComponent onInteraction={handleUserInteraction} />;
}`
    },
    {
      id: 'feedback-api',
      title: 'Feedback Collection API',
      description: 'Collect and analyze user feedback for continuous improvement.',
      language: 'typescript',
      category: 'apis',
      code: `import { FeedbackService } from '@/services/feedback/FeedbackService';

// Initialize feedback service
const feedbackService = new FeedbackService({
  apiEndpoint: '/api/feedback',
  privacyMode: 'strict',
  anonymizeData: true
});

// Collect contextual feedback
async function collectFeedback(context: string, trigger: 'manual' | 'automatic') {
  const feedback = await feedbackService.collectFeedback({
    context,
    trigger,
    questions: [
      {
        id: 'satisfaction',
        type: 'rating',
        question: 'How satisfied are you with this feature?',
        scale: { min: 1, max: 5 }
      },
      {
        id: 'improvement',
        type: 'text',
        question: 'What could we improve?',
        optional: true
      }
    ],
    metadata: {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: Date.now()
    }
  });

  return feedback;
}

// Analyze feedback trends
async function analyzeFeedbackTrends(timeRange: string) {
  const analysis = await feedbackService.analyzeTrends({
    timeRange,
    groupBy: ['feature', 'user_segment'],
    metrics: ['satisfaction_score', 'completion_rate', 'error_rate']
  });

  return analysis;
}`
    },
    {
      id: 'deployment-config',
      title: 'UX Deployment Configuration',
      description: 'Configure deployment pipeline for UX improvements.',
      language: 'yaml',
      category: 'deployment',
      code: `# .github/workflows/ux-deployment.yml
name: UX Improvements Deployment

on:
  push:
    branches: [main]
    paths: ['src/components/**', 'src/design-system/**']

jobs:
  test-ux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Run visual regression tests
        run: npm run test:visual
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Build Storybook
        run: npm run build-storybook
      
      - name: Deploy to staging
        if: success()
        run: npm run deploy:staging
        env:
          STAGING_TOKEN: \${{ secrets.STAGING_TOKEN }}

  deploy-production:
    needs: test-ux
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy with feature flags
        run: |
          # Deploy with gradual rollout
          npm run deploy:production -- --feature-flags ux-improvements:10%
          
      - name: Monitor deployment
        run: |
          # Monitor key UX metrics
          npm run monitor:ux-metrics -- --duration 30m
          
      - name: Full rollout on success
        run: |
          npm run deploy:production -- --feature-flags ux-improvements:100%`
    }
  ];

  const filteredExamples = codeExamples.filter(example => 
    example.category === activeSection
  );

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Developer Documentation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Technical documentation for implementing and extending UX components.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-sm opacity-75">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick Links */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Quick Links
            </h3>
            <div className="space-y-2">
              <a
                href="/storybook"
                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Storybook</span>
              </a>
              <a
                href="/api-docs"
                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                <span>API Documentation</span>
              </a>
              <a
                href="/github"
                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <GitBranch className="h-4 w-4" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {sections.find(s => s.id === activeSection)?.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {sections.find(s => s.id === activeSection)?.description}
            </p>

            {/* Section-specific content */}
            {activeSection === 'design-system' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Design Tokens
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Consistent colors, typography, spacing, and motion values.
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Components
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Reusable UI components with built-in accessibility.
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Theming
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    Dynamic theme switching with user preferences.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Code Examples */}
          <div className="space-y-6">
            {filteredExamples.map((example) => (
              <div
                key={example.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {example.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {example.description}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(example.code, example.id)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 
                               text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                               transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="text-sm">
                        {copiedCode === example.id ? 'Copied!' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto text-sm">
                    <code className={`language-${example.language}`}>
                      {example.code}
                    </code>
                  </pre>
                  
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                      {example.language}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Best Practices */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
              Best Practices
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Accessibility First
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Always implement accessibility features from the start, not as an afterthought.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Performance Monitoring
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Track Core Web Vitals and user interaction metrics to ensure optimal performance.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Progressive Enhancement
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Build core functionality first, then enhance with advanced features.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                    User Privacy
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Implement privacy-first analytics and obtain user consent for data collection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};